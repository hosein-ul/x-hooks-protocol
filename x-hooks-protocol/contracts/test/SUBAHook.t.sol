// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {Deployers} from "@uniswap/v4-core/test/utils/Deployers.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {SwapParams, ModifyLiquidityParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {PoolSwapTest} from "@uniswap/v4-core/src/test/PoolSwapTest.sol";
import {MockERC20} from "solmate/src/test/utils/mocks/MockERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {SUBAHook} from "../src/hooks/SUBAHook.sol";

contract SUBAHookTest is Test, Deployers {
    SUBAHook hook;
    PoolKey poolKey;
    PoolId poolId;

    address keeper = makeAddr("keeper");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    uint256 constant EPOCH = 10;

    PoolSwapTest.TestSettings DEFAULT_TS = PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false});

    function setUp() public {
        deployFreshManagerAndRouters();
        (currency0, currency1) = deployMintAndApprove2Currencies();

        address hookAddr = address(
            uint160(type(uint160).max & clearAllHookPermissionsMask) | Hooks.AFTER_INITIALIZE_FLAG
                | Hooks.BEFORE_SWAP_FLAG | Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG
        );
        deployCodeTo("SUBAHook.sol:SUBAHook", abi.encode(manager, EPOCH, keeper), hookAddr);
        hook = SUBAHook(hookAddr);

        (poolKey, poolId) = initPool(currency0, currency1, IHooks(address(hook)), 3000, SQRT_PRICE_1_1);
        modifyLiquidityRouter.modifyLiquidity(
            poolKey, ModifyLiquidityParams(-60_000, 60_000, 1e24, bytes32(0)), ZERO_BYTES
        );

        _fund(alice, 1_000_000 ether);
        _fund(bob, 1_000_000 ether);

        for (uint256 i = 0; i < 2; i++) {
            address a = i == 0 ? alice : bob;
            vm.startPrank(a);
            IERC20(Currency.unwrap(currency0)).approve(address(swapRouter), type(uint256).max);
            IERC20(Currency.unwrap(currency1)).approve(address(swapRouter), type(uint256).max);
            vm.stopPrank();
        }
    }

    function _fund(address to, uint256 amt) internal {
        MockERC20(Currency.unwrap(currency0)).mint(to, amt);
        MockERC20(Currency.unwrap(currency1)).mint(to, amt);
    }

    /// @dev Submit an order by doing a NORMAL swap. The hook intercepts.
    function _submit(address from, bool zeroForOne, int256 amtIn, uint256 minOut) internal {
        vm.prank(from);
        swapRouter.swap(
            poolKey,
            SwapParams({
                zeroForOne: zeroForOne,
                amountSpecified: amtIn,
                sqrtPriceLimitX96: zeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1
            }),
            DEFAULT_TS,
            abi.encode(from, minOut)
        );
    }

    // ---------------------------------------------------------------
    // Tests
    // ---------------------------------------------------------------

    function test_epochZeroStarted() public view {
        SUBAHook.Epoch memory e = hook.getEpoch(poolId, 0);
        assertGt(e.endBlock, block.number);
        assertEq(e.settled, false);
    }

    function test_normalSwapIsBuffered() public {
        // The user calls the NORMAL swap router. Hook captures via mint+delta.
        uint256 amt = 10 ether;
        uint256 aliceT0Before = IERC20(Currency.unwrap(currency0)).balanceOf(alice);
        uint256 aliceT1Before = IERC20(Currency.unwrap(currency1)).balanceOf(alice);
        uint256 mgrT0Before = IERC20(Currency.unwrap(currency0)).balanceOf(address(manager));

        _submit(alice, true, -int256(amt), 0);

        // User paid input; got nothing back yet (it's buffered).
        assertEq(aliceT0Before - IERC20(Currency.unwrap(currency0)).balanceOf(alice), amt, "user paid input");
        assertEq(IERC20(Currency.unwrap(currency1)).balanceOf(alice), aliceT1Before, "no output yet");

        // Tokens reside in PoolManager (settled by router); hook holds 6909 claim.
        assertEq(
            IERC20(Currency.unwrap(currency0)).balanceOf(address(manager)) - mgrT0Before,
            amt,
            "PM holds tokens"
        );
        assertEq(
            manager.balanceOf(address(hook), CurrencyLibrary.toId(currency0)),
            amt,
            "hook holds 6909 claim"
        );
        assertEq(hook.getOrderCount(poolId, 0), 1);
    }

    function test_nonKeeperCannotSettle() public {
        vm.roll(100);
        vm.prank(alice);
        vm.expectRevert(SUBAHook.NotKeeper.selector);
        hook.settleEpoch(poolKey, 0);
    }

    function test_cannotSettleBeforeEpochEnd() public {
        vm.prank(keeper);
        vm.expectRevert(SUBAHook.EpochNotEnded.selector);
        hook.settleEpoch(poolKey, 0);
    }

    function test_twoOpposingOrders_matchAtClearingPrice() public {
        _submit(alice, true, -int256(100 ether), 0);
        _submit(bob, false, -int256(100 ether), 0);

        uint256 aliceT1Before = IERC20(Currency.unwrap(currency1)).balanceOf(alice);
        uint256 bobT0Before = IERC20(Currency.unwrap(currency0)).balanceOf(bob);

        vm.roll(100);
        vm.prank(keeper);
        hook.settleEpoch(poolKey, 0);

        assertEq(
            IERC20(Currency.unwrap(currency1)).balanceOf(alice) - aliceT1Before,
            100 ether,
            "alice got token1 at 1:1"
        );
        assertEq(
            IERC20(Currency.unwrap(currency0)).balanceOf(bob) - bobT0Before,
            100 ether,
            "bob got token0 at 1:1"
        );
        assertEq(hook.getEpoch(poolId, 0).settled, true);
        // All 6909 claims for the epoch should be burned.
        assertEq(manager.balanceOf(address(hook), CurrencyLibrary.toId(currency0)), 0);
        assertEq(manager.balanceOf(address(hook), CurrencyLibrary.toId(currency1)), 0);
    }

    function test_orderFailingSlippage_isRefunded() public {
        // Alice wants 200 token1 out for 100 token0 — impossible at 1:1.
        _submit(alice, true, -int256(100 ether), 200 ether);
        _submit(bob, false, -int256(100 ether), 0);

        uint256 aliceT0Before = IERC20(Currency.unwrap(currency0)).balanceOf(alice);
        uint256 bobT1Before = IERC20(Currency.unwrap(currency1)).balanceOf(bob);

        vm.roll(100);
        vm.prank(keeper);
        hook.settleEpoch(poolKey, 0);

        // Alice fully refunded in token0 (input).
        assertEq(
            IERC20(Currency.unwrap(currency0)).balanceOf(alice) - aliceT0Before,
            100 ether,
            "alice fully refunded"
        );
        // Bob also refunded in token1 since no counterpart.
        assertEq(
            IERC20(Currency.unwrap(currency1)).balanceOf(bob) - bobT1Before,
            100 ether,
            "bob refunded too"
        );
    }

    function test_epochAdvancesAfterSettle() public {
        vm.roll(100);
        vm.prank(keeper);
        hook.settleEpoch(poolKey, 0);
        assertEq(hook.poolCurrentEpoch(poolId), 1);
        SUBAHook.Epoch memory next = hook.getEpoch(poolId, 1);
        assertGt(next.endBlock, block.number);
        assertEq(next.settled, false);
    }

    function test_unevenVolumes_excessRefunded() public {
        // 100 buy vs 50 sell → matched=50, excess buy=50.
        _submit(alice, true, -int256(100 ether), 0);
        _submit(bob, false, -int256(50 ether), 0);

        uint256 aliceT0Before = IERC20(Currency.unwrap(currency0)).balanceOf(alice);
        uint256 aliceT1Before = IERC20(Currency.unwrap(currency1)).balanceOf(alice);

        vm.roll(100);
        vm.prank(keeper);
        hook.settleEpoch(poolKey, 0);

        // Alice receives 50 ether of token1 (fill) + 50 ether of token0 (refund of excess).
        assertEq(IERC20(Currency.unwrap(currency1)).balanceOf(alice) - aliceT1Before, 50 ether);
        assertEq(IERC20(Currency.unwrap(currency0)).balanceOf(alice) - aliceT0Before, 50 ether);
    }

    function test_keeperUpdate_byOwner() public {
        address newKeeper = makeAddr("newKeeper");
        hook.setKeeper(newKeeper);
        assertEq(hook.keeper(), newKeeper);
    }

    function test_keeperUpdate_byNonOwner_reverts() public {
        vm.prank(alice);
        vm.expectRevert(SUBAHook.NotOwner.selector);
        hook.setKeeper(alice);
    }

    function test_cannotDoubleSettle() public {
        vm.roll(100);
        vm.prank(keeper);
        hook.settleEpoch(poolKey, 0);
        vm.prank(keeper);
        vm.expectRevert(SUBAHook.EpochAlreadySettled.selector);
        hook.settleEpoch(poolKey, 0);
    }

    function test_comparison_batchGivesUniformPrice() public {
        // Two same-direction orders → both refunded equally (no opposing volume).
        _submit(alice, true, -int256(100 ether), 0);
        _submit(bob, true, -int256(100 ether), 0);

        uint256 aliceT0Before = IERC20(Currency.unwrap(currency0)).balanceOf(alice);
        uint256 bobT0Before = IERC20(Currency.unwrap(currency0)).balanceOf(bob);

        vm.roll(100);
        vm.prank(keeper);
        hook.settleEpoch(poolKey, 0);

        uint256 aliceRefund = IERC20(Currency.unwrap(currency0)).balanceOf(alice) - aliceT0Before;
        uint256 bobRefund = IERC20(Currency.unwrap(currency0)).balanceOf(bob) - bobT0Before;
        assertEq(aliceRefund, bobRefund, "identical treatment regardless of order");
        assertEq(aliceRefund, 100 ether);
    }
}
