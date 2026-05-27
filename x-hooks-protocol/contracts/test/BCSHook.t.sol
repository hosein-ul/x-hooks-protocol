// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {Deployers} from "@uniswap/v4-core/test/utils/Deployers.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {SwapParams, ModifyLiquidityParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {PoolSwapTest} from "@uniswap/v4-core/src/test/PoolSwapTest.sol";
import {MockERC20} from "solmate/src/test/utils/mocks/MockERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {BCSHook} from "../src/hooks/BCSHook.sol";

contract BCSHookTest is Test, Deployers {
    BCSHook hook;
    PoolKey poolKey;
    PoolId poolId;

    address alice = makeAddr("alice"); // partyA / buyer
    address bob = makeAddr("bob"); // partyB / seller
    address swapper = makeAddr("swapper");

    // SQRT_PRICE_1_1 = 79228162514264337593543950336 (2^96).
    // TRIGGER_NEAR: just below current — even a small swap crosses it.
    // TRIGGER_FAR: far below current — small swap does NOT cross.
    uint160 constant TRIGGER_NEAR = 79228162514264337593543950000;
    uint160 constant TRIGGER_FAR = 70000000000000000000000000000;
    uint160 constant TRIGGER_BELOW = TRIGGER_NEAR;

    function setUp() public {
        deployFreshManagerAndRouters();
        (currency0, currency1) = deployMintAndApprove2Currencies();

        address hookAddr = address(
            uint160(type(uint160).max & clearAllHookPermissionsMask) | Hooks.BEFORE_SWAP_FLAG
        );
        deployCodeTo("BCSHook.sol:BCSHook", abi.encode(manager), hookAddr);
        hook = BCSHook(hookAddr);

        (poolKey, poolId) = initPool(currency0, currency1, IHooks(address(hook)), 3000, SQRT_PRICE_1_1);
        modifyLiquidityRouter.modifyLiquidity(
            poolKey, ModifyLiquidityParams(-60_000, 60_000, 1e24, bytes32(0)), ZERO_BYTES
        );

        _fund(alice, 1_000_000 ether);
        _fund(bob, 1_000_000 ether);
        _fund(swapper, 1_000_000 ether);

        for (uint256 i = 0; i < 3; i++) {
            address a = i == 0 ? alice : i == 1 ? bob : swapper;
            vm.startPrank(a);
            IERC20(Currency.unwrap(currency0)).approve(address(hook), type(uint256).max);
            IERC20(Currency.unwrap(currency1)).approve(address(hook), type(uint256).max);
            IERC20(Currency.unwrap(currency0)).approve(address(swapRouter), type(uint256).max);
            IERC20(Currency.unwrap(currency1)).approve(address(swapRouter), type(uint256).max);
            vm.stopPrank();
        }
    }

    function _fund(address to, uint256 amt) internal {
        MockERC20(Currency.unwrap(currency0)).mint(to, amt);
        MockERC20(Currency.unwrap(currency1)).mint(to, amt);
    }

    function _register(uint160 trigger, uint256 expiry) internal returns (uint256 id) {
        id = hook.registerCommitment(poolKey, alice, bob, 100 ether, 100 ether, trigger, expiry);
    }

    function _bothDeposit(uint256 id) internal {
        vm.prank(alice);
        hook.depositCollateral(id);
        vm.prank(bob);
        hook.depositCollateral(id);
    }

    // ---------------------------------------------------------------
    // Lifecycle
    // ---------------------------------------------------------------
    function test_register_and_bothDeposit_activates() public {
        uint256 id = _register(TRIGGER_BELOW, 1000);
        assertEq(uint8(hook.getCommitment(id).status), uint8(BCSHook.Status.Pending));
        _bothDeposit(id);
        assertEq(uint8(hook.getCommitment(id).status), uint8(BCSHook.Status.Active));
        assertEq(hook.activeCount(poolId), 1);
    }

    function test_register_onlyOneDeposits_staysPending() public {
        uint256 id = _register(TRIGGER_BELOW, 1000);
        vm.prank(alice);
        hook.depositCollateral(id);
        assertEq(uint8(hook.getCommitment(id).status), uint8(BCSHook.Status.Pending));
    }

    function test_doubleDeposit_reverts() public {
        uint256 id = _register(TRIGGER_BELOW, 1000);
        vm.prank(alice);
        hook.depositCollateral(id);
        vm.prank(alice);
        vm.expectRevert(BCSHook.AlreadyDeposited.selector);
        hook.depositCollateral(id);
    }

    function test_invalidExpiry_reverts() public {
        vm.expectRevert(BCSHook.InvalidExpiry.selector);
        hook.registerCommitment(poolKey, alice, bob, 1 ether, 1 ether, TRIGGER_BELOW, block.number);
    }

    function test_nonPartyDeposit_reverts() public {
        uint256 id = _register(TRIGGER_BELOW, 1000);
        vm.prank(swapper);
        vm.expectRevert(BCSHook.NotParty.selector);
        hook.depositCollateral(id);
    }

    // ---------------------------------------------------------------
    // Settlement
    // ---------------------------------------------------------------
    function test_swapNotCrossingTrigger_noSettlement() public {
        // Trigger is far below current — tiny swap won't reach it.
        uint256 id = hook.registerCommitment(poolKey, alice, bob, 100 ether, 100 ether, TRIGGER_FAR, 1000);
        _bothDeposit(id);

        // sqrtPriceLimit set ABOVE trigger so the swap's range never includes
        // the trigger — and current price hasn't moved either.
        vm.prank(swapper);
        swapRouter.swap(
            poolKey,
            SwapParams({zeroForOne: true, amountSpecified: -1e15, sqrtPriceLimitX96: TRIGGER_FAR + 1e26}),
            PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false}),
            ""
        );
        assertEq(uint8(hook.getCommitment(id).status), uint8(BCSHook.Status.Active));
    }

    function test_swapCrossingTrigger_atomicSettlement() public {
        uint256 id = _register(TRIGGER_BELOW, 1000);
        _bothDeposit(id);

        uint256 aliceToken0Before = IERC20(Currency.unwrap(currency0)).balanceOf(alice);
        uint256 bobToken1Before = IERC20(Currency.unwrap(currency1)).balanceOf(bob);

        // Big zeroForOne swap with a price limit BELOW the trigger so the
        // trigger lies between currentPrice and limit, satisfying _trigger.
        vm.prank(swapper);
        swapRouter.swap(
            poolKey,
            SwapParams({zeroForOne: true, amountSpecified: -1e18, sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1}),
            PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false}),
            ""
        );

        assertEq(uint8(hook.getCommitment(id).status), uint8(BCSHook.Status.Settled));
        assertEq(
            IERC20(Currency.unwrap(currency0)).balanceOf(alice) - aliceToken0Before,
            100 ether,
            "alice gets token0"
        );
        assertEq(
            IERC20(Currency.unwrap(currency1)).balanceOf(bob) - bobToken1Before,
            100 ether,
            "bob gets token1"
        );
    }

    function test_expiredCommitment_refundsBothParties() public {
        uint256 id = _register(TRIGGER_BELOW, 50);
        _bothDeposit(id);
        uint256 aliceT1Before = IERC20(Currency.unwrap(currency1)).balanceOf(alice);
        uint256 bobT0Before = IERC20(Currency.unwrap(currency0)).balanceOf(bob);

        vm.roll(100);
        hook.expireCommitment(id);

        assertEq(uint8(hook.getCommitment(id).status), uint8(BCSHook.Status.Expired));
        assertEq(IERC20(Currency.unwrap(currency1)).balanceOf(alice) - aliceT1Before, 100 ether);
        assertEq(IERC20(Currency.unwrap(currency0)).balanceOf(bob) - bobT0Before, 100 ether);
    }

    function test_cancelBeforeActivation_refundsDeposited() public {
        uint256 id = _register(TRIGGER_BELOW, 1000);
        vm.prank(alice);
        hook.depositCollateral(id);

        uint256 aliceT1Before = IERC20(Currency.unwrap(currency1)).balanceOf(alice);
        vm.prank(alice);
        hook.cancelCommitment(id);

        assertEq(uint8(hook.getCommitment(id).status), uint8(BCSHook.Status.Cancelled));
        assertEq(IERC20(Currency.unwrap(currency1)).balanceOf(alice) - aliceT1Before, 100 ether);
    }

    function test_cancelByNonParty_reverts() public {
        uint256 id = _register(TRIGGER_BELOW, 1000);
        vm.prank(swapper);
        vm.expectRevert(BCSHook.NotParty.selector);
        hook.cancelCommitment(id);
    }

    function test_cannotCancelActive() public {
        uint256 id = _register(TRIGGER_BELOW, 1000);
        _bothDeposit(id);
        vm.prank(alice);
        vm.expectRevert(BCSHook.CommitmentNotPending.selector);
        hook.cancelCommitment(id);
    }

    function test_comparison_atomicVsOnChainOTC() public {
        // Without the hook, settling such a bilateral deal would require both
        // parties to trust a third party or each other to send tokens on time.
        // The hook makes the settlement atomic with the trigger price.
        uint256 id = _register(TRIGGER_BELOW, 1000);
        _bothDeposit(id);
        uint256 aliceT0Before = IERC20(Currency.unwrap(currency0)).balanceOf(alice);
        uint256 bobT1Before = IERC20(Currency.unwrap(currency1)).balanceOf(bob);

        vm.prank(swapper);
        swapRouter.swap(
            poolKey,
            SwapParams({zeroForOne: true, amountSpecified: -1e18, sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1}),
            PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false}),
            ""
        );

        // Atomic outcome: both parties hold their counter-token in the same tx.
        assertGt(IERC20(Currency.unwrap(currency0)).balanceOf(alice), aliceT0Before);
        assertGt(IERC20(Currency.unwrap(currency1)).balanceOf(bob), bobT1Before);
        assertEq(uint8(hook.getCommitment(id).status), uint8(BCSHook.Status.Settled));
    }
}
