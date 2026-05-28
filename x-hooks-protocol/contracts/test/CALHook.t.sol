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

import {CALHook} from "../src/hooks/CALHook.sol";

contract CALHookTest is Test, Deployers {
    CALHook hook;
    PoolKey poolKey;
    PoolId poolId;

    address alice = makeAddr("alice"); // commitment owner
    address swapper = makeAddr("swapper");

    // SQRT_PRICE_1_1 = 79228162514264337593543950336 (≈ price = 1.0 token1 per token0)
    // TRIGGER_BELOW: a price slightly below current — will be crossed by a zeroForOne swap
    uint160 constant TRIGGER_BELOW = 79000000000000000000000000000; // slightly < SQRT_PRICE_1_1
    // TRIGGER_ABOVE: a price slightly above current — will be crossed by a !zeroForOne swap
    uint160 constant TRIGGER_ABOVE = 80000000000000000000000000000; // slightly > SQRT_PRICE_1_1

    uint256 constant COLLATERAL_AMOUNT = 100 ether;

    PoolSwapTest.TestSettings DEFAULT_TS = PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false});

    uint160 constant CAL_FLAGS = Hooks.BEFORE_SWAP_FLAG | Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG;

    function setUp() public {
        deployFreshManagerAndRouters();
        (currency0, currency1) = deployMintAndApprove2Currencies();

        address hookAddr = address(uint160(type(uint160).max & clearAllHookPermissionsMask) | CAL_FLAGS);
        deployCodeTo("CALHook.sol:CALHook", abi.encode(manager), hookAddr);
        hook = CALHook(hookAddr);

        (poolKey, poolId) = initPool(currency0, currency1, IHooks(address(hook)), 3000, SQRT_PRICE_1_1);
        modifyLiquidityRouter.modifyLiquidity(
            poolKey, ModifyLiquidityParams(-60_000, 60_000, 1e24, bytes32(0)), ZERO_BYTES
        );

        _fund(alice, 1_000_000 ether);
        _fund(swapper, 1_000_000 ether);

        vm.startPrank(alice);
        IERC20(Currency.unwrap(currency0)).approve(address(hook), type(uint256).max);
        IERC20(Currency.unwrap(currency1)).approve(address(hook), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(swapper);
        IERC20(Currency.unwrap(currency0)).approve(address(swapRouter), type(uint256).max);
        IERC20(Currency.unwrap(currency1)).approve(address(swapRouter), type(uint256).max);
        vm.stopPrank();
    }

    function _fund(address to, uint256 amt) internal {
        MockERC20(Currency.unwrap(currency0)).mint(to, amt);
        MockERC20(Currency.unwrap(currency1)).mint(to, amt);
    }

    function _createBuyCommitment() internal returns (uint256 id) {
        vm.prank(alice);
        id = hook.createCommitment(poolKey, CALHook.Direction.BUY, TRIGGER_BELOW, block.number + 1000, COLLATERAL_AMOUNT);
    }

    function _createSellCommitment() internal returns (uint256 id) {
        vm.prank(alice);
        id = hook.createCommitment(poolKey, CALHook.Direction.SELL, TRIGGER_ABOVE, block.number + 1000, COLLATERAL_AMOUNT);
    }

    // ZeroforOne swap that crosses BELOW the trigger (price drops).
    // Must be large enough that specifiedDelta (≈ COLLATERAL_AMOUNT at ~1:1) ≤ amountIn.
    function _swapZeroForOne() internal {
        vm.prank(swapper);
        swapRouter.swap(
            poolKey,
            SwapParams({
                zeroForOne: true,
                amountSpecified: -1000 ether, // large enough to cover COLLATERAL_AMOUNT output
                sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
            }),
            DEFAULT_TS,
            ""
        );
    }

    // !zeroForOne swap that crosses ABOVE the trigger (price rises).
    function _swapOneForZero() internal {
        vm.prank(swapper);
        swapRouter.swap(
            poolKey,
            SwapParams({
                zeroForOne: false,
                amountSpecified: -1000 ether,
                sqrtPriceLimitX96: TickMath.MAX_SQRT_PRICE - 1
            }),
            DEFAULT_TS,
            ""
        );
    }

    // ---------------------------------------------------------------
    // Tests
    // ---------------------------------------------------------------

    function test_createCommitment_locksCollateral() public {
        uint256 aliceT1Before = IERC20(Currency.unwrap(currency1)).balanceOf(alice);
        uint256 hookT1Before = IERC20(Currency.unwrap(currency1)).balanceOf(address(hook));

        uint256 id = _createBuyCommitment();

        // Alice's token1 transferred to hook
        assertEq(aliceT1Before - IERC20(Currency.unwrap(currency1)).balanceOf(alice), COLLATERAL_AMOUNT);
        assertEq(IERC20(Currency.unwrap(currency1)).balanceOf(address(hook)) - hookT1Before, COLLATERAL_AMOUNT);

        // Commitment recorded
        CALHook.Commitment memory c = hook.getCommitment(id);
        assertEq(c.owner, alice);
        assertEq(c.collateralAmount, COLLATERAL_AMOUNT);
        assertEq(uint8(c.status), uint8(CALHook.CommitmentStatus.Active));
        assertEq(uint8(c.direction), uint8(CALHook.Direction.BUY));

        // Stats
        assertEq(hook.totalCollateralLocked(), COLLATERAL_AMOUNT);
        assertEq(hook.activeCount(poolId), 1);
    }

    function test_createCommitment_emitsEvent() public {
        vm.prank(alice);
        vm.expectEmit(false, true, false, true, address(hook));
        emit CALHook.CommitmentCreated(
            1, alice, poolId, CALHook.Direction.BUY, TRIGGER_BELOW, COLLATERAL_AMOUNT
        );
        hook.createCommitment(poolKey, CALHook.Direction.BUY, TRIGGER_BELOW, block.number + 1000, COLLATERAL_AMOUNT);
    }

    function test_swapNotCrossingTrigger_commitmentUntouched() public {
        uint256 id = _createBuyCommitment();

        // Swap zeroForOne but with price limit ABOVE the trigger → won't cross trigger
        vm.prank(swapper);
        swapRouter.swap(
            poolKey,
            SwapParams({
                zeroForOne: true,
                amountSpecified: -1e15, // tiny swap
                sqrtPriceLimitX96: TRIGGER_BELOW + 1 // limit above trigger
            }),
            DEFAULT_TS,
            ""
        );

        CALHook.Commitment memory c = hook.getCommitment(id);
        assertEq(uint8(c.status), uint8(CALHook.CommitmentStatus.Active), "commitment untouched");
        assertEq(hook.activeCount(poolId), 1);
    }

    function test_swapCrossingTrigger_buyCommitmentExecutes() public {
        uint256 id = _createBuyCommitment();
        uint256 aliceT0Before = IERC20(Currency.unwrap(currency0)).balanceOf(alice);

        // Swap that crosses below TRIGGER_BELOW (zeroForOne, price drops)
        _swapZeroForOne();

        CALHook.Commitment memory c = hook.getCommitment(id);
        assertEq(uint8(c.status), uint8(CALHook.CommitmentStatus.Executed), "commitment executed");

        // Alice received token0 (bought with her token1 collateral)
        uint256 aliceT0After = IERC20(Currency.unwrap(currency0)).balanceOf(alice);
        assertGt(aliceT0After, aliceT0Before, "alice received token0");

        assertEq(hook.totalExecuted(), 1, "totalExecuted incremented");
        assertEq(hook.totalCollateralLocked(), 0, "collateral unlocked");
        assertEq(hook.activeCount(poolId), 0, "active list cleared");
    }

    function test_swapCrossingTrigger_sellCommitmentExecutes() public {
        uint256 id = _createSellCommitment();
        uint256 aliceT1Before = IERC20(Currency.unwrap(currency1)).balanceOf(alice);

        // Swap that crosses above TRIGGER_ABOVE (!zeroForOne, price rises)
        _swapOneForZero();

        CALHook.Commitment memory c = hook.getCommitment(id);
        assertEq(uint8(c.status), uint8(CALHook.CommitmentStatus.Executed), "sell commitment executed");

        // Alice received token1 (sold her token0 collateral)
        uint256 aliceT1After = IERC20(Currency.unwrap(currency1)).balanceOf(alice);
        assertGt(aliceT1After, aliceT1Before, "alice received token1");
    }

    function test_expiredCommitment_autoRefundedOnSwap() public {
        uint256 id = _createBuyCommitment();
        uint256 aliceT1Before = IERC20(Currency.unwrap(currency1)).balanceOf(alice);

        // Fast-forward past expiry
        vm.roll(block.number + 2000);

        // Any swap triggers the expiry refund
        _swapZeroForOne();

        CALHook.Commitment memory c = hook.getCommitment(id);
        assertEq(uint8(c.status), uint8(CALHook.CommitmentStatus.Expired));

        // Alice's collateral was refunded
        uint256 aliceT1After = IERC20(Currency.unwrap(currency1)).balanceOf(alice);
        assertEq(aliceT1After - aliceT1Before, COLLATERAL_AMOUNT, "collateral refunded");
        assertEq(hook.totalCollateralLocked(), 0);
    }

    function test_cancelCommitment_fullRefund() public {
        uint256 id = _createBuyCommitment();
        uint256 aliceT1Before = IERC20(Currency.unwrap(currency1)).balanceOf(alice);

        vm.prank(alice);
        hook.cancelCommitment(id);

        CALHook.Commitment memory c = hook.getCommitment(id);
        assertEq(uint8(c.status), uint8(CALHook.CommitmentStatus.Cancelled));
        assertEq(IERC20(Currency.unwrap(currency1)).balanceOf(alice) - aliceT1Before, COLLATERAL_AMOUNT);
        assertEq(hook.totalCollateralLocked(), 0);
    }

    function test_cancelByNonOwner_reverts() public {
        _createBuyCommitment();
        vm.prank(swapper);
        vm.expectRevert(CALHook.NotOwner.selector);
        hook.cancelCommitment(1);
    }

    function test_cancelExecuted_reverts() public {
        _createBuyCommitment();
        _swapZeroForOne();
        vm.prank(alice);
        vm.expectRevert(CALHook.CommitmentAlreadyExecuted.selector);
        hook.cancelCommitment(1);
    }

    function test_stats_updateCorrectly() public {
        _createBuyCommitment();
        _createBuyCommitment(); // second commitment

        assertEq(hook.totalCollateralLocked(), COLLATERAL_AMOUNT * 2);

        _swapZeroForOne();

        assertEq(hook.totalExecuted(), 2);
        assertEq(hook.totalCollateralLocked(), 0);
    }
}
