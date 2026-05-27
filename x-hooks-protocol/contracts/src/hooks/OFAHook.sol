// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {BaseHook} from "v4-hooks-public/base/BaseHook.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title OFAHook — Orderflow Auction Hook
/// @notice Large swaps are routed into a short on-chain auction. Solvers bid
/// to fill the order at a better price than the AMM. Best bid wins; if no
/// bids arrive within the window the swap falls back to the AMM.
///
/// The hook exposes `requestAuctionSwap` as the user-facing entry point.
/// `beforeSwap` enforces the threshold rule when traders go through the
/// normal PoolManager swap path: small swaps pass through, large swaps revert
/// (forcing them into the auction flow).
contract OFAHook is BaseHook {
    using SafeERC20 for IERC20;

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
    error MustUseAuction();
    error InvalidAmount();

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

    /// @dev Re-entrant flag for the AMM fallback path.
    bool internal _inFallback;

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
    // beforeSwap — gating: large swaps via PM are blocked, small swaps pass
    // ---------------------------------------------------------------------
    function _beforeSwap(address, PoolKey calldata, SwapParams calldata params, bytes calldata)
        internal
        view
        override
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        if (_inFallback) {
            return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
        }
        if (params.amountSpecified >= 0) {
            return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
        }
        uint256 amountIn = uint256(-params.amountSpecified);
        if (amountIn >= auctionThreshold) {
            revert MustUseAuction();
        }
        return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }

    // ---------------------------------------------------------------------
    // User entry point: create an auction
    // ---------------------------------------------------------------------
    /// @notice Submit a large swap into the auction system.
    /// @dev Caller must have approved this contract for `amountIn` of tokenIn.
    function requestAuctionSwap(
        PoolKey calldata key,
        bool zeroForOne,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96
    ) external returns (uint256 auctionId) {
        if (amountIn < auctionThreshold) revert InvalidAmount();

        (Currency tokenIn, Currency tokenOut) =
            zeroForOne ? (key.currency0, key.currency1) : (key.currency1, key.currency0);

        IERC20(Currency.unwrap(tokenIn)).safeTransferFrom(msg.sender, address(this), amountIn);

        uint256 ammFloor = _quoteAmmFloor(amountIn);
        auctionId = nextAuctionId++;

        PendingAuction storage a = auctions[auctionId];
        a.status = AuctionStatus.Open;
        a.user = msg.sender;
        a.poolId = key.toId();
        a.zeroForOne = zeroForOne;
        a.amountIn = amountIn;
        a.ammFloor = ammFloor;
        a.endBlock = block.number + auctionDurationBlocks;
        a.tokenIn = tokenIn;
        a.tokenOut = tokenOut;
        a.key = key;
        a.sqrtPriceLimitX96 = sqrtPriceLimitX96;

        emit AuctionCreated(auctionId, msg.sender, key.toId(), amountIn, ammFloor, a.endBlock);
    }

    /// @dev Conservative AMM floor: 99% of input (assumes ~1:1 with 1% slippage).
    /// Production deployments should plug in a real quoter.
    function _quoteAmmFloor(uint256 amountIn) internal pure returns (uint256) {
        return (amountIn * 99) / 100;
    }

    // ---------------------------------------------------------------------
    // Solver bidding
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
    // Settlement
    // ---------------------------------------------------------------------
    function settleAuction(uint256 auctionId) external {
        PendingAuction storage a = auctions[auctionId];
        if (a.status != AuctionStatus.Open) revert AuctionNotFound();
        if (block.number <= a.endBlock) revert AuctionStillOpen();

        a.status = AuctionStatus.Settled;

        if (a.bestSolver != address(0)) {
            IERC20(Currency.unwrap(a.tokenOut)).safeTransferFrom(a.bestSolver, a.user, a.bestAmountOut);
            IERC20(Currency.unwrap(a.tokenIn)).safeTransfer(a.bestSolver, a.amountIn);
            emit AuctionSettledBySolver(auctionId, a.bestSolver, a.bestAmountOut);
        } else {
            uint256 amountOut = _executeAmmFallback(a);
            emit AuctionSettledByAMM(auctionId, amountOut);
        }
    }

    function _executeAmmFallback(PendingAuction storage a) internal returns (uint256 amountOut) {
        _inFallback = true;
        bytes memory result = poolManager.unlock(
            abi.encode(a.key, a.zeroForOne, a.amountIn, a.sqrtPriceLimitX96, a.user, a.tokenIn, a.tokenOut)
        );
        _inFallback = false;
        amountOut = abi.decode(result, (uint256));
    }

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == address(poolManager), "OFAHook: not PoolManager");
        (
            PoolKey memory key,
            bool zeroForOne,
            uint256 amountIn,
            uint160 sqrtPriceLimitX96,
            address user,
            Currency tokenIn,
            Currency tokenOut
        ) = abi.decode(data, (PoolKey, bool, uint256, uint160, address, Currency, Currency));

        SwapParams memory sp = SwapParams({
            zeroForOne: zeroForOne,
            amountSpecified: -int256(amountIn),
            sqrtPriceLimitX96: sqrtPriceLimitX96
        });
        BalanceDelta delta = poolManager.swap(key, sp, "");

        int128 dIn = zeroForOne ? delta.amount0() : delta.amount1();
        int128 dOut = zeroForOne ? delta.amount1() : delta.amount0();

        // Settle input we owe PoolManager (we already custody amountIn).
        if (dIn < 0) {
            uint256 owed = uint256(int256(-dIn));
            poolManager.sync(tokenIn);
            IERC20(Currency.unwrap(tokenIn)).safeTransfer(address(poolManager), owed);
            poolManager.settle();
        }
        // Take output and forward to user.
        uint256 amountOut = 0;
        if (dOut > 0) {
            amountOut = uint256(int256(dOut));
            poolManager.take(tokenOut, user, amountOut);
        }

        return abi.encode(amountOut);
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
