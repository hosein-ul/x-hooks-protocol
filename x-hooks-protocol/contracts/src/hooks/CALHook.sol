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
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {FullMath} from "@uniswap/v4-core/src/libraries/FullMath.sol";
import {FixedPoint96} from "@uniswap/v4-core/src/libraries/FixedPoint96.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title CALHook — Commitments-as-Liquidity Hook
/// @notice Users pre-commit ERC-20 collateral at a trigger price. When any swap
/// moves the pool price through the trigger, the commitment auto-executes as
/// liquidity in that same swap — the owner receives output tokens atomically.
contract CALHook is BaseHook {
    using SafeERC20 for IERC20;
    using CurrencyLibrary for Currency;
    using StateLibrary for IPoolManager;

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------
    error CommitmentNotFound();
    error CommitmentAlreadyExecuted();
    error NotOwner();
    error InvalidExpiry();
    error InvalidAmount();

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------
    event CommitmentCreated(
        uint256 indexed id,
        address indexed owner,
        PoolId indexed poolId,
        Direction direction,
        uint160 triggerPrice,
        uint256 collateralAmount
    );
    event CommitmentExecuted(uint256 indexed id, address indexed owner, uint256 outputAmount);
    event CommitmentExpired(uint256 indexed id, address indexed owner);
    event CommitmentCancelled(uint256 indexed id, address indexed owner);

    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------
    enum Direction {
        BUY, // deposit token1, buy token0 when price drops to trigger
        SELL // deposit token0, sell token0 when price rises to trigger
    }

    enum CommitmentStatus {
        Active,
        Executed,
        Expired,
        Cancelled
    }

    struct Commitment {
        CommitmentStatus status;
        address owner;
        PoolId poolId;
        Direction direction;
        uint160 triggerPrice; // sqrtPriceX96
        uint256 expiryBlock;
        Currency collateralToken;
        uint256 collateralAmount;
    }

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------
    uint256 public nextId = 1;
    mapping(uint256 => Commitment) public commitments;
    mapping(PoolId => uint256[]) public activeCommitments;

    uint256 public totalExecuted;
    uint256 public totalCollateralLocked;

    constructor(IPoolManager _manager) BaseHook(_manager) {}

    // -------------------------------------------------------------------------
    // Hook permissions
    // -------------------------------------------------------------------------
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

    // -------------------------------------------------------------------------
    // createCommitment — lock ERC-20 collateral
    // -------------------------------------------------------------------------
    function createCommitment(
        PoolKey calldata key,
        Direction direction,
        uint160 triggerPrice,
        uint256 expiryBlock,
        uint256 amount
    ) external returns (uint256 id) {
        if (expiryBlock <= block.number) revert InvalidExpiry();
        if (amount == 0) revert InvalidAmount();

        // BUY: deposit token1 (to buy token0 when price drops)
        // SELL: deposit token0 (to sell for token1 when price rises)
        Currency collateralToken = direction == Direction.BUY ? key.currency1 : key.currency0;

        IERC20(Currency.unwrap(collateralToken)).safeTransferFrom(msg.sender, address(this), amount);

        id = nextId++;
        Commitment storage c = commitments[id];
        c.status = CommitmentStatus.Active;
        c.owner = msg.sender;
        c.poolId = key.toId();
        c.direction = direction;
        c.triggerPrice = triggerPrice;
        c.expiryBlock = expiryBlock;
        c.collateralToken = collateralToken;
        c.collateralAmount = amount;

        activeCommitments[key.toId()].push(id);
        totalCollateralLocked += amount;

        emit CommitmentCreated(id, msg.sender, key.toId(), direction, triggerPrice, amount);
    }

    // -------------------------------------------------------------------------
    // cancelCommitment — owner refunds non-executed commitment
    // -------------------------------------------------------------------------
    function cancelCommitment(uint256 id) external {
        Commitment storage c = commitments[id];
        if (c.status != CommitmentStatus.Active) revert CommitmentAlreadyExecuted();
        if (c.owner != msg.sender) revert NotOwner();

        c.status = CommitmentStatus.Cancelled;
        totalCollateralLocked -= c.collateralAmount;
        IERC20(Currency.unwrap(c.collateralToken)).safeTransfer(c.owner, c.collateralAmount);

        emit CommitmentCancelled(id, c.owner);
    }

    // -------------------------------------------------------------------------
    // beforeSwap — scan commitments, execute triggered ones atomically
    // -------------------------------------------------------------------------
    function _beforeSwap(address, PoolKey calldata key, SwapParams calldata params, bytes calldata)
        internal
        override
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        PoolId poolId = key.toId();
        (uint160 currentSqrtPrice,,,) = poolManager.getSlot0(poolId);

        uint256[] storage ids = activeCommitments[poolId];
        if (ids.length == 0) {
            return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
        }

        // For zeroForOne: specified=currency0, unspecified=currency1
        // For !zeroForOne: specified=currency1, unspecified=currency0
        int128 totalSpecifiedDelta;
        int128 totalUnspecifiedDelta;

        uint256 i = ids.length;
        while (i > 0) {
            unchecked {
                i--;
            }
            uint256 id = ids[i];
            Commitment storage c = commitments[id];

            if (c.status != CommitmentStatus.Active) {
                _removeAt(ids, i);
                continue;
            }

            // Handle expired commitments: refund and skip
            if (block.number >= c.expiryBlock) {
                c.status = CommitmentStatus.Expired;
                totalCollateralLocked -= c.collateralAmount;
                IERC20(Currency.unwrap(c.collateralToken)).safeTransfer(c.owner, c.collateralAmount);
                _removeAt(ids, i);
                emit CommitmentExpired(id, c.owner);
                continue;
            }

            // Check trigger condition
            bool triggered = false;
            if (c.direction == Direction.BUY && params.zeroForOne) {
                // BUY: price drops (zeroForOne) — fires when current price is above trigger
                // and the swap's limit price will cross through trigger
                triggered = currentSqrtPrice >= c.triggerPrice
                    && params.sqrtPriceLimitX96 <= c.triggerPrice;
            } else if (c.direction == Direction.SELL && !params.zeroForOne) {
                // SELL: price rises (!zeroForOne) — fires when current price is below trigger
                // and the swap's limit price will cross through trigger
                triggered = currentSqrtPrice <= c.triggerPrice
                    && params.sqrtPriceLimitX96 >= c.triggerPrice;
            }

            if (!triggered) continue;

            // Execute the commitment atomically using settle/take pattern
            (int128 specDelta, int128 unspecDelta) = _executeCommitment(c, id, key, params.zeroForOne);
            totalSpecifiedDelta += specDelta;
            totalUnspecifiedDelta += unspecDelta;

            c.status = CommitmentStatus.Executed;
            totalCollateralLocked -= c.collateralAmount;
            totalExecuted++;
            _removeAt(ids, i);
        }

        if (totalSpecifiedDelta == 0 && totalUnspecifiedDelta == 0) {
            return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
        }

        return (BaseHook.beforeSwap.selector, toBeforeSwapDelta(totalSpecifiedDelta, totalUnspecifiedDelta), 0);
    }

    /// @dev Execute one commitment: settle collateral into PM, take output for owner.
    /// Returns (specifiedDelta, unspecifiedDelta) to include in the BeforeSwapDelta.
    function _executeCommitment(
        Commitment storage c,
        uint256 id,
        PoolKey calldata key,
        bool zeroForOne
    ) internal returns (int128 specDelta, int128 unspecDelta) {
        uint256 collateral = c.collateralAmount;

        if (c.direction == Direction.BUY) {
            // BUY: collateral = token1, output = token0
            // Compute token0 output: amount0 = collateral * Q96^2 / triggerPrice^2
            uint256 token0Out = FullMath.mulDiv(
                FullMath.mulDiv(collateral, FixedPoint96.Q96, c.triggerPrice),
                FixedPoint96.Q96,
                c.triggerPrice
            );

            // Settle collateral (token1) into PM
            poolManager.sync(c.collateralToken);
            IERC20(Currency.unwrap(c.collateralToken)).safeTransfer(address(poolManager), collateral);
            poolManager.settle();

            // Take token0 for commitment owner
            poolManager.take(key.currency0, c.owner, token0Out);

            // zeroForOne: specified=currency0, unspecified=currency1
            // Hook consumed token1 (unspecified) and produced token0 (specified) for owner
            // specifiedDelta = +token0Out (hook "absorbs" token0 from the swap on behalf of owner)
            // unspecifiedDelta = -collateral (hook provides token1 back to the swap output side)
            specDelta = int128(uint128(token0Out));
            unspecDelta = -int128(uint128(collateral));

            emit CommitmentExecuted(id, c.owner, token0Out);
        } else {
            // SELL: collateral = token0, output = token1
            // Compute token1 output: amount1 = collateral * triggerPrice^2 / Q96^2
            uint256 token1Out = FullMath.mulDiv(
                FullMath.mulDiv(collateral, c.triggerPrice, FixedPoint96.Q96),
                c.triggerPrice,
                FixedPoint96.Q96
            );

            // Settle collateral (token0) into PM
            poolManager.sync(c.collateralToken);
            IERC20(Currency.unwrap(c.collateralToken)).safeTransfer(address(poolManager), collateral);
            poolManager.settle();

            // Take token1 for commitment owner
            poolManager.take(key.currency1, c.owner, token1Out);

            // !zeroForOne: specified=currency1, unspecified=currency0
            // Hook consumed token0 (unspecified) and produced token1 (specified) for owner
            specDelta = int128(uint128(token1Out));
            unspecDelta = -int128(uint128(collateral));

            emit CommitmentExecuted(id, c.owner, token1Out);
        }
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------
    function _removeAt(uint256[] storage arr, uint256 i) internal {
        uint256 last = arr.length - 1;
        if (i != last) arr[i] = arr[last];
        arr.pop();
    }

    // -------------------------------------------------------------------------
    // Views
    // -------------------------------------------------------------------------
    function getCommitment(uint256 id) external view returns (Commitment memory) {
        return commitments[id];
    }

    function activeCount(PoolId poolId) external view returns (uint256) {
        return activeCommitments[poolId].length;
    }
}
