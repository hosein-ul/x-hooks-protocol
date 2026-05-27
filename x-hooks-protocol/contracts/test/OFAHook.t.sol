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

import {OFAHook} from "../src/hooks/OFAHook.sol";

contract OFAHookTest is Test, Deployers {
    OFAHook hook;
    PoolKey poolKey;

    address user = makeAddr("user");
    address solverA = makeAddr("solverA");
    address solverB = makeAddr("solverB");

    uint256 constant THRESHOLD = 1000e18;
    uint256 constant DURATION = 5;

    PoolSwapTest.TestSettings DEFAULT_TS = PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false});

    function setUp() public {
        deployFreshManagerAndRouters();
        (currency0, currency1) = deployMintAndApprove2Currencies();

        address hookAddr = address(
            uint160(type(uint160).max & clearAllHookPermissionsMask) | Hooks.BEFORE_SWAP_FLAG
                | Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG
        );
        deployCodeTo("OFAHook.sol:OFAHook", abi.encode(manager, THRESHOLD, DURATION), hookAddr);
        hook = OFAHook(hookAddr);

        (poolKey,) = initPool(currency0, currency1, IHooks(address(hook)), 3000, SQRT_PRICE_1_1);
        modifyLiquidityRouter.modifyLiquidity(poolKey, LIQUIDITY_PARAMS, ZERO_BYTES);
        modifyLiquidityRouter.modifyLiquidity(
            poolKey, ModifyLiquidityParams(-60_000, 60_000, 1e24, bytes32(0)), ZERO_BYTES
        );

        _fund(user, 10_000 ether);
        _fund(solverA, 10_000 ether);
        _fund(solverB, 10_000 ether);

        vm.startPrank(user);
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

    function _fund(address to, uint256 amt) internal {
        MockERC20(Currency.unwrap(currency0)).mint(to, amt);
        MockERC20(Currency.unwrap(currency1)).mint(to, amt);
    }

    /// @dev Trigger a swap through the standard router. The hook decides
    /// (via beforeSwap) whether to pass through or capture into auction.
    function _swap(address from, int256 amountSpecified) internal {
        vm.prank(from);
        swapRouter.swap(
            poolKey,
            SwapParams({zeroForOne: true, amountSpecified: amountSpecified, sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1}),
            DEFAULT_TS,
            abi.encode(from) // hookData = original swapper address
        );
    }

    /// @dev Trigger a large swap that gets routed into the auction.
    function _largeSwap(address from) internal returns (uint256 auctionId) {
        uint256 idBefore = hook.nextAuctionId();
        _swap(from, -int256(THRESHOLD));
        auctionId = idBefore;
    }

    // ---------------------------------------------------------------
    // Tests
    // ---------------------------------------------------------------

    function test_smallSwap_bypassesAuction() public {
        // Small swap goes through PM/AMM directly — no auction created.
        uint256 idBefore = hook.nextAuctionId();
        uint256 balBefore = IERC20(Currency.unwrap(currency1)).balanceOf(user);
        _swap(user, -1e18);
        uint256 balAfter = IERC20(Currency.unwrap(currency1)).balanceOf(user);
        assertGt(balAfter, balBefore, "user should have received tokenOut");
        assertEq(hook.nextAuctionId(), idBefore, "no auction created");
    }

    function test_largeSwapThroughRouter_createsAuction_transparent() public {
        // The user calls the NORMAL router. The hook transparently captures.
        uint256 idBefore = hook.nextAuctionId();
        uint256 userT0Before = IERC20(Currency.unwrap(currency0)).balanceOf(user);

        _swap(user, -int256(THRESHOLD));

        // Auction was created without the user calling hook directly.
        assertEq(hook.nextAuctionId(), idBefore + 1, "auction created");
        OFAHook.PendingAuction memory a = hook.getAuction(idBefore);
        assertEq(a.user, user);
        assertEq(a.amountIn, THRESHOLD);
        assertEq(uint8(a.status), uint8(OFAHook.AuctionStatus.Open));

        // User paid input tokens (router settled with PM).
        assertEq(userT0Before - IERC20(Currency.unwrap(currency0)).balanceOf(user), THRESHOLD, "user paid input");

        // Hook holds ERC-6909 claim for the input in PoolManager.
        uint256 claim = manager.balanceOf(address(hook), CurrencyLibrary.toId(currency0));
        assertEq(claim, THRESHOLD, "hook custodies via 6909");
    }

    function test_largeSwap_createsAuctionWithCorrectState() public {
        uint256 id = _largeSwap(user);
        OFAHook.PendingAuction memory a = hook.getAuction(id);
        assertEq(a.user, user);
        assertEq(a.amountIn, THRESHOLD);
        assertEq(uint8(a.status), uint8(OFAHook.AuctionStatus.Open));
        assertEq(a.endBlock, block.number + DURATION);
        assertEq(a.ammFloor, (THRESHOLD * 99) / 100);
    }

    function test_solverCannotBidBelowFloor() public {
        uint256 id = _largeSwap(user);
        uint256 floor = hook.getAuction(id).ammFloor;
        vm.prank(solverA);
        vm.expectRevert(OFAHook.BidBelowFloor.selector);
        hook.submitBid(id, floor - 1);
    }

    function test_bidNotBetter_reverts() public {
        uint256 id = _largeSwap(user);
        uint256 floor = hook.getAuction(id).ammFloor;
        vm.prank(solverA);
        hook.submitBid(id, floor + 10);
        vm.prank(solverB);
        vm.expectRevert(OFAHook.BidNotBetter.selector);
        hook.submitBid(id, floor + 10);
    }

    function test_duplicateBidFromSameSolver_reverts() public {
        uint256 id = _largeSwap(user);
        uint256 floor = hook.getAuction(id).ammFloor;
        vm.prank(solverA);
        hook.submitBid(id, floor + 10);
        vm.prank(solverA);
        vm.expectRevert(OFAHook.DuplicateBidder.selector);
        hook.submitBid(id, floor + 20);
    }

    function test_cannotSettleBeforeEndBlock() public {
        uint256 id = _largeSwap(user);
        vm.prank(solverA);
        hook.submitBid(id, hook.getAuction(id).ammFloor + 1);
        vm.expectRevert(OFAHook.AuctionStillOpen.selector);
        hook.settleAuction(id);
    }

    function test_settle_solverWins_userReceivesMoreThanAmm() public {
        uint256 id = _largeSwap(user);
        uint256 floor = hook.getAuction(id).ammFloor;
        uint256 bid = floor + 50e18;
        vm.prank(solverA);
        hook.submitBid(id, bid);

        uint256 solverT0Before = IERC20(Currency.unwrap(currency0)).balanceOf(solverA);

        vm.roll(100);
        uint256 balBefore = IERC20(Currency.unwrap(currency1)).balanceOf(user);
        hook.settleAuction(id);
        uint256 balAfter = IERC20(Currency.unwrap(currency1)).balanceOf(user);

        assertEq(balAfter - balBefore, bid, "user receives solver bid");
        assertGt(balAfter - balBefore, floor, "better than AMM floor");
        // Solver received the input from PM (via burn+take).
        assertEq(
            IERC20(Currency.unwrap(currency0)).balanceOf(solverA) - solverT0Before,
            THRESHOLD,
            "solver received input"
        );
        // ERC-6909 claim cleared.
        assertEq(manager.balanceOf(address(hook), CurrencyLibrary.toId(currency0)), 0, "claim burned");
        assertEq(uint8(hook.getAuction(id).status), uint8(OFAHook.AuctionStatus.Settled));
    }

    function test_settle_noBids_ammFallback() public {
        uint256 id = _largeSwap(user);
        vm.roll(100);
        uint256 balBefore = IERC20(Currency.unwrap(currency1)).balanceOf(user);
        hook.settleAuction(id);
        uint256 balAfter = IERC20(Currency.unwrap(currency1)).balanceOf(user);
        assertGt(balAfter, balBefore, "user got AMM output");
        assertEq(manager.balanceOf(address(hook), CurrencyLibrary.toId(currency0)), 0, "claim burned");
        assertEq(uint8(hook.getAuction(id).status), uint8(OFAHook.AuctionStatus.Settled));
    }

    function test_cannotSettleTwice() public {
        uint256 id = _largeSwap(user);
        vm.roll(100);
        hook.settleAuction(id);
        vm.expectRevert(OFAHook.AuctionNotFound.selector);
        hook.settleAuction(id);
    }

    function test_comparison_hookGivesUserMore() public {
        // Scenario A: AMM-only baseline (no solver bids → AMM fallback).
        uint256 id1 = _largeSwap(user);
        vm.roll(100);
        uint256 balBeforeAmm = IERC20(Currency.unwrap(currency1)).balanceOf(user);
        hook.settleAuction(id1);
        uint256 ammOut = IERC20(Currency.unwrap(currency1)).balanceOf(user) - balBeforeAmm;

        // Scenario B: Solver wins.
        vm.roll(200);
        uint256 id2 = _largeSwap(user);
        uint256 betterPrice = (THRESHOLD * 999) / 1000; // strictly above 99% floor
        vm.prank(solverA);
        hook.submitBid(id2, betterPrice);
        vm.roll(300);
        uint256 balBeforeSolver = IERC20(Currency.unwrap(currency1)).balanceOf(user);
        hook.settleAuction(id2);
        uint256 solverOut = IERC20(Currency.unwrap(currency1)).balanceOf(user) - balBeforeSolver;

        assertGt(solverOut, ammOut, "solver-filled order should beat AMM");
    }
}
