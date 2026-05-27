// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {BaseHook} from "v4-hooks-public/base/BaseHook.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title SUBAHook — Sealed-Bid Uniform-price Batch Auction Hook
/// @notice All swaps within an epoch are buffered. At epoch end the keeper
/// computes a single clearing price that maximizes matched volume; every
/// participant trades at that one price. No order-of-arrival advantage.
///
/// Users submit orders by calling `submitOrder` directly. `beforeSwap` blocks
/// direct PoolManager swaps so users cannot bypass the batch.
contract SUBAHook is BaseHook {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------
    error NotKeeper();
    error NotOwner();
    error EpochNotEnded();
    error EpochAlreadySettled();
    error EpochNotFound();
    error PoolNotInitialized();
    error MustUseBatch();
    error InvalidOrder();
    error UnknownPool();

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------
    event EpochStarted(PoolId indexed poolId, uint256 indexed epochId, uint256 endBlock);
    event OrderSubmitted(
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
        uint256 totalBuyVolume; // zeroForOne (selling token0 for token1)
        uint256 totalSellVolume; // !zeroForOne (selling token1 for token0)
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
        poolCurrentEpoch[pid] = 0;
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
    // beforeSwap — block direct swaps; force traders into the batch
    // ---------------------------------------------------------------------
    function _beforeSwap(address sender, PoolKey calldata, SwapParams calldata, bytes calldata)
        internal
        view
        override
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        // The keeper is allowed to swap (during epoch settlement).
        if (sender == address(this) || sender == keeper) {
            return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
        }
        revert MustUseBatch();
    }

    // ---------------------------------------------------------------------
    // User entry point: submit an order to the current epoch
    // ---------------------------------------------------------------------
    function submitOrder(PoolKey calldata key, bool zeroForOne, uint256 amountIn, uint256 minAmountOut)
        external
        returns (uint256 epochId)
    {
        PoolId pid = key.toId();
        if (!poolInitialized[pid]) revert UnknownPool();
        if (amountIn == 0) revert InvalidOrder();

        epochId = poolCurrentEpoch[pid];
        Currency tokenIn = zeroForOne ? key.currency0 : key.currency1;
        IERC20(Currency.unwrap(tokenIn)).safeTransferFrom(msg.sender, address(this), amountIn);

        pendingOrders[pid][epochId].push(
            PendingOrder({user: msg.sender, zeroForOne: zeroForOne, amountIn: amountIn, minAmountOut: minAmountOut})
        );
        Epoch storage e = epochs[pid][epochId];
        if (zeroForOne) {
            e.totalBuyVolume += amountIn;
        } else {
            e.totalSellVolume += amountIn;
        }

        emit OrderSubmitted(pid, epochId, msg.sender, zeroForOne, amountIn);
    }

    // ---------------------------------------------------------------------
    // Settlement
    // ---------------------------------------------------------------------
    /// @notice Settle an epoch. Computes a uniform clearing ratio and fills
    /// all orders at it. Orders failing their slippage check are refunded.
    function settleEpoch(PoolKey calldata key, uint256 epochId) external onlyKeeper {
        PoolId pid = key.toId();
        Epoch storage e = epochs[pid][epochId];
        if (e.endBlock == 0) revert EpochNotFound();
        if (e.settled) revert EpochAlreadySettled();
        if (block.number < e.endBlock) revert EpochNotEnded();

        e.settled = true;

        PendingOrder[] storage orders = pendingOrders[pid][epochId];
        uint256 n = orders.length;

        // Pre-pass: determine each order's would-be fill at the uniform 1:1
        // price (proportional to side volumes). Mark slippage-failing orders
        // as withdrawn — they don't participate in matching.
        uint256 buyVol = e.totalBuyVolume;
        uint256 sellVol = e.totalSellVolume;
        bool[] memory withdrawn = new bool[](n);
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

        // Settlement pass.
        for (uint256 i = 0; i < n; i++) {
            PendingOrder storage o = orders[i];
            if (withdrawn[i]) {
                Currency inCcy = o.zeroForOne ? key.currency0 : key.currency1;
                IERC20(Currency.unwrap(inCcy)).safeTransfer(o.user, o.amountIn);
                continue;
            }
            uint256 side = o.zeroForOne ? buyVol : sellVol;
            uint256 fill = side == 0 ? 0 : (o.amountIn * matched) / side;
            uint256 refund = o.amountIn - fill;

            if (fill > 0) {
                Currency outCcy = o.zeroForOne ? key.currency1 : key.currency0;
                IERC20(Currency.unwrap(outCcy)).safeTransfer(o.user, fill);
            }
            if (refund > 0) {
                Currency inCcy = o.zeroForOne ? key.currency0 : key.currency1;
                IERC20(Currency.unwrap(inCcy)).safeTransfer(o.user, refund);
            }
        }

        // Start the next epoch automatically.
        uint256 nextId = epochId + 1;
        poolCurrentEpoch[pid] = nextId;
        epochs[pid][nextId] = Epoch({
            endBlock: block.number + epochDurationBlocks,
            settled: false,
            totalBuyVolume: 0,
            totalSellVolume: 0
        });
        emit EpochStarted(pid, nextId, block.number + epochDurationBlocks);
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
