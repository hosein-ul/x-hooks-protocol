// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {BaseHook} from "v4-hooks-public/base/BaseHook.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title BCSHook — Bilateral Commitment Settlement Hook
/// @notice Two parties agree off-chain to swap exact amounts at a specific
/// price. Both post collateral. When any pool swap moves the price through
/// the agreed trigger, the commitment settles atomically.
contract BCSHook is BaseHook {
    using SafeERC20 for IERC20;
    using StateLibrary for IPoolManager;

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------
    error CommitmentNotFound();
    error CommitmentNotPending();
    error CommitmentNotActive();
    error CommitmentExpired();
    error AlreadyDeposited();
    error NotParty();
    error WrongPoolId();
    error InvalidExpiry();

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------
    event CommitmentRegistered(uint256 indexed id, address indexed partyA, address indexed partyB);
    event CollateralDeposited(uint256 indexed id, address indexed party);
    event CommitmentActivated(uint256 indexed id);
    event CommitmentSettled(uint256 indexed id, uint160 sqrtPriceX96);
    event CommitmentCancelled(uint256 indexed id, address indexed by);
    event CommitmentExpiredRefunded(uint256 indexed id);

    // ---------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------
    enum Status {
        None,
        Pending,
        Active,
        Settled,
        Expired,
        Cancelled
    }

    struct Commitment {
        Status status;
        address partyA; // buyer — pays token1, receives token0
        address partyB; // seller — pays token0, receives token1
        uint256 amount0;
        uint256 amount1;
        uint160 triggerPrice; // sqrtPriceX96
        uint256 expiryBlock;
        PoolId poolId;
        Currency token0;
        Currency token1;
        bool depositedA;
        bool depositedB;
    }

    // ---------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------
    uint256 public nextCommitmentId = 1;
    mapping(uint256 => Commitment) public commitments;
    mapping(PoolId => uint256[]) public activeByPool;

    constructor(IPoolManager _manager) BaseHook(_manager) {}

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: false,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: true,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    // ---------------------------------------------------------------------
    // Commitment lifecycle
    // ---------------------------------------------------------------------
    function registerCommitment(
        PoolKey calldata key,
        address partyA,
        address partyB,
        uint256 amount0,
        uint256 amount1,
        uint160 triggerPrice,
        uint256 expiryBlock
    ) external returns (uint256 id) {
        if (expiryBlock <= block.number) revert InvalidExpiry();

        id = nextCommitmentId++;
        Commitment storage c = commitments[id];
        c.status = Status.Pending;
        c.partyA = partyA;
        c.partyB = partyB;
        c.amount0 = amount0;
        c.amount1 = amount1;
        c.triggerPrice = triggerPrice;
        c.expiryBlock = expiryBlock;
        c.poolId = key.toId();
        c.token0 = key.currency0;
        c.token1 = key.currency1;

        emit CommitmentRegistered(id, partyA, partyB);
    }

    function depositCollateral(uint256 id) external {
        Commitment storage c = commitments[id];
        if (c.status != Status.Pending) revert CommitmentNotPending();
        if (block.number >= c.expiryBlock) revert CommitmentExpired();

        if (msg.sender == c.partyA) {
            if (c.depositedA) revert AlreadyDeposited();
            IERC20(Currency.unwrap(c.token1)).safeTransferFrom(msg.sender, address(this), c.amount1);
            c.depositedA = true;
        } else if (msg.sender == c.partyB) {
            if (c.depositedB) revert AlreadyDeposited();
            IERC20(Currency.unwrap(c.token0)).safeTransferFrom(msg.sender, address(this), c.amount0);
            c.depositedB = true;
        } else {
            revert NotParty();
        }

        emit CollateralDeposited(id, msg.sender);

        if (c.depositedA && c.depositedB) {
            c.status = Status.Active;
            activeByPool[c.poolId].push(id);
            emit CommitmentActivated(id);
        }
    }

    function cancelCommitment(uint256 id) external {
        Commitment storage c = commitments[id];
        if (c.status != Status.Pending) revert CommitmentNotPending();
        if (msg.sender != c.partyA && msg.sender != c.partyB) revert NotParty();

        c.status = Status.Cancelled;
        if (c.depositedA) IERC20(Currency.unwrap(c.token1)).safeTransfer(c.partyA, c.amount1);
        if (c.depositedB) IERC20(Currency.unwrap(c.token0)).safeTransfer(c.partyB, c.amount0);

        emit CommitmentCancelled(id, msg.sender);
    }

    /// @notice Refund both parties if a commitment expired without ever
    /// crossing the trigger.
    function expireCommitment(uint256 id) external {
        Commitment storage c = commitments[id];
        if (c.status != Status.Active && c.status != Status.Pending) revert CommitmentNotActive();
        if (block.number < c.expiryBlock) revert CommitmentExpired();

        c.status = Status.Expired;
        if (c.depositedA) IERC20(Currency.unwrap(c.token1)).safeTransfer(c.partyA, c.amount1);
        if (c.depositedB) IERC20(Currency.unwrap(c.token0)).safeTransfer(c.partyB, c.amount0);

        emit CommitmentExpiredRefunded(id);
    }

    // ---------------------------------------------------------------------
    // beforeSwap — scan and settle commitments
    // ---------------------------------------------------------------------
    function _beforeSwap(address, PoolKey calldata key, SwapParams calldata params, bytes calldata)
        internal
        override
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        PoolId poolId = key.toId();
        (uint160 currentSqrtPriceX96,,,) = poolManager.getSlot0(poolId);

        uint256[] storage ids = activeByPool[poolId];
        // Iterate from the end so removals don't break indexing.
        uint256 i = ids.length;
        while (i > 0) {
            unchecked {
                i--;
            }
            uint256 id = ids[i];
            Commitment storage c = commitments[id];

            if (c.status == Status.Expired || c.status == Status.Settled || c.status == Status.Cancelled) {
                _removeAt(ids, i);
                continue;
            }
            if (c.status != Status.Active) continue;

            // Settle if the trigger price is crossed in this direction.
            bool crossed = _trigger(currentSqrtPriceX96, params.sqrtPriceLimitX96, c.triggerPrice, params.zeroForOne);
            if (crossed) {
                _settle(c, id);
                _removeAt(ids, i);
            }
        }

        return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }

    function _trigger(uint160 current, uint160 limit, uint160 trigger, bool zeroForOne)
        internal
        pure
        returns (bool)
    {
        if (zeroForOne) {
            // price moves down: triggered if limit <= trigger <= current.
            return current >= trigger && trigger >= limit;
        } else {
            // price moves up: triggered if current <= trigger <= limit.
            return current <= trigger && trigger <= limit;
        }
    }

    function _settle(Commitment storage c, uint256 id) internal {
        c.status = Status.Settled;
        // PartyA (buyer) receives token0 from the hook's custody (deposited by B).
        IERC20(Currency.unwrap(c.token0)).safeTransfer(c.partyA, c.amount0);
        // PartyB (seller) receives token1 from the hook's custody (deposited by A).
        IERC20(Currency.unwrap(c.token1)).safeTransfer(c.partyB, c.amount1);
        emit CommitmentSettled(id, c.triggerPrice);
    }

    function _removeAt(uint256[] storage arr, uint256 i) internal {
        uint256 last = arr.length - 1;
        if (i != last) arr[i] = arr[last];
        arr.pop();
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------
    function getCommitment(uint256 id) external view returns (Commitment memory) {
        return commitments[id];
    }

    function activeCount(PoolId poolId) external view returns (uint256) {
        return activeByPool[poolId].length;
    }
}
