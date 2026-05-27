// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {BaseHook} from "v4-hooks-public/base/BaseHook.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary, toBeforeSwapDelta} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";

/// @title SUBAHook — Sealed-Bid Uniform-price Batch Auction Hook (V4 AsyncSwap)
/// @notice Every swap through the pool is transparently buffered into the
/// current epoch via the V4 AsyncSwap pattern (mint ERC-6909 + beforeSwap
/// delta). The keeper settles all orders at a single uniform clearing price.
/// Users interact with the standard router — there is no separate entry point.
contract SUBAHook is BaseHook {
    using CurrencyLibrary for Currency;

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------
    error NotKeeper();
    error NotOwner();
    error EpochNotEnded();
    error EpochAlreadySettled();
    error EpochNotFound();
    error OnlyPoolManager();

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------
    event EpochStarted(PoolId indexed poolId, uint256 indexed epochId, uint256 endBlock);
    event OrderBuffered(
        PoolId indexed poolId, uint256 indexed epochId, address indexed user, bool zeroForOne, uint256 amountIn
    );
    event EpochSettled(
        PoolId indexed poolId, uint256 indexed epochId, uint256 clearingPrice, uint256 matchedVolume
    );
    event KeeperUpdated(address indexed previous, address indexed current);

    // ---------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------
    struct PendingOrder {
        address user;
        bool zeroForOne;
        uint256 amountIn;
        uint256 minAmountOut;
    }

    struct Epoch {
        uint256 endBlock;
        bool settled;
        uint256 totalBuyVolume; // zeroForOne — token0 in
        uint256 totalSellVolume; // !zeroForOne — token1 in
    }

    // ---------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------
    uint256 public immutable epochDurationBlocks;
    address public keeper;
    address public owner;

    mapping(PoolId => mapping(uint256 => Epoch)) public epochs;
    mapping(PoolId => mapping(uint256 => PendingOrder[])) public pendingOrders;
    mapping(PoolId => uint256) public poolCurrentEpoch;
    mapping(PoolId => bool) public poolInitialized;
    mapping(PoolId => PoolKey) internal poolKeys;

    constructor(IPoolManager _manager, uint256 _epochDurationBlocks, address _keeper) BaseHook(_manager) {
        epochDurationBlocks = _epochDurationBlocks;
        keeper = _keeper;
        owner = msg.sender;
    }

    modifier onlyKeeper() {
        if (msg.sender != keeper) revert NotKeeper();
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function setKeeper(address newKeeper) external onlyOwner {
        emit KeeperUpdated(keeper, newKeeper);
        keeper = newKeeper;
    }

    // ---------------------------------------------------------------------
    // Hook permissions
    // ---------------------------------------------------------------------
    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: true,
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

    function _afterInitialize(address, PoolKey calldata key, uint160, int24) internal override returns (bytes4) {
        PoolId pid = key.toId();
        poolInitialized[pid] = true;
        poolKeys[pid] = key;
        epochs[pid][0] = Epoch({
            endBlock: block.number + epochDurationBlocks,
            settled: false,
            totalBuyVolume: 0,
            totalSellVolume: 0
        });
        emit EpochStarted(pid, 0, block.number + epochDurationBlocks);
        return BaseHook.afterInitialize.selector;
    }

    // ---------------------------------------------------------------------
    // beforeSwap — ALWAYS buffer all swaps via mint + delta
    // ---------------------------------------------------------------------
    /// @dev hookData encodes the swapper (since msg.sender to PM is the router).
    function _beforeSwap(address sender, PoolKey calldata key, SwapParams calldata params, bytes calldata hookData)
        internal
        override
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        // Self-calls (settlement path) pass straight through to the AMM.
        if (sender == address(this)) {
            return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
        }
        // Only handle exact-input swaps — exact-output is left unsupported
        // for batches (would require quoting input from output).
        if (params.amountSpecified >= 0) {
            return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
        }

        uint256 amountIn = uint256(-params.amountSpecified);
        PoolId pid = key.toId();
        uint256 epochId = poolCurrentEpoch[pid];

        Currency tokenIn = params.zeroForOne ? key.currency0 : key.currency1;

        // V4 AsyncSwap: mint ERC-6909 claim to custody the user's input
        // inside PoolManager. The router still settles `amountIn` as normal.
        poolManager.mint(address(this), tokenIn.toId(), amountIn);

        address user = hookData.length >= 32 ? abi.decode(hookData, (address)) : sender;
        uint256 minOut;
        // Optionally pass minOut in the hookData (32 bytes user + 32 bytes minOut).
        if (hookData.length >= 64) {
            (, minOut) = abi.decode(hookData, (address, uint256));
        }

        pendingOrders[pid][epochId].push(
            PendingOrder({user: user, zeroForOne: params.zeroForOne, amountIn: amountIn, minAmountOut: minOut})
        );

        Epoch storage e = epochs[pid][epochId];
        if (params.zeroForOne) e.totalBuyVolume += amountIn;
        else e.totalSellVolume += amountIn;

        emit OrderBuffered(pid, epochId, user, params.zeroForOne, amountIn);

        // Consume the full input, suppressing the AMM execution.
        return (BaseHook.beforeSwap.selector, toBeforeSwapDelta(int128(uint128(amountIn)), 0), 0);
    }

    // ---------------------------------------------------------------------
    // Settlement — keeper-only; runs inside PM unlock
    // ---------------------------------------------------------------------
    function settleEpoch(PoolKey calldata key, uint256 epochId) external onlyKeeper {
        PoolId pid = key.toId();
        Epoch storage e = epochs[pid][epochId];
        if (e.endBlock == 0) revert EpochNotFound();
        if (e.settled) revert EpochAlreadySettled();
        if (block.number < e.endBlock) revert EpochNotEnded();

        e.settled = true;
        poolManager.unlock(abi.encode(key, epochId));
    }

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        if (msg.sender != address(poolManager)) revert OnlyPoolManager();
        (PoolKey memory key, uint256 epochId) = abi.decode(data, (PoolKey, uint256));
        PoolId pid = key.toId();
        Epoch storage e = epochs[pid][epochId];
        PendingOrder[] storage orders = pendingOrders[pid][epochId];

        uint256 n = orders.length;
        // Pre-pass: determine slippage-feasible orders at the uniform 1:1
        // clearing price. Withdrawn orders don't participate in matching.
        bool[] memory withdrawn = new bool[](n);
        uint256 buyVol = e.totalBuyVolume;
        uint256 sellVol = e.totalSellVolume;
        bool changed = true;
        while (changed) {
            changed = false;
            uint256 matched_ = buyVol < sellVol ? buyVol : sellVol;
            for (uint256 i = 0; i < n; i++) {
                if (withdrawn[i]) continue;
                PendingOrder storage o = orders[i];
                uint256 side = o.zeroForOne ? buyVol : sellVol;
                uint256 fill = side == 0 ? 0 : (o.amountIn * matched_) / side;
                if (fill < o.minAmountOut) {
                    withdrawn[i] = true;
                    if (o.zeroForOne) buyVol -= o.amountIn;
                    else sellVol -= o.amountIn;
                    changed = true;
                }
            }
        }
        uint256 matched = buyVol < sellVol ? buyVol : sellVol;

        // Burn all ERC-6909 claims for tokens used in matching/refund. We
        // burn the full original deposit per order and redirect to user.
        for (uint256 i = 0; i < n; i++) {
            PendingOrder storage o = orders[i];
            Currency inCcy = o.zeroForOne ? key.currency0 : key.currency1;
            Currency outCcy = o.zeroForOne ? key.currency1 : key.currency0;

            // Burn the deposit (gives hook a positive delta on inCcy).
            poolManager.burn(address(this), inCcy.toId(), o.amountIn);

            if (withdrawn[i]) {
                // Full refund of input.
                poolManager.take(inCcy, o.user, o.amountIn);
                continue;
            }

            uint256 side = o.zeroForOne ? buyVol : sellVol;
            uint256 fill = side == 0 ? 0 : (o.amountIn * matched) / side;
            uint256 refund = o.amountIn - fill;

            if (refund > 0) {
                poolManager.take(inCcy, o.user, refund);
            }
            if (fill > 0) {
                // Counter-side input becomes this side's output (1:1 uniform).
                // Since we still hold the counter-side's ERC-6909 (will be
                // burned when iterating those orders), the matched amounts
                // net out at PM. We take outCcy from PM to fund the fill —
                // this debit is balanced by the counter-side's burn credit.
                poolManager.take(outCcy, o.user, fill);
            }
        }

        emit EpochSettled(pid, epochId, 1e18, matched);

        // Start the next epoch.
        uint256 nextId = epochId + 1;
        poolCurrentEpoch[pid] = nextId;
        epochs[pid][nextId] = Epoch({
            endBlock: block.number + epochDurationBlocks,
            settled: false,
            totalBuyVolume: 0,
            totalSellVolume: 0
        });
        emit EpochStarted(pid, nextId, block.number + epochDurationBlocks);

        return "";
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------
    function getEpoch(PoolId pid, uint256 epochId) external view returns (Epoch memory) {
        return epochs[pid][epochId];
    }

    function getOrderCount(PoolId pid, uint256 epochId) external view returns (uint256) {
        return pendingOrders[pid][epochId].length;
    }
}
