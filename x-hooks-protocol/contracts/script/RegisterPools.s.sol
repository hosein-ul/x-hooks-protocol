// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {HookRegistry} from "../src/HookRegistry.sol";
import {Constants} from "./base/Constants.sol";

/// @notice Link deployed pools to their hooks in the HookRegistry and record
/// swap interactions so the dashboard shows live on-chain stats.
contract RegisterPools is Script {
    using PoolIdLibrary for PoolKey;

    address constant HOOK_REGISTRY = 0xeBc902Cee74345DD23f63E2f132f81E5fBE1D56D;
    address constant XHKA = 0xE26b32C27E39a736325E5D89366104425b8EF6EF;
    address constant XHKB = 0x8199bFf13918c270ced3df9776862663b7c952e3;
    address constant OFA_HOOK  = 0x955523a8eD7999e05015bC6F7b854D447717c088;
    address constant BCS_HOOK  = 0xb7128F16104e6DD0DCe6f89dfBf733440E7F8080;
    address constant PLT_HOOK  = 0xb4313ADd866F4E30F22751F9Ccf2C526839eda40;
    address constant SUBA_HOOK = 0xD8b747E0e895eD02FbDac6378A9548368374d088;
    address constant CAL_HOOK  = 0x3F26eF2279a0FfbBdC8270198106633008d78088;

    uint24  constant FEE          = 3000;
    int24   constant TICK_SPACING = 60;

    function run() external {
        require(block.chainid == Constants.X_LAYER_CHAIN_ID, "Must run on X Layer Mainnet");

        // currency0 < currency1 by address sort.
        (address t0, address t1) = XHKA < XHKB ? (XHKA, XHKB) : (XHKB, XHKA);
        Currency c0 = Currency.wrap(t0);
        Currency c1 = Currency.wrap(t1);

        HookRegistry registry = HookRegistry(HOOK_REGISTRY);

        vm.startBroadcast();

        _linkAndRecord(registry, c0, c1, OFA_HOOK,  "XHKB/XHKA OFAHook Pool");
        _linkAndRecord(registry, c0, c1, BCS_HOOK,  "XHKB/XHKA BCSHook Pool");
        _linkAndRecord(registry, c0, c1, PLT_HOOK,  "XHKB/XHKA PLTHook Pool");
        _linkAndRecord(registry, c0, c1, SUBA_HOOK, "XHKB/XHKA SUBAHook Pool");
        _linkAndRecord(registry, c0, c1, CAL_HOOK,  "XHKB/XHKA CALHook Pool");

        vm.stopBroadcast();

        console.log("===== REGISTRY UPDATE COMPLETE =====");
        console.log("Pools linked and interactions recorded.");
        console.log("Pool count:", registry.getPoolCount());
        console.log("====================================");
    }

    function _linkAndRecord(
        HookRegistry registry,
        Currency c0,
        Currency c1,
        address hookAddr,
        string memory label
    ) internal {
        PoolKey memory key = PoolKey({
            currency0: c0,
            currency1: c1,
            fee: FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(hookAddr)
        });

        bytes32 poolId = PoolId.unwrap(key.toId());
        registry.linkPool(poolId, hookAddr, label);
        registry.recordInteraction(hookAddr);

        console.log(string.concat("Linked + interaction: ", label));
        console.log("  poolId:", vm.toString(poolId));
    }
}
