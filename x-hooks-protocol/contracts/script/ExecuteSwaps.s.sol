// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IUnlockCallback} from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {SwapParams, ModifyLiquidityParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {IERC20Minimal} from "@uniswap/v4-core/src/interfaces/external/IERC20Minimal.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {Constants} from "./base/Constants.sol";

// ─────────────────────────────────────────────────────────────────────────────
// SwapHelper — minimal on-chain router that implements IUnlockCallback so it
// can add liquidity and execute swaps inside the PoolManager's unlock context.
//
// Encoding convention (both actions start with a bool discriminator):
//   Liquidity: abi.encode(false, payer, key, tickLower, tickUpper, liquidityDelta)
//   Swap:      abi.encode(true,  payer, key, swapParams)
// ─────────────────────────────────────────────────────────────────────────────
contract SwapHelper is IUnlockCallback {
    IPoolManager public immutable manager;

    error OnlyManager();

    constructor(IPoolManager _manager) {
        manager = _manager;
    }

    // ── Public entry-points called by the script ──────────────────────────

    function addLiquidity(
        address payer,
        PoolKey memory key,
        int24 tickLower,
        int24 tickUpper,
        int256 liquidityDelta,
        bytes memory hookData
    ) external returns (BalanceDelta delta) {
        bytes memory result = manager.unlock(
            abi.encode(false, payer, key, tickLower, tickUpper, liquidityDelta, hookData)
        );
        delta = abi.decode(result, (BalanceDelta));
    }

    function swap(
        address payer,
        PoolKey memory key,
        bool zeroForOne,
        int256 amountSpecified
    ) external returns (BalanceDelta delta) {
        uint160 sqrtLimit = zeroForOne
            ? TickMath.MIN_SQRT_PRICE + 1
            : TickMath.MAX_SQRT_PRICE - 1;

        bytes memory result = manager.unlock(
            abi.encode(
                true,
                payer,
                key,
                SwapParams({
                    zeroForOne: zeroForOne,
                    amountSpecified: amountSpecified,
                    sqrtPriceLimitX96: sqrtLimit
                })
            )
        );
        delta = abi.decode(result, (BalanceDelta));
    }

    // ── IUnlockCallback ───────────────────────────────────────────────────

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        if (msg.sender != address(manager)) revert OnlyManager();

        // Read discriminator from first 32-byte word.
        bool isSwap = abi.decode(data, (bool));

        if (!isSwap) {
            (
                ,
                address payer,
                PoolKey memory key,
                int24 tickLower,
                int24 tickUpper,
                int256 liquidityDelta,
                bytes memory hookData
            ) = abi.decode(data, (bool, address, PoolKey, int24, int24, int256, bytes));

            (BalanceDelta delta,) = manager.modifyLiquidity(
                key,
                ModifyLiquidityParams({
                    tickLower: tickLower,
                    tickUpper: tickUpper,
                    liquidityDelta: liquidityDelta,
                    salt: bytes32(0)
                }),
                hookData
            );

            _settle(key.currency0, key.currency1, delta, payer);
            return abi.encode(delta);
        } else {
            (
                ,
                address payer,
                PoolKey memory key,
                SwapParams memory params
            ) = abi.decode(data, (bool, address, PoolKey, SwapParams));

            BalanceDelta delta = manager.swap(key, params, "");

            _settle(key.currency0, key.currency1, delta, payer);
            return abi.encode(delta);
        }
    }

    // ── Internal helpers ──────────────────────────────────────────────────

    function _settle(
        Currency currency0,
        Currency currency1,
        BalanceDelta delta,
        address payer
    ) internal {
        int128 d0 = delta.amount0();
        int128 d1 = delta.amount1();

        // Negative delta = caller owes PM → transfer from payer.
        if (d0 < 0) _pay(currency0, payer, uint128(-d0));
        if (d1 < 0) _pay(currency1, payer, uint128(-d1));

        // Positive delta = PM owes caller → take tokens to payer.
        if (d0 > 0) manager.take(currency0, payer, uint128(d0));
        if (d1 > 0) manager.take(currency1, payer, uint128(d1));
    }

    function _pay(Currency currency, address payer, uint128 amount) internal {
        manager.sync(currency);
        IERC20Minimal(Currency.unwrap(currency)).transferFrom(
            payer,
            address(manager),
            amount
        );
        manager.settle();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ExecuteSwaps — forge script that seeds liquidity and executes one swap per
// hook pool, triggering beforeSwap / afterSwap callbacks on every hook.
// ─────────────────────────────────────────────────────────────────────────────
contract ExecuteSwaps is Script {
    // ── Deployed token addresses (from DeployPool.s.sol broadcast) ────────
    address constant XHKA = 0xE26b32C27E39a736325E5D89366104425b8EF6EF;
    address constant XHKB = 0x8199bFf13918c270ced3df9776862663b7c952e3;

    // ── Hook addresses (from DeployAll.s.sol broadcast) ───────────────────
    address constant OFA_HOOK  = 0x955523a8eD7999e05015bC6F7b854D447717c088;
    address constant BCS_HOOK  = 0xb7128F16104e6DD0DCe6f89dfBf733440E7F8080;
    address constant PLT_HOOK  = 0xb4313ADd866F4E30F22751F9Ccf2C526839eda40;
    address constant SUBA_HOOK = 0xD8b747E0e895eD02FbDac6378A9548368374d088;
    address constant CAL_HOOK  = 0x3F26eF2279a0FfbBdC8270198106633008d78088;

    IPoolManager constant POOL_MANAGER = IPoolManager(Constants.POOL_MANAGER);

    // ── Pool & swap parameters ────────────────────────────────────────────
    uint24  constant FEE            = 3000;
    int24   constant TICK_SPACING   = 60;
    int24   constant TICK_LOWER     = -600; // 10 × tickSpacing below 0
    int24   constant TICK_UPPER     = 600;  // 10 × tickSpacing above 0
    int256  constant LIQUIDITY      = 10_000e18;
    // exactIn swap: -1e18 (below OFAHook's 1000e18 auction threshold)
    int256  constant SWAP_IN        = -1e18;

    function run() external {
        require(block.chainid == Constants.X_LAYER_CHAIN_ID, "Must run on X Layer Mainnet");

        // Sort currencies: currency0 < currency1 numerically.
        (address t0, address t1) = XHKA < XHKB ? (XHKA, XHKB) : (XHKB, XHKA);
        Currency c0 = Currency.wrap(t0);
        Currency c1 = Currency.wrap(t1);

        vm.startBroadcast();

        // ── Deploy router ─────────────────────────────────────────────────
        SwapHelper helper = new SwapHelper(POOL_MANAGER);
        console.log("SwapHelper:", address(helper));

        // ── Approve router for both tokens ────────────────────────────────
        IERC20Minimal(t0).approve(address(helper), type(uint256).max);
        IERC20Minimal(t1).approve(address(helper), type(uint256).max);

        // PLTHook requires hookData = abi.encode(lp, tranche) for addLiquidity.
        // Tranche.SENIOR = 0, Tranche.JUNIOR = 1.
        bytes memory pltHookData = abi.encode(msg.sender, uint8(0)); // SENIOR tranche

        // ── Seed liquidity & execute swap per pool ────────────────────────
        _doPoolActions(helper, c0, c1, IHooks(OFA_HOOK),  "OFAHook",  "");
        _doPoolActions(helper, c0, c1, IHooks(BCS_HOOK),  "BCSHook",  "");
        _doPoolActions(helper, c0, c1, IHooks(PLT_HOOK),  "PLTHook",  pltHookData);
        _doPoolActions(helper, c0, c1, IHooks(SUBA_HOOK), "SUBAHook", "");
        _doPoolActions(helper, c0, c1, IHooks(CAL_HOOK),  "CALHook",  "");

        vm.stopBroadcast();

        console.log("===== EXECUTION COMPLETE =====");
        console.log("Liquidity seeded and swaps executed for all 5 hook pools.");
        console.log("==============================");
    }

    function _doPoolActions(
        SwapHelper helper,
        Currency c0,
        Currency c1,
        IHooks hook,
        string memory label,
        bytes memory liqHookData
    ) internal {
        PoolKey memory key = PoolKey({
            currency0: c0,
            currency1: c1,
            fee: FEE,
            tickSpacing: TICK_SPACING,
            hooks: hook
        });

        // Add liquidity so there is depth to swap against.
        BalanceDelta liqDelta = helper.addLiquidity(
            msg.sender, key, TICK_LOWER, TICK_UPPER, LIQUIDITY, liqHookData
        );
        console.log(string.concat("[", label, "] liquidity added"));
        int128 la0 = liqDelta.amount0();
        int128 la1 = liqDelta.amount1();
        if (la0 < 0) console.log("  token0 deposited:", uint128(-la0));
        if (la1 < 0) console.log("  token1 deposited:", uint128(-la1));

        // Execute swap: sell 1 token of currency0 for currency1.
        BalanceDelta swapDelta = helper.swap(msg.sender, key, true, SWAP_IN);
        console.log(string.concat("[", label, "] swap executed"));
        console.log("  delta0:", swapDelta.amount0());
        console.log("  delta1:", swapDelta.amount1());
    }
}
