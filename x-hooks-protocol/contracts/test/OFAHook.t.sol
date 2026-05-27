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

import {OFAHook} from "../src/hooks/OFAHook.sol";

contract OFAHookTest is Test, Deployers {
    OFAHook hook;
    PoolKey poolKey;

    address user = makeAddr("user");
    address solverA = makeAddr("solverA");
    address solverB = makeAddr("solverB");

    uint256 constant THRESHOLD = 1000e18;
    uint256 constant DURATION = 5;

    function setUp() public {
        deployFreshManagerAndRouters();
        (currency0, currency1) = deployMintAndApprove2Currencies();

        // Mine an address with the required permission flags via deployCodeTo.
        address hookAddr = address(
            uint160(type(uint160).max & clearAllHookPermissionsMask)
                | Hooks.BEFORE_SWAP_FLAG | Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG
        );
        deployCodeTo("OFAHook.sol:OFAHook", abi.encode(manager, THRESHOLD, DURATION), hookAddr);
        hook = OFAHook(hookAddr);

        (poolKey,) = initPool(currency0, currency1, IHooks(address(hook)), 3000, SQRT_PRICE_1_1);
        // Seed the pool with liquidity so AMM path quotes make sense.
        modifyLiquidityRouter.modifyLiquidity(poolKey, LIQUIDITY_PARAMS, ZERO_BYTES);
        // Add a large position so that big swaps have depth.
        modifyLiquidityRouter.modifyLiquidity(
            poolKey,
            _liqParams(-60_000, 60_000, 1e24),
            ZERO_BYTES
        );

        _fund(user, 10_000 ether);
        _fund(solverA, 10_000 ether);
        _fund(solverB, 10_000 ether);

        // Users / solvers approve hook to move their funds.
        vm.startPrank(user);
        IERC20(Currency.unwrap(currency0)).approve(address(hook), type(uint256).max);
        IERC20(Currency.unwrap(currency1)).approve(address(hook), type(uint256).max);
        IERC20(Currency.unwrap(currency0)).approve(address(swapRouter), type(uint256).max);
        IERC20(Currency.unwrap(currency1)).approve(address(swapRouter), type(uint256).max);
        vm.stopPrank();

        for (uint256 i = 0; i < 2; i++) {
            address s = i == 0 ? solverA : solverB;
            vm.startPrank(s);
            IERC20(Currency.unwrap(currency0)).approve(address(hook), type(uint256).max);
            IERC20(Currency.unwrap(currency1)).approve(address(hook), type(uint256).max);
            vm.stopPrank();
        }
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------
    function _liqParams(int24 lo, int24 hi, int256 delta)
        internal
        pure
        returns (ModifyLiquidityParams memory p)
    {
        p = ModifyLiquidityParams({tickLower: lo, tickUpper: hi, liquidityDelta: delta, salt: bytes32(0)});
    }

    function _fund(address to, uint256 amt) internal {
        MockERC20(Currency.unwrap(currency0)).mint(to, amt);
        MockERC20(Currency.unwrap(currency1)).mint(to, amt);
    }

    function _largeRequest(address from) internal returns (uint256 auctionId) {
        vm.prank(from);
        auctionId = hook.requestAuctionSwap(
            poolKey,
            true,
            THRESHOLD,
            TickMath.MIN_SQRT_PRICE + 1
        );
    }

    // ---------------------------------------------------------------
    // Tests
    // ---------------------------------------------------------------

    function test_smallSwap_bypassesAuction() public {
        // Small swap goes through PM/AMM directly.
        uint256 balBefore = IERC20(Currency.unwrap(currency1)).balanceOf(user);
        vm.prank(user);
        swapRouter.swap(
            poolKey,
            SwapParams({zeroForOne: true, amountSpecified: -1e18, sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1}),
            PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false}),
            ""
        );
        uint256 balAfter = IERC20(Currency.unwrap(currency1)).balanceOf(user);
        assertGt(balAfter, balBefore, "user should have received tokenOut");
    }

    function test_largeSwapThroughPM_reverts() public {
        vm.prank(user);
        vm.expectRevert();
        swapRouter.swap(
            poolKey,
            SwapParams({
                zeroForOne: true,
                amountSpecified: -int256(THRESHOLD),
                sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
            }),
            PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false}),
            ""
        );
    }

    function test_largeSwap_createsAuction() public {
        uint256 id = _largeRequest(user);
        OFAHook.PendingAuction memory a = hook.getAuction(id);
        assertEq(a.user, user);
        assertEq(a.amountIn, THRESHOLD);
        assertEq(uint8(a.status), uint8(OFAHook.AuctionStatus.Open));
        assertEq(a.endBlock, block.number + DURATION);
        assertEq(a.ammFloor, (THRESHOLD * 99) / 100);
    }

    function test_belowThreshold_request_reverts() public {
        vm.prank(user);
        vm.expectRevert(OFAHook.InvalidAmount.selector);
        hook.requestAuctionSwap(poolKey, true, THRESHOLD - 1, TickMath.MIN_SQRT_PRICE + 1);
    }

    function test_solverCannotBidBelowFloor() public {
        uint256 id = _largeRequest(user);
        uint256 floor = hook.getAuction(id).ammFloor;
        vm.prank(solverA);
        vm.expectRevert(OFAHook.BidBelowFloor.selector);
        hook.submitBid(id, floor - 1);
    }

    function test_bidNotBetter_reverts() public {
        uint256 id = _largeRequest(user);
        uint256 floor = hook.getAuction(id).ammFloor;
        vm.prank(solverA);
        hook.submitBid(id, floor + 10);
        vm.prank(solverB);
        vm.expectRevert(OFAHook.BidNotBetter.selector);
        hook.submitBid(id, floor + 10);
    }

    function test_duplicateBidFromSameSolver_reverts() public {
        uint256 id = _largeRequest(user);
        uint256 floor = hook.getAuction(id).ammFloor;
        vm.prank(solverA);
        hook.submitBid(id, floor + 10);
        vm.prank(solverA);
        vm.expectRevert(OFAHook.DuplicateBidder.selector);
        hook.submitBid(id, floor + 20);
    }

    function test_cannotSettleBeforeEndBlock() public {
        uint256 id = _largeRequest(user);
        vm.prank(solverA);
        hook.submitBid(id, hook.getAuction(id).ammFloor + 1);
        vm.expectRevert(OFAHook.AuctionStillOpen.selector);
        hook.settleAuction(id);
    }

    function test_settle_solverWins_userReceivesMoreThanAmm() public {
        uint256 id = _largeRequest(user);
        uint256 floor = hook.getAuction(id).ammFloor;
        // Solver offers strictly more than the AMM floor.
        uint256 bid = floor + 50e18;
        vm.prank(solverA);
        hook.submitBid(id, bid);

        vm.roll(block.number + DURATION + 1);
        uint256 balBefore = IERC20(Currency.unwrap(currency1)).balanceOf(user);
        hook.settleAuction(id);
        uint256 balAfter = IERC20(Currency.unwrap(currency1)).balanceOf(user);
        assertEq(balAfter - balBefore, bid, "user receives solver bid");
        assertGt(balAfter - balBefore, floor, "better than AMM floor");
        assertEq(uint8(hook.getAuction(id).status), uint8(OFAHook.AuctionStatus.Settled));
    }

    function test_settle_noBids_ammFallback() public {
        uint256 id = _largeRequest(user);
        vm.roll(block.number + DURATION + 1);
        uint256 balBefore = IERC20(Currency.unwrap(currency1)).balanceOf(user);
        hook.settleAuction(id);
        uint256 balAfter = IERC20(Currency.unwrap(currency1)).balanceOf(user);
        assertGt(balAfter, balBefore, "user got AMM output");
        assertEq(uint8(hook.getAuction(id).status), uint8(OFAHook.AuctionStatus.Settled));
    }

    function test_cannotSettleTwice() public {
        uint256 id = _largeRequest(user);
        vm.roll(block.number + DURATION + 1);
        hook.settleAuction(id);
        vm.expectRevert(OFAHook.AuctionNotFound.selector);
        hook.settleAuction(id);
    }

    function test_comparison_hookGivesUserMore() public {
        // Establish AMM-only output by running a second user without the hook
        // (we use the AMM fallback as the baseline since the hook gates large swaps).
        uint256 id1 = _largeRequest(user);
        vm.roll(block.number + DURATION + 1);
        uint256 balBeforeAmm = IERC20(Currency.unwrap(currency1)).balanceOf(user);
        hook.settleAuction(id1);
        uint256 ammOut = IERC20(Currency.unwrap(currency1)).balanceOf(user) - balBeforeAmm;

        // Now route through a winning solver path.
        vm.roll(block.number + 1);
        vm.prank(user);
        uint256 id2 = hook.requestAuctionSwap(poolKey, true, THRESHOLD, TickMath.MIN_SQRT_PRICE + 1);
        uint256 betterPrice = (THRESHOLD * 999) / 1000; // 99.9% — strictly above 99% floor
        vm.prank(solverA);
        hook.submitBid(id2, betterPrice);
        vm.roll(100);
        uint256 balBeforeSolver = IERC20(Currency.unwrap(currency1)).balanceOf(user);
        hook.settleAuction(id2);
        uint256 solverOut = IERC20(Currency.unwrap(currency1)).balanceOf(user) - balBeforeSolver;

        assertGt(solverOut, ammOut, "solver-filled order should beat AMM");
    }
}

