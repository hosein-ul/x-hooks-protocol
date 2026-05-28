# X Hooks Protocol — Progress Tracker

## Session 1 — COMPLETE ✅
**Branch:** claude/sweet-wright-VRieD
**Commits:** e3173e2 (initial), 5e87b3e (AsyncSwap fix)

### What was built:
- [x] Foundry project structure (foundry.toml, remappings.txt, via_ir=true)
- [x] Constants.sol with X Layer Mainnet addresses
- [x] OFAHook.sol — Orderflow Auction Hook
- [x] BCSHook.sol — Bilateral Commitment Settlement Hook  
- [x] SUBAHook.sol — Sealed-Bid Uniform Price Batch Auction Hook
- [x] OFAHook.t.sol — 11/11 tests passing
- [x] BCSHook.t.sol — 12/12 tests passing
- [x] SUBAHook.t.sol — 12/12 tests passing
- [x] AsyncSwap fix: all hooks use mint+delta pattern, transparent interception

### Test totals: 35/35 passing

### Key patterns confirmed working:
- OFAHook: normal swap → triggers auction → hook holds ERC-6909 claim
- SUBAHook: normal swap → buffered → user paid input, got nothing back
- BCSHook: StateLibrary.getSlot0 reads live price, ERC-20 collateral

---

## Session 1 Fix — COMPLETE ✅
- [x] Removed requestAuctionSwap() and submitOrder() entry points
- [x] Implemented canonical V4 AsyncSwap pattern (mint + BeforeSwapDelta)
- [x] BCSHook reduced to BEFORE_SWAP only, reads actual sqrtPrice
- [x] All 35 tests still passing after refactor

---

## Session 2 — COMPLETE ✅
**Branch:** claude/happy-maxwell-8yCvb

### What was built:
- [x] PLTHook.sol — Programmable Liquidity Tranching (9/9 tests)
- [x] CALHook.sol — Commitments-as-Liquidity (10/10 tests)
- [x] HookRegistry.sol — Hook Registry (12/12 tests)
- [x] script/DeployAll.s.sol — Deploy script (dry-run simulation passes on X Layer)
- [x] deployments/xlayer-mainnet.json — placeholder (PRIVATE_KEY not available for broadcast)
- [x] BaseHook.sol — Written from scratch (v4-hooks-public not publicly accessible)

### Test totals: 66/66 passing
- OFAHook: 11/11
- BCSHook: 12/12
- SUBAHook: 12/12
- PLTHook: 9/9
- CALHook: 10/10
- HookRegistry: 12/12

### Key technical notes:
- PLTHook: AFTER_INITIALIZE + BEFORE_ADD_LIQUIDITY + BEFORE_REMOVE_LIQUIDITY + AFTER_SWAP
  - Fee tracking is notional (accumulators only) since no AFTER_SWAP_RETURNS_DELTA
  - hookData format: abi.encode(address lp, PLTHook.Tranche tranche)
  - 70/30 fee split verified by tests with exact arithmetic
- CALHook: BEFORE_SWAP + BEFORE_SWAP_RETURNS_DELTA
  - Uses sync/settle/take pattern for atomic execution in beforeSwap
  - BeforeSwapDelta: specifiedDelta = token0Out, unspecifiedDelta = -collateral (BUY)
  - Swap must be large enough (specifiedDelta ≤ abs(amountSpecified))
  - Trigger check: currentSqrtPrice >= triggerPrice && sqrtPriceLimitX96 <= triggerPrice (BUY)
- DeployAll.s.sol: dry-run simulation successful, HookMiner finds correct salts
  - Needs PRIVATE_KEY env var for actual broadcast

### Deploy simulation addresses (dry-run, X Layer Mainnet):
- HookRegistry: 0x5b73C5498c1E3b4dbA84de0F1833c4a029d90519 (simulation)
- OFAHook:      0xF83A7C80B6eAEdB00647b61889599FbB2Dbf0088 (simulation)
- BCSHook:      0x23678723Fc27E7f3211970BE24F6eeD4136E8080 (simulation)
- PLTHook:      0x63Dd6Db2740B5487D0ed996c2847B677aE97da40 (simulation)
- SUBAHook:     0xacc2613Cd7f4b7559B5dd11d1a7BA551c328D088 (simulation)
- CALHook:      0x1D724aF1D1c57F6c332a271F322686DC30ce0088 (simulation)

### LIVE Mainnet Addresses (block 61211835, deployer 0xC0d1AC70A3A32BceA4a124e65eb22eb5f0d0Adc2):
- HookRegistry: 0xeBc902Cee74345DD23f63E2f132f81E5fBE1D56D
- OFAHook:      0x955523a8eD7999e05015bC6F7b854D447717c088
- BCSHook:      0xb7128F16104e6DD0DCe6f89dfBf733440E7F8080
- PLTHook:      0xb4313ADd866F4E30F22751F9Ccf2C526839eda40
- SUBAHook:     0xD8b747E0e895eD02FbDac6378A9548368374d088
- CALHook:      0x3F26eF2279a0FfbBdC8270198106633008d78088

---

## Session 3 — COMPLETE ✅
**Branch:** claude/happy-maxwell-8yCvb

### What was built:
- [x] frontend/ Next.js 16 project (App Router, TypeScript, Tailwind v4)
- [x] wagmi v2 + RainbowKit v2 + X Layer chain config (Chain 196)
- [x] HookCard component with gradient headers, copy address, OKLink link
- [x] Main dashboard (/) — stats bar + 5-hook grid, live block number in header
- [x] Hook detail pages (/hooks/[address]) — mechanics, code snippet, sidebar stats
- [x] useHookRegistry + useRegistryStats + useHookInfo custom hooks (30s auto-refresh)
- [x] .env.local populated with simulation addresses from PROGRESS.md
- [x] `npm run build` passes — clean TypeScript, 0 errors

### Key technical notes:
- Next.js 16: `params` is `Promise<{...}>` — server pages use `await params`
- Tailwind v4 via `@import "tailwindcss"` (no config file needed)
- wagmi v2 `useReadContracts` for batch registry reads with `satisfies` type annotation
- tsconfig target bumped to ES2020 for BigInt literal support
- Identity map keyed by lowercase address (NEXT_PUBLIC_* inlined at build time)
- Fallback to hardcoded hook data when registry not yet deployed
- Dark theme (bg-gray-950) throughout; RainbowKit darkTheme() modal
