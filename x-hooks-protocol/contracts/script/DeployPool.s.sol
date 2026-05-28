// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {Constants} from "./base/Constants.sol";
import {MockERC20} from "../src/test/MockERC20.sol";

/// @notice Deploy two mock tokens and initialize one V4 pool per hook on X Layer Mainnet.
/// Usage:
///   Dry run:   forge script script/DeployPool.s.sol --rpc-url https://rpc.xlayer.tech
///   Broadcast: forge script script/DeployPool.s.sol --rpc-url https://rpc.xlayer.tech \
///              --private-key $PRIVATE_KEY --broadcast --slow
contract DeployPool is Script {
    // Deployed hook addresses (from DeployAll)
    address constant OFA_HOOK  = 0x955523a8eD7999e05015bC6F7b854D447717c088;
    address constant BCS_HOOK  = 0xb7128F16104e6DD0DCe6f89dfBf733440E7F8080;
    address constant PLT_HOOK  = 0xb4313ADd866F4E30F22751F9Ccf2C526839eda40;
    address constant SUBA_HOOK = 0xD8b747E0e895eD02FbDac6378A9548368374d088;
    address constant CAL_HOOK  = 0x3F26eF2279a0FfbBdC8270198106633008d78088;

    // sqrtPriceX96 for a 1:1 price (sqrt(1) * 2^96)
    uint160 constant SQRT_PRICE_1_1 = 79228162514264337593543950336;

    IPoolManager poolManager = IPoolManager(Constants.POOL_MANAGER);

    function run() external {
        require(block.chainid == Constants.X_LAYER_CHAIN_ID, "Must run on X Layer Mainnet");

        vm.startBroadcast();

        // ── Deploy two demo tokens ──────────────────────────────────────
        MockERC20 tokenA = new MockERC20("X Hooks Token A", "XHKA", 18);
        MockERC20 tokenB = new MockERC20("X Hooks Token B", "XHKB", 18);

        // Mint supply to deployer for later liquidity use
        tokenA.mint(msg.sender, 1_000_000e18);
        tokenB.mint(msg.sender, 1_000_000e18);

        console.log("TokenA (XHKA):", address(tokenA));
        console.log("TokenB (XHKB):", address(tokenB));

        // ── Sort: currency0 must be numerically smaller ─────────────────
        (Currency currency0, Currency currency1) = address(tokenA) < address(tokenB)
            ? (Currency.wrap(address(tokenA)), Currency.wrap(address(tokenB)))
            : (Currency.wrap(address(tokenB)), Currency.wrap(address(tokenA)));

        // ── Initialize pool with CALHook (0.3 % fee, tickSpacing 60) ───
        PoolKey memory calKey = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(CAL_HOOK)
        });
        int24 calTick = poolManager.initialize(calKey, SQRT_PRICE_1_1);
        console.log("CALHook pool initialized. Starting tick:", uint256(uint24(calTick)));

        // ── Initialize pool with OFAHook ────────────────────────────────
        PoolKey memory ofaKey = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(OFA_HOOK)
        });
        int24 ofaTick = poolManager.initialize(ofaKey, SQRT_PRICE_1_1);
        console.log("OFAHook pool initialized. Starting tick:", uint256(uint24(ofaTick)));

        // ── Initialize pool with BCSHook ────────────────────────────────
        PoolKey memory bcsKey = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(BCS_HOOK)
        });
        int24 bcsTick = poolManager.initialize(bcsKey, SQRT_PRICE_1_1);
        console.log("BCSHook pool initialized. Starting tick:", uint256(uint24(bcsTick)));

        // ── Initialize pool with PLTHook ────────────────────────────────
        PoolKey memory pltKey = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(PLT_HOOK)
        });
        int24 pltTick = poolManager.initialize(pltKey, SQRT_PRICE_1_1);
        console.log("PLTHook pool initialized. Starting tick:", uint256(uint24(pltTick)));

        // ── Initialize pool with SUBAHook ───────────────────────────────
        PoolKey memory subaKey = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(SUBA_HOOK)
        });
        int24 subaTick = poolManager.initialize(subaKey, SQRT_PRICE_1_1);
        console.log("SUBAHook pool initialized. Starting tick:", uint256(uint24(subaTick)));

        vm.stopBroadcast();

        // ── Summary ─────────────────────────────────────────────────────
        console.log("===== POOL DEPLOYMENT COMPLETE =====");
        console.log("Chain:    X Layer Mainnet (196)");
        console.log("Token0:   ", Currency.unwrap(currency0));
        console.log("Token1:   ", Currency.unwrap(currency1));
        console.log("PoolManager:", Constants.POOL_MANAGER);
        console.log("Pools initialized: 5 (one per hook)");
        console.log("====================================");
    }
}
