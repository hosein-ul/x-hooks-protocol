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

import {PLTHook} from "../src/hooks/PLTHook.sol";

contract PLTHookTest is Test, Deployers {
    PLTHook hook;
    PoolKey poolKey;
    PoolId poolId;

    address alice = makeAddr("alice"); // senior LP
    address bob = makeAddr("bob"); // junior LP
    address swapper = makeAddr("swapper");

    // For the 3000 fee pool: fee per swap = amountIn * 3000 / 1_000_000 = 0.3%
    uint256 constant SWAP_AMOUNT = 1000 ether;
    // expectedFee = SWAP_AMOUNT * 3000 / 1_000_000 = 3 ether
    // seniorFee = 3 ether * 70 / 100 = 2.1 ether
    // juniorFee = 3 ether * 30 / 100 = 0.9 ether
    uint256 constant EXPECTED_TOTAL_FEE = 3 ether;
    uint256 constant EXPECTED_SENIOR_FEE = 2.1 ether;
    uint256 constant EXPECTED_JUNIOR_FEE = 0.9 ether;

    PoolSwapTest.TestSettings DEFAULT_TS = PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false});

    // PLTHook flags
    uint160 constant PLT_FLAGS = Hooks.AFTER_INITIALIZE_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG
        | Hooks.BEFORE_REMOVE_LIQUIDITY_FLAG | Hooks.AFTER_SWAP_FLAG;

    function setUp() public {
        deployFreshManagerAndRouters();
        (currency0, currency1) = deployMintAndApprove2Currencies();

        address hookAddr = address(uint160(type(uint160).max & clearAllHookPermissionsMask) | PLT_FLAGS);
        deployCodeTo("PLTHook.sol:PLTHook", abi.encode(manager), hookAddr);
        hook = PLTHook(hookAddr);

        (poolKey, poolId) = initPool(currency0, currency1, IHooks(address(hook)), 3000, SQRT_PRICE_1_1);

        _fund(alice, 1_000_000 ether);
        _fund(bob, 1_000_000 ether);
        _fund(swapper, 1_000_000 ether);

        for (uint256 i = 0; i < 3; i++) {
            address a = i == 0 ? alice : i == 1 ? bob : swapper;
            vm.startPrank(a);
            IERC20(Currency.unwrap(currency0)).approve(address(modifyLiquidityRouter), type(uint256).max);
            IERC20(Currency.unwrap(currency1)).approve(address(modifyLiquidityRouter), type(uint256).max);
            IERC20(Currency.unwrap(currency0)).approve(address(swapRouter), type(uint256).max);
            IERC20(Currency.unwrap(currency1)).approve(address(swapRouter), type(uint256).max);
            vm.stopPrank();
        }
    }

    function _fund(address to, uint256 amt) internal {
        MockERC20(Currency.unwrap(currency0)).mint(to, amt);
        MockERC20(Currency.unwrap(currency1)).mint(to, amt);
    }

    function _addLiquidity(address lp, PLTHook.Tranche tranche, int256 liqDelta) internal {
        vm.prank(lp);
        modifyLiquidityRouter.modifyLiquidity(
            poolKey,
            ModifyLiquidityParams({tickLower: -60_000, tickUpper: 60_000, liquidityDelta: liqDelta, salt: 0}),
            abi.encode(lp, tranche)
        );
    }

    function _removeLiquidity(address lp, int256 liqDelta) internal {
        vm.prank(lp);
        modifyLiquidityRouter.modifyLiquidity(
            poolKey,
            ModifyLiquidityParams({tickLower: -60_000, tickUpper: 60_000, liquidityDelta: liqDelta, salt: 0}),
            abi.encode(lp)
        );
    }

    function _swap(address from, int256 amountSpecified) internal {
        vm.prank(from);
        swapRouter.swap(
            poolKey,
            SwapParams({zeroForOne: true, amountSpecified: amountSpecified, sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1}),
            DEFAULT_TS,
            ""
        );
    }

    // ---------------------------------------------------------------
    // Tests
    // ---------------------------------------------------------------

    function test_afterInitialize_setsInitialized() public view {
        PLTHook.TrancheState memory ts = hook.getTrancheState(poolId);
        assertTrue(ts.initialized, "pool should be initialized");
    }

    function test_addLiquidity_recordsPosition() public {
        int256 liq = 1e18;
        _addLiquidity(alice, PLTHook.Tranche.SENIOR, liq);

        PLTHook.LPPosition memory pos = hook.getPosition(poolId, alice);
        assertTrue(pos.exists);
        assertEq(uint8(pos.tranche), uint8(PLTHook.Tranche.SENIOR));
        assertEq(pos.liquidity, uint128(uint256(liq)));
        assertEq(pos.feeDebt, 0, "feeDebt should be 0 at deposit");
    }

    function test_seniorEarns70pct_juniorEarns30pct() public {
        // Equal liquidity for both
        int256 liq = 1e18;
        _addLiquidity(alice, PLTHook.Tranche.SENIOR, liq);
        _addLiquidity(bob, PLTHook.Tranche.JUNIOR, liq);

        _swap(swapper, -int256(SWAP_AMOUNT));

        uint256 alicePending = hook.pendingFees(poolId, alice);
        uint256 bobPending = hook.pendingFees(poolId, bob);

        // With equal liquidity: senior earns 70% of total, junior earns 30%
        // alicePending / bobPending = 70/30 = 7/3
        // Verify ratio: 3 * alicePending == 7 * bobPending (or close due to integer math)
        assertApproxEqRel(alicePending, EXPECTED_SENIOR_FEE, 1e15, "senior should earn ~2.1 ether fee");
        assertApproxEqRel(bobPending, EXPECTED_JUNIOR_FEE, 1e15, "junior should earn ~0.9 ether fee");

        // Exact ratio: alice/bob = 7/3
        assertEq(alicePending * 3, bobPending * 7, "70/30 fee split");
    }

    function test_twoSeniorLPs_equalLiquidityShareFees() public {
        address alice2 = makeAddr("alice2");
        _fund(alice2, 1_000_000 ether);
        vm.startPrank(alice2);
        IERC20(Currency.unwrap(currency0)).approve(address(modifyLiquidityRouter), type(uint256).max);
        IERC20(Currency.unwrap(currency1)).approve(address(modifyLiquidityRouter), type(uint256).max);
        vm.stopPrank();

        int256 liq = 1e18;
        _addLiquidity(alice, PLTHook.Tranche.SENIOR, liq);
        _addLiquidity(alice2, PLTHook.Tranche.SENIOR, liq);

        _swap(swapper, -int256(SWAP_AMOUNT));

        uint256 alicePending = hook.pendingFees(poolId, alice);
        uint256 alice2Pending = hook.pendingFees(poolId, alice2);

        // Both have equal senior liquidity → equal fees
        assertEq(alicePending, alice2Pending, "equal senior LPs get equal fees");
    }

    function test_feeDebt_preventsDoubleClaiming() public {
        int256 liq = 1e18;
        _addLiquidity(alice, PLTHook.Tranche.SENIOR, liq);
        _addLiquidity(bob, PLTHook.Tranche.JUNIOR, liq);

        // First swap
        _swap(swapper, -int256(SWAP_AMOUNT));
        uint256 pendingAfterSwap1 = hook.pendingFees(poolId, alice);
        assertGt(pendingAfterSwap1, 0, "fees accumulated");

        // Remove liquidity resets feeDebt
        _removeLiquidity(alice, -liq);

        // After removal, snapshot should reset debt
        PLTHook.LPPosition memory pos = hook.getPosition(poolId, alice);
        PLTHook.TrancheState memory ts = hook.getTrancheState(poolId);
        assertEq(pos.feeDebt, ts.feePerShareSenior, "feeDebt reset on removal");
    }

    function test_removal_tracksPendingFees() public {
        int256 liq = 1e18;
        _addLiquidity(alice, PLTHook.Tranche.SENIOR, liq);
        _addLiquidity(bob, PLTHook.Tranche.JUNIOR, liq);

        _swap(swapper, -int256(SWAP_AMOUNT));

        uint256 pendingBefore = hook.pendingFees(poolId, alice);
        assertGt(pendingBefore, 0);

        // Remove liquidity — event is emitted with pending fees
        vm.expectEmit(true, true, false, true, address(hook));
        emit PLTHook.LiquidityRemoved(poolId, alice, pendingBefore);
        _removeLiquidity(alice, -liq);
    }

    function test_trancheTotals_updateCorrectly() public {
        int256 liq = 1e18;
        _addLiquidity(alice, PLTHook.Tranche.SENIOR, liq);
        _addLiquidity(bob, PLTHook.Tranche.JUNIOR, liq);

        PLTHook.TrancheState memory ts = hook.getTrancheState(poolId);
        assertEq(ts.totalSeniorLiquidity, uint128(uint256(liq)));
        assertEq(ts.totalJuniorLiquidity, uint128(uint256(liq)));

        _removeLiquidity(alice, -liq);

        ts = hook.getTrancheState(poolId);
        assertEq(ts.totalSeniorLiquidity, 0, "senior total decremented");
        assertEq(ts.totalJuniorLiquidity, uint128(uint256(liq)), "junior unchanged");
    }

    function test_wrongHookData_reverts() public {
        vm.prank(alice);
        vm.expectRevert(); // V4 wraps hook reverts in HookCallFailed
        modifyLiquidityRouter.modifyLiquidity(
            poolKey,
            ModifyLiquidityParams({tickLower: -60_000, tickUpper: 60_000, liquidityDelta: 1e18, salt: 0}),
            "" // empty hookData — should revert
        );
    }

    function test_seniorMoreFeesPerUnit_thanJunior() public {
        // Senior has 1e18 liquidity, junior has 2e18 liquidity
        // But senior still gets 70% of fees → more per unit than junior
        int256 seniorLiq = 1e18;
        int256 juniorLiq = 2e18;
        _addLiquidity(alice, PLTHook.Tranche.SENIOR, seniorLiq);
        _addLiquidity(bob, PLTHook.Tranche.JUNIOR, juniorLiq);

        _swap(swapper, -int256(SWAP_AMOUNT));

        uint256 alicePending = hook.pendingFees(poolId, alice);
        uint256 bobPending = hook.pendingFees(poolId, bob);

        // alice has 1 unit senior, bob has 2 units junior
        // alice fees per unit = seniorFee * 1e18 / seniorLiq / 1e18 * seniorLiq = seniorFee
        // bob fees per unit = juniorFee * 1e18 / juniorLiq / 1e18 * juniorLiq = juniorFee
        // alice per-unit = 2.1 ether, bob per-unit = 0.9 ether / 2 = 0.45 ether
        // alice total pending = 2.1 ether, bob total pending = 0.9 ether
        assertGt(alicePending, bobPending, "senior gets more total fees");

        // Per-unit comparison: alice/seniorLiq > bob/juniorLiq
        uint256 alicePerUnit = alicePending * 1e18 / uint128(uint256(seniorLiq));
        uint256 bobPerUnit = bobPending * 1e18 / uint128(uint256(juniorLiq));
        assertGt(alicePerUnit, bobPerUnit, "senior LP earns more per unit of liquidity");
    }
}
