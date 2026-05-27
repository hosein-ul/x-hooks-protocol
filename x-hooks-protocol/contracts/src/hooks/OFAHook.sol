// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {BaseHook} from "v4-hooks-public/base/BaseHook.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary, toBeforeSwapDelta} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {SafeCast} from "@uniswap/v4-core/src/libraries/SafeCast.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title OFAHook — Orderflow Auction Hook (V4 Native AsyncSwap Pattern)
/// @notice Transparently intercepts large swaps via beforeSwap. The hook
/// mints ERC-6909 claims inside PoolManager to custody the user's input
/// during the auction window. Solvers compete to fill at a better price.
/// If no bids arrive the AMM executes as fallback. Normal small swaps pass
/// through untouched — users interact with the standard swap router.
contract OFAHook is BaseHook {
    using SafeERC20 for IERC20;
    using CurrencyLibrary for Currency;
    using SafeCast for uint256;

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------
    error AuctionNotFound();
    error AuctionStillOpen();
    error AuctionAlreadySettled();
    error AuctionExpired();
    error BidBelowFloor();
    error BidNotBetter();
    error DuplicateBidder();
    error InvalidAmount();
    error OnlyPoolManager();

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------
    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed user,
        PoolId indexed poolId,
        uint256 amountIn,
        uint256 ammFloor,
        uint256 endBlock
    );
    event BidSubmitted(uint256 indexed auctionId, address indexed solver, uint256 amountOut);
    event AuctionSettledBySolver(uint256 indexed auctionId, address indexed solver, uint256 amountOut);
    event AuctionSettledByAMM(uint256 indexed auctionId, uint256 amountOut);

    // ---------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------
    enum AuctionStatus {
        None,
        Open,
        Settled
    }

    struct PendingAuction {
        AuctionStatus status;
        address user;
        PoolId poolId;
        bool zeroForOne;
        uint256 amountIn;
        uint256 ammFloor;
        uint256 endBlock;
        Currency tokenIn;
        Currency tokenOut;
        PoolKey key;
        uint160 sqrtPriceLimitX96;
        address bestSolver;
        uint256 bestAmountOut;
    }

    struct Bid {
        address solver;
        uint256 amountOut;
    }

    // ---------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------
    uint256 public immutable auctionThreshold;
    uint256 public immutable auctionDurationBlocks;

    uint256 public nextAuctionId = 1;
    mapping(uint256 => PendingAuction) public auctions;
    mapping(uint256 => Bid[]) public auctionBids;
    mapping(uint256 => mapping(address => bool)) public hasBid;

    constructor(IPoolManager _manager, uint256 _threshold, uint256 _durationBlocks) BaseHook(_manager) {
        auctionThreshold = _threshold;
        auctionDurationBlocks = _durationBlocks;
    }

    // ---------------------------------------------------------------------
    // Hook permissions
    // ---------------------------------------------------------------------
    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: false,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: true,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    // ---------------------------------------------------------------------
    // beforeSwap — transparently intercept large swaps via normal router
    // ---------------------------------------------------------------------
    /// @dev hookData encodes the actual swapper address: abi.encode(address user).
    /// When empty, `sender` (the router) is used as the user.
    function _beforeSwap(address sender, PoolKey calldata key, SwapParams calldata params, bytes calldata hookData)
        internal
        override
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        // Only exactIn swaps qualify (amountSpecified < 0).
        if (params.amountSpecified >= 0) {
            return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
        }
        uint256 amountIn = uint256(-params.amountSpecified);
        if (amountIn < auctionThreshold) {
            return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
        }

        Currency tokenIn = params.zeroForOne ? key.currency0 : key.currency1;
        Currency tokenOut = params.zeroForOne ? key.currency1 : key.currency0;

        // Mint ERC-6909 claim inside PoolManager to hold user's input.
        // The hook incurs a -amountIn delta which is cleared by the hookDelta
        // returned below. The locker (swap router) still settles amountIn of
        // tokenIn in the same unlock, delivering the tokens to PM.
        poolManager.mint(address(this), tokenIn.toId(), amountIn);

        address user = hookData.length >= 32 ? abi.decode(hookData, (address)) : sender;
        uint256 ammFloor = _quoteAmmFloor(amountIn);
        uint256 id = nextAuctionId++;

        PendingAuction storage a = auctions[id];
        a.status = AuctionStatus.Open;
        a.user = user;
        a.poolId = key.toId();
        a.zeroForOne = params.zeroForOne;
        a.amountIn = amountIn;
        a.ammFloor = ammFloor;
        a.endBlock = block.number + auctionDurationBlocks;
        a.tokenIn = tokenIn;
        a.tokenOut = tokenOut;
        a.key = key;
        a.sqrtPriceLimitX96 = params.sqrtPriceLimitX96;

        emit AuctionCreated(id, user, key.toId(), amountIn, ammFloor, a.endBlock);

        // Return delta: hook consumed amountIn of specified currency (input),
        // no AMM execution for this amount.
        return (BaseHook.beforeSwap.selector, toBeforeSwapDelta(int128(uint128(amountIn)), 0), 0);
    }

    /// @dev Conservative AMM floor: 99% of input (~1% slippage assumption).
    function _quoteAmmFloor(uint256 amountIn) internal pure returns (uint256) {
        return (amountIn * 99) / 100;
    }

    // ---------------------------------------------------------------------
    // Solver bidding (unchanged — off-chain competition)
    // ---------------------------------------------------------------------
    function submitBid(uint256 auctionId, uint256 amountOut) external {
        PendingAuction storage a = auctions[auctionId];
        if (a.status != AuctionStatus.Open) revert AuctionNotFound();
        if (block.number > a.endBlock) revert AuctionExpired();
        if (hasBid[auctionId][msg.sender]) revert DuplicateBidder();
        if (amountOut < a.ammFloor) revert BidBelowFloor();
        if (amountOut <= a.bestAmountOut) revert BidNotBetter();

        hasBid[auctionId][msg.sender] = true;
        auctionBids[auctionId].push(Bid({solver: msg.sender, amountOut: amountOut}));
        a.bestSolver = msg.sender;
        a.bestAmountOut = amountOut;

        emit BidSubmitted(auctionId, msg.sender, amountOut);
    }

    // ---------------------------------------------------------------------
    // Settlement — operates inside a PM unlock to redeem ERC-6909 claims
    // ---------------------------------------------------------------------
    function settleAuction(uint256 auctionId) external {
        PendingAuction storage a = auctions[auctionId];
        if (a.status != AuctionStatus.Open) revert AuctionNotFound();
        if (block.number <= a.endBlock) revert AuctionStillOpen();

        a.status = AuctionStatus.Settled;

        if (a.bestSolver != address(0)) {
            // Solver path:
            // 1. Solver transfers output to user (ERC-20 direct, outside PM).
            // 2. Hook gives solver the input from its ERC-6909 holdings.
            IERC20(Currency.unwrap(a.tokenOut)).safeTransferFrom(a.bestSolver, a.user, a.bestAmountOut);
            poolManager.unlock(abi.encode(auctionId, false));
            emit AuctionSettledBySolver(auctionId, a.bestSolver, a.bestAmountOut);
        } else {
            // AMM fallback: redeem ERC-6909, swap via AMM, deliver output to user.
            poolManager.unlock(abi.encode(auctionId, true));
        }
    }

    /// @notice PM unlock callback — handles both solver input release and AMM fallback.
    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        if (msg.sender != address(poolManager)) revert OnlyPoolManager();

        (uint256 auctionId, bool isAmmFallback) = abi.decode(data, (uint256, bool));
        PendingAuction storage a = auctions[auctionId];

        // Burn ERC-6909: gives hook a positive delta (credit) for tokenIn.
        poolManager.burn(address(this), a.tokenIn.toId(), a.amountIn);

        if (!isAmmFallback) {
            // Transfer input to winning solver by taking from PM.
            poolManager.take(a.tokenIn, a.bestSolver, a.amountIn);
        } else {
            // AMM fallback: swap via PM (beforeSwap short-circuits for self-calls).
            SwapParams memory sp = SwapParams({
                zeroForOne: a.zeroForOne,
                amountSpecified: -int256(a.amountIn),
                sqrtPriceLimitX96: a.sqrtPriceLimitX96
            });
            BalanceDelta delta = poolManager.swap(a.key, sp, "");

            // Take the AMM output and deliver to the original swapper.
            uint256 amountOut;
            if (delta.amount0() > 0) {
                amountOut = uint128(delta.amount0());
                poolManager.take(a.key.currency0, a.user, amountOut);
            } else if (delta.amount1() > 0) {
                amountOut = uint128(delta.amount1());
                poolManager.take(a.key.currency1, a.user, amountOut);
            }
            emit AuctionSettledByAMM(auctionId, amountOut);
        }
        return "";
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------
    function getAuction(uint256 id) external view returns (PendingAuction memory) {
        return auctions[id];
    }

    function getBidCount(uint256 id) external view returns (uint256) {
        return auctionBids[id].length;
    }
}
