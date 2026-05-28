# Session 2 Prompt — Copy this into the new Claude Code chat

---

Read CONTEXT.md and PROGRESS.md first to understand the project.
Session 1 is complete. 35/35 tests passing. Now build Session 2.

## What to build in this session:
1. PLTHook.sol + tests
2. CALHook.sol + tests
3. HookRegistry.sol + tests
4. DeployAll.s.sol + deploy to X Layer Mainnet

---

## HOOK 4 — PLTHook (Programmable Liquidity Tranching)

IDEA: One pool, two LP tranche types:
- SENIOR: narrow range, receives 70% of fees FIRST, bears IL LAST
- JUNIOR: wide range, receives 30% of fees AFTER senior, bears IL FIRST

This creates structured risk exposure — like CDP tranching in TradFi.
Institutional LPs choose risk profile (treasury = senior, yield farmers = junior).

MECHANICS:
- LP passes tranche choice via hookData: abi.encode(Tranche.SENIOR) or abi.encode(Tranche.JUNIOR)
- afterInitialize: init TrancheState for this pool
- beforeAddLiquidity: read tranche from hookData, record LPPosition
  with feeDebt snapshot = current feePerShare accumulator value
- afterSwap:
  → extract swap fees from delta
  → waterfall: 70% → seniorFeePool, 30% → juniorFeePool
  → update feePerShareSenior and feePerShareJunior (scaled 1e18,
    divided by totalSeniorLiquidity / totalJuniorLiquidity)
- beforeRemoveLiquidity:
  → pendingFees = (currentFeePerShare - position.feeDebt) * liquidity / 1e18
  → update tranche liquidity totals

IMPORTANT: PLTHook does NOT intercept swaps. AFTER_SWAP only observes fees.
No mint/delta pattern needed. Normal swaps work transparently.

PERMISSIONS: AFTER_INITIALIZE + BEFORE_ADD_LIQUIDITY + BEFORE_REMOVE_LIQUIDITY + AFTER_SWAP

TESTS (use deployCodeTo):
- senior LP earns 70% of fees, junior earns 30% — verify exact split
- two LPs equal liquidity: senior accumulates more fees per unit
- feeDebt snapshot prevents double-claiming on second removal
- removal collects correct pending fees per tranche
- tranche totals update correctly on add/remove
- hookData with wrong encoding reverts gracefully

---

## HOOK 5 — CALHook (Commitments-as-Liquidity)

IDEA: Users deposit ERC-20 collateral and commit to buy/sell at a future
trigger price. When any swap moves price through the trigger, the
commitment auto-executes as extra liquidity IN THAT SAME SWAP.
Uncommitted collateral is refunded after expiry.

MECHANICS:
- createCommitment(poolKey, direction, triggerPrice, expiryBlock, amount):
  BUY direction: deposit token1 (will buy token0 when price drops to trigger)
  SELL direction: deposit token0 (will sell token0 when price rises to trigger)
  ERC-20 safeTransferFrom to hook contract.
  Store commitment. Add id to activeCommitments[poolId].

- beforeSwap: iterate activeCommitments for this pool
  For each active commitment:
  → if expired: mark expired, ERC-20 refund to owner, skip
  → check trigger:
    BUY: swap is zeroForOne AND current sqrtPrice will cross ≤ triggerPriceLow
    SELL: swap is NOT zeroForOne AND current sqrtPrice will cross ≥ triggerPriceHigh
  → if triggered:
    Use poolManager.mint(address(this), collateralToken.toId(), collateralAmount)
    Accumulate into BeforeSwapDelta — commitment's collateral adds to swap input
    Commitment owner will receive output tokens via poolManager.take() in same tx
    Mark commitment as executed

- cancelCommitment(): owner cancels non-executed commitment → ERC-20 refund

PERMISSIONS: BEFORE_SWAP + BEFORE_SWAP_RETURNS_DELTA

TESTS:
- createCommitment: collateral locked via ERC-20 transfer, event emitted
- swap that does NOT cross trigger: commitment untouched
- swap that crosses trigger: commitment executes atomically,
  owner receives tokens in same transaction as triggering swap
- expired commitment: auto-refunded on next swap interaction
- cancel before execution: full ERC-20 refund
- totalExecuted and totalCollateralLocked stats update correctly

---

## HOOK REGISTRY — HookRegistry.sol

Standard Ownable contract. No hook flags. No HookMiner needed.

STORES per hook:
  address, HookType enum (0=ORDERFLOW_AUCTION, 1=BILATERAL_COMMITMENT,
  2=LIQUIDITY_TRANCHING, 3=BATCH_AUCTION, 4=COMMITMENTS_AS_LIQUIDITY),
  name string, description string, version string,
  deployer address, deployedAt uint256 (block.number),
  isVerified bool, isActive bool,
  totalPoolsUsing uint256, totalInteractions uint256

FUNCTIONS:
  registerHook(address, HookType, name, description, version, flags bytes32[])
    → anyone can register, reverts if already registered
  linkPool(poolId bytes32, hookAddress, label string)
    → links pool to hook, increments totalPoolsUsing
  recordInteraction(hookAddress)
    → increments totalInteractions
  verifyHook(address) onlyOwner → sets isVerified = true
  deactivateHook(address) onlyOwner → sets isActive = false
  getAllHooks() → address[]
  getHooksByType(HookType) → address[]
  getHookPools(address) → bytes32[]
  getHookCount() → uint256
  getPoolCount() → uint256

TESTS:
- registerHook → appears in getAllHooks()
- duplicate register → reverts HookAlreadyRegistered
- linkPool → totalPoolsUsing increments
- recordInteraction → totalInteractions increments
- verifyHook → only owner can call, isVerified becomes true
- non-owner verifyHook → reverts
- deactivate → isActive becomes false

---

## DEPLOY SCRIPT — script/DeployAll.s.sol

require(block.chainid == 196, "Must deploy on X Layer Mainnet");

Deploy order:
1. new HookRegistry() — no mining needed
2. OFAHook via HookMiner  flags: BEFORE_SWAP | BEFORE_SWAP_RETURNS_DELTA
3. BCSHook via HookMiner  flags: BEFORE_SWAP
4. PLTHook via HookMiner  flags: AFTER_INITIALIZE | BEFORE_ADD_LIQUIDITY |
                                  BEFORE_REMOVE_LIQUIDITY | AFTER_SWAP
5. SUBAHook via HookMiner flags: AFTER_INITIALIZE | BEFORE_SWAP |
                                  BEFORE_SWAP_RETURNS_DELTA
6. CALHook via HookMiner  flags: BEFORE_SWAP | BEFORE_SWAP_RETURNS_DELTA

After all deploys:
  → registry.registerHook() for all 5
  → registry.verifyHook() for all 5
  → console.log a clean address table

Write to deployments/xlayer-mainnet.json:
{
  "chainId": 196,
  "deployedAt": "<block>",
  "contracts": {
    "HookRegistry": "0x...",
    "OFAHook": "0x...",
    "BCSHook": "0x...",
    "PLTHook": "0x...",
    "SUBAHook": "0x...",
    "CALHook": "0x..."
  }
}

EXECUTION ORDER:
1. forge build (make sure existing code still compiles)
2. Write PLTHook.sol → forge build → fix errors
3. Write PLTHook.t.sol → forge test -match PLTHook → fix errors
4. Write CALHook.sol → forge build → fix errors
5. Write CALHook.t.sol → forge test -match CALHook → fix errors
6. Write HookRegistry.sol → forge build → fix errors
7. Write HookRegistry.t.sol → forge test -match HookRegistry → fix errors
8. forge test (all tests) → must be 35 + new tests passing
9. Write DeployAll.s.sol
10. Dry run: forge script script/DeployAll.s.sol --rpc-url https://rpc.xlayer.tech
11. If simulation passes:
    forge script script/DeployAll.s.sol \
      --rpc-url https://rpc.xlayer.tech \
      --private-key $PRIVATE_KEY \
      --broadcast --slow
12. Verify on https://www.oklink.com/x-layer
13. Update PROGRESS.md — mark Session 2 complete

When done: print address table and say "SESSION 2 COMPLETE"
