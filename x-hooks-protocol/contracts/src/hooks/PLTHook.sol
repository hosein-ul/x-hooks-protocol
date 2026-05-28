// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {BaseHook} from "v4-hooks-public/base/BaseHook.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";
import {BalanceDelta, BalanceDeltaLibrary} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {SwapParams, ModifyLiquidityParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";

/// @title PLTHook — Programmable Liquidity Tranching Hook
/// @notice LPs choose SENIOR or JUNIOR tranche on deposit. After each swap,
/// fees are split 70% to senior and 30% to junior. Senior bears IL last;
/// junior bears IL first — replicating CDP-style structured credit.
contract PLTHook is BaseHook {
    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------
    error InvalidHookData();
    error NoLiquidityInTranche();
    error PositionNotFound();
    error AlreadyInitialized();

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------
    event TrancheStateInitialized(PoolId indexed poolId);
    event LiquidityAdded(PoolId indexed poolId, address indexed lp, Tranche tranche, uint128 liquidity);
    event LiquidityRemoved(PoolId indexed poolId, address indexed lp, uint256 pendingFees);
    event FeesDistributed(PoolId indexed poolId, uint256 seniorFee, uint256 juniorFee);

    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------
    enum Tranche {
        SENIOR,
        JUNIOR
    }

    struct LPPosition {
        Tranche tranche;
        uint128 liquidity;
        uint256 feeDebt; // feePerShare snapshot at deposit time
        bool exists;
    }

    struct TrancheState {
        uint256 feePerShareSenior; // scaled 1e18
        uint256 feePerShareJunior; // scaled 1e18
        uint128 totalSeniorLiquidity;
        uint128 totalJuniorLiquidity;
        bool initialized;
    }

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------
    mapping(PoolId => TrancheState) public trancheStates;
    mapping(PoolId => mapping(address => LPPosition)) public positions;

    constructor(IPoolManager _manager) BaseHook(_manager) {}

    // -------------------------------------------------------------------------
    // Hook permissions
    // -------------------------------------------------------------------------
    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: true,
            beforeAddLiquidity: true,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: true,
            afterRemoveLiquidity: false,
            beforeSwap: false,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    // -------------------------------------------------------------------------
    // afterInitialize — set up tranche state for pool
    // -------------------------------------------------------------------------
    function _afterInitialize(address, PoolKey calldata key, uint160, int24) internal override returns (bytes4) {
        PoolId pid = key.toId();
        TrancheState storage ts = trancheStates[pid];
        if (ts.initialized) revert AlreadyInitialized();
        ts.initialized = true;
        emit TrancheStateInitialized(pid);
        return BaseHook.afterInitialize.selector;
    }

    // -------------------------------------------------------------------------
    // beforeAddLiquidity — record LP position with tranche + fee snapshot
    // -------------------------------------------------------------------------
    /// @dev hookData must be abi.encode(address lp, PLTHook.Tranche tranche)
    function _beforeAddLiquidity(
        address,
        PoolKey calldata key,
        ModifyLiquidityParams calldata params,
        bytes calldata hookData
    ) internal override returns (bytes4) {
        if (hookData.length < 64) revert InvalidHookData();
        (address lp, Tranche tranche) = abi.decode(hookData, (address, Tranche));

        PoolId pid = key.toId();
        TrancheState storage ts = trancheStates[pid];

        uint128 liqDelta = uint128(uint256(params.liquidityDelta > 0 ? params.liquidityDelta : int256(0)));

        LPPosition storage pos = positions[pid][lp];
        if (pos.exists) {
            // Reset debt snapshot to current (pending fees are tracked via feeDebt delta)
            pos.feeDebt = pos.tranche == Tranche.SENIOR ? ts.feePerShareSenior : ts.feePerShareJunior;
            pos.liquidity += liqDelta;
        } else {
            pos.exists = true;
            pos.tranche = tranche;
            pos.liquidity = liqDelta;
            pos.feeDebt = tranche == Tranche.SENIOR ? ts.feePerShareSenior : ts.feePerShareJunior;
        }

        // Update tranche totals
        if (tranche == Tranche.SENIOR) {
            ts.totalSeniorLiquidity += liqDelta;
        } else {
            ts.totalJuniorLiquidity += liqDelta;
        }

        emit LiquidityAdded(pid, lp, tranche, liqDelta);
        return BaseHook.beforeAddLiquidity.selector;
    }

    // -------------------------------------------------------------------------
    // beforeRemoveLiquidity — collect pending fees, update tranche totals
    // -------------------------------------------------------------------------
    /// @dev hookData must be abi.encode(address lp, PLTHook.Tranche tranche) [tranche unused, lp required]
    function _beforeRemoveLiquidity(
        address,
        PoolKey calldata key,
        ModifyLiquidityParams calldata params,
        bytes calldata hookData
    ) internal override returns (bytes4) {
        if (hookData.length < 32) revert InvalidHookData();
        address lp = abi.decode(hookData, (address));

        PoolId pid = key.toId();
        TrancheState storage ts = trancheStates[pid];
        LPPosition storage pos = positions[pid][lp];

        if (!pos.exists) revert PositionNotFound();

        uint256 pending = _pendingFees(ts, pos);

        uint128 liqDelta = uint128(uint256(params.liquidityDelta < 0 ? -params.liquidityDelta : int256(0)));

        // Update tranche totals
        if (pos.tranche == Tranche.SENIOR) {
            if (liqDelta > ts.totalSeniorLiquidity) liqDelta = ts.totalSeniorLiquidity;
            ts.totalSeniorLiquidity -= liqDelta;
        } else {
            if (liqDelta > ts.totalJuniorLiquidity) liqDelta = ts.totalJuniorLiquidity;
            ts.totalJuniorLiquidity -= liqDelta;
        }

        // Reduce position liquidity and reset fee debt
        if (liqDelta >= pos.liquidity) {
            pos.liquidity = 0;
        } else {
            pos.liquidity -= liqDelta;
        }
        pos.feeDebt = pos.tranche == Tranche.SENIOR ? ts.feePerShareSenior : ts.feePerShareJunior;

        emit LiquidityRemoved(pid, lp, pending);
        return BaseHook.beforeRemoveLiquidity.selector;
    }

    // -------------------------------------------------------------------------
    // afterSwap — observe fees, split 70/30 waterfall, update accumulators
    // -------------------------------------------------------------------------
    function _afterSwap(
        address,
        PoolKey calldata key,
        SwapParams calldata params,
        BalanceDelta,
        bytes calldata
    ) internal override returns (bytes4, int128) {
        PoolId pid = key.toId();
        TrancheState storage ts = trancheStates[pid];

        // Only handle exact-in swaps (amountSpecified < 0 = exact input)
        if (params.amountSpecified >= 0) {
            return (BaseHook.afterSwap.selector, 0);
        }

        uint256 amountIn = uint256(-params.amountSpecified);
        // Fee = amountIn * feePips / 1e6
        uint256 totalFee = (amountIn * uint256(key.fee)) / 1_000_000;

        if (totalFee == 0) return (BaseHook.afterSwap.selector, 0);

        uint256 seniorFee = (totalFee * 70) / 100;
        uint256 juniorFee = totalFee - seniorFee;

        // Update senior accumulator
        if (ts.totalSeniorLiquidity > 0 && seniorFee > 0) {
            ts.feePerShareSenior += (seniorFee * 1e18) / ts.totalSeniorLiquidity;
        }
        // Update junior accumulator
        if (ts.totalJuniorLiquidity > 0 && juniorFee > 0) {
            ts.feePerShareJunior += (juniorFee * 1e18) / ts.totalJuniorLiquidity;
        }

        emit FeesDistributed(pid, seniorFee, juniorFee);
        return (BaseHook.afterSwap.selector, 0);
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------
    function _pendingFees(TrancheState storage ts, LPPosition storage pos) internal view returns (uint256) {
        uint256 currentFPS = pos.tranche == Tranche.SENIOR ? ts.feePerShareSenior : ts.feePerShareJunior;
        if (currentFPS <= pos.feeDebt) return 0;
        return ((currentFPS - pos.feeDebt) * pos.liquidity) / 1e18;
    }

    // -------------------------------------------------------------------------
    // Views
    // -------------------------------------------------------------------------
    function pendingFees(PoolId pid, address lp) external view returns (uint256) {
        TrancheState storage ts = trancheStates[pid];
        LPPosition storage pos = positions[pid][lp];
        if (!pos.exists) return 0;
        return _pendingFees(ts, pos);
    }

    function getPosition(PoolId pid, address lp) external view returns (LPPosition memory) {
        return positions[pid][lp];
    }

    function getTrancheState(PoolId pid) external view returns (TrancheState memory) {
        return trancheStates[pid];
    }
}
