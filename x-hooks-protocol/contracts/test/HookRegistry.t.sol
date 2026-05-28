// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {HookRegistry} from "../src/HookRegistry.sol";

contract HookRegistryTest is Test {
    HookRegistry registry;

    address owner = makeAddr("owner");
    address alice = makeAddr("alice");
    address hookA = makeAddr("hookA");
    address hookB = makeAddr("hookB");

    bytes32[] emptyFlags;

    function setUp() public {
        vm.prank(owner);
        registry = new HookRegistry();
    }

    function _register(address hook, HookRegistry.HookType hookType) internal {
        registry.registerHook(hook, hookType, "TestHook", "A test hook", "1.0.0", emptyFlags);
    }

    // ---------------------------------------------------------------
    // Tests
    // ---------------------------------------------------------------

    function test_registerHook_appearsInGetAllHooks() public {
        _register(hookA, HookRegistry.HookType.ORDERFLOW_AUCTION);

        address[] memory all = registry.getAllHooks();
        assertEq(all.length, 1);
        assertEq(all[0], hookA);
        assertEq(registry.getHookCount(), 1);
    }

    function test_registerHook_setsInfo() public {
        _register(hookA, HookRegistry.HookType.BILATERAL_COMMITMENT);

        HookRegistry.HookInfo memory info = registry.getHookInfo(hookA);
        assertEq(info.hookAddress, hookA);
        assertEq(uint8(info.hookType), uint8(HookRegistry.HookType.BILATERAL_COMMITMENT));
        assertEq(info.name, "TestHook");
        assertEq(info.deployer, address(this));
        assertEq(info.deployedAt, block.number);
        assertTrue(info.isActive);
        assertFalse(info.isVerified);
        assertEq(info.totalInteractions, 0);
        assertEq(info.totalPoolsUsing, 0);
    }

    function test_duplicateRegister_reverts() public {
        _register(hookA, HookRegistry.HookType.ORDERFLOW_AUCTION);
        vm.expectRevert(HookRegistry.HookAlreadyRegistered.selector);
        _register(hookA, HookRegistry.HookType.ORDERFLOW_AUCTION);
    }

    function test_linkPool_incrementsTotalPoolsUsing() public {
        _register(hookA, HookRegistry.HookType.BATCH_AUCTION);
        bytes32 pid = keccak256("pool1");

        registry.linkPool(pid, hookA, "test pool");

        HookRegistry.HookInfo memory info = registry.getHookInfo(hookA);
        assertEq(info.totalPoolsUsing, 1);

        bytes32[] memory pools = registry.getHookPools(hookA);
        assertEq(pools.length, 1);
        assertEq(pools[0], pid);
    }

    function test_linkMultiplePools_getPoolCount() public {
        _register(hookA, HookRegistry.HookType.ORDERFLOW_AUCTION);
        _register(hookB, HookRegistry.HookType.BILATERAL_COMMITMENT);

        registry.linkPool(keccak256("p1"), hookA, "");
        registry.linkPool(keccak256("p2"), hookA, "");
        registry.linkPool(keccak256("p3"), hookB, "");

        assertEq(registry.getPoolCount(), 3);
    }

    function test_recordInteraction_incrementsCounter() public {
        _register(hookA, HookRegistry.HookType.COMMITMENTS_AS_LIQUIDITY);

        registry.recordInteraction(hookA);
        registry.recordInteraction(hookA);
        registry.recordInteraction(hookA);

        HookRegistry.HookInfo memory info = registry.getHookInfo(hookA);
        assertEq(info.totalInteractions, 3);
    }

    function test_verifyHook_onlyOwner() public {
        _register(hookA, HookRegistry.HookType.LIQUIDITY_TRANCHING);

        vm.prank(owner);
        registry.verifyHook(hookA);

        assertTrue(registry.getHookInfo(hookA).isVerified);
    }

    function test_verifyHook_nonOwnerReverts() public {
        _register(hookA, HookRegistry.HookType.LIQUIDITY_TRANCHING);

        vm.prank(alice);
        vm.expectRevert(HookRegistry.NotOwner.selector);
        registry.verifyHook(hookA);
    }

    function test_deactivateHook_onlyOwner() public {
        _register(hookA, HookRegistry.HookType.ORDERFLOW_AUCTION);

        vm.prank(owner);
        registry.deactivateHook(hookA);

        assertFalse(registry.getHookInfo(hookA).isActive);
    }

    function test_deactivateHook_nonOwnerReverts() public {
        _register(hookA, HookRegistry.HookType.ORDERFLOW_AUCTION);

        vm.prank(alice);
        vm.expectRevert(HookRegistry.NotOwner.selector);
        registry.deactivateHook(hookA);
    }

    function test_getHooksByType_filtersCorrectly() public {
        _register(hookA, HookRegistry.HookType.ORDERFLOW_AUCTION);
        _register(hookB, HookRegistry.HookType.BATCH_AUCTION);
        address hookC = makeAddr("hookC");
        registry.registerHook(hookC, HookRegistry.HookType.ORDERFLOW_AUCTION, "C", "", "1.0", emptyFlags);

        address[] memory ofa = registry.getHooksByType(HookRegistry.HookType.ORDERFLOW_AUCTION);
        assertEq(ofa.length, 2);

        address[] memory batch = registry.getHooksByType(HookRegistry.HookType.BATCH_AUCTION);
        assertEq(batch.length, 1);
        assertEq(batch[0], hookB);
    }

    function test_isRegistered() public {
        assertFalse(registry.isRegistered(hookA));
        _register(hookA, HookRegistry.HookType.ORDERFLOW_AUCTION);
        assertTrue(registry.isRegistered(hookA));
    }
}
