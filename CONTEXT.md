# X Hooks Protocol — Project Context

## What This Project Is
A suite of 5 Uniswap V4 Hook contracts + HookRegistry + Next.js Dashboard,
built for the OKX Build-X Hackathon. All contracts deploy to X Layer Mainnet (Chain 196).

## Repo Structure
x-hooks-protocol/
├── contracts/           # Foundry project (via_ir = true)
│   ├── src/hooks/       # 5 hook contracts
│   ├── test/            # Foundry tests
│   └── script/          # Deploy scripts
├── frontend/            # Next.js dashboard (Session 3 — not started)
├── deployments/         # JSON with deployed addresses (populated after deploy)
├── CONTEXT.md           # This file
├── PROGRESS.md          # Session progress tracker
├── SESSION2_PROMPT.md   # Prompt for Session 2
└── SESSION3_PROMPT.md   # Prompt for Session 3

## Network Config
- Chain: X Layer Mainnet, ID: 196
- RPC: https://rpc.xlayer.tech
- PoolManager: 0x360e68faccca8ca495c1b759fd9eee466db9fb32
- PositionManager: 0xcf1eafc6928dc385a342e7c6491d371d2871458b
- Permit2: 0x000000000022D473030F116dDEE9F6B43aC78BA3
- CREATE2_DEPLOYER: 0x4e59b44847b379578588920cA78FbF26c0B4956C
- Explorer: https://www.oklink.com/x-layer

## The 5 Hooks
| Hook | File | Idea |
|------|------|------|
| OFAHook | src/hooks/OFAHook.sol | Large swaps trigger N-block auction. Solvers bid. AMM is fallback. |
| BCSHook | src/hooks/BCSHook.sol | Two parties register bilateral deal. Auto-settles when price crosses trigger. |
| SUBAHook | src/hooks/SUBAHook.sol | All swaps buffered in epochs. Keeper settles at uniform clearing price. |
| PLTHook | src/hooks/PLTHook.sol | Senior/Junior LP tranches. 70/30 waterfall fee distribution. NOT BUILT YET. |
| CALHook | src/hooks/CALHook.sol | Collateral commitments auto-execute as liquidity at trigger price. NOT BUILT YET. |

## Critical Technical Decisions (DO NOT change these)

### 1. AsyncSwap Pattern (canonical V4)
OFAHook and SUBAHook use the correct V4 async pattern:
- beforeSwap: poolManager.mint(address(this), tokenIn.toId(), amountIn)
- return toBeforeSwapDelta(int128(amountIn), 0)
- Settlement tx: unlock() → burn() ERC-6909 → take() real tokens

### 2. BCSHook uses BEFORE_SWAP only (no delta return)
It watches price via StateLibrary.getSlot0(). Does NOT intercept swap amounts.
Collateral is real ERC-20 held by hook contract (not ERC-6909).

### 3. via_ir = true in foundry.toml (required — do not remove)

### 4. Entry points are transparent
Users call normal swapRouter — hooks fire automatically via beforeSwap.
NO custom entry points (requestAuctionSwap, submitOrder were removed in fix).

## Hook Permissions
| Hook | Flags |
|------|-------|
| OFAHook | BEFORE_SWAP + BEFORE_SWAP_RETURNS_DELTA |
| BCSHook | BEFORE_SWAP |
| SUBAHook | AFTER_INITIALIZE + BEFORE_SWAP + BEFORE_SWAP_RETURNS_DELTA |
| PLTHook | AFTER_INITIALIZE + BEFORE_ADD_LIQUIDITY + BEFORE_REMOVE_LIQUIDITY + AFTER_SWAP |
| CALHook | BEFORE_SWAP + BEFORE_SWAP_RETURNS_DELTA |
