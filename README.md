# X·Hooks Protocol

> Five production-grade Uniswap V4 hooks deployed on **X Layer Mainnet** —
> MEV-resistant orderflow auctions, bilateral OTC settlement, structured LP
> tranching, sealed-bid batch auctions, and collateral-backed limit orders —
> composed into a single registry and exposed through one PoolManager.

**Live site:** [deploy-preview on Netlify](https://deploy-preview-6--x-hooks-protocol.netlify.app) · **Twitter:** [@XHooks\_protocol](https://x.com/XHooks_protocol)

---

## Table of contents

1. [Overview](#overview)
2. [Why these hooks](#why-these-hooks)
3. [The five primitives](#the-five-primitives)
4. [Architecture](#architecture)
5. [Deployment addresses](#deployment-addresses-x-layer-mainnet--chain-196)
6. [Repository layout](#repository-layout)
7. [Local development](#local-development)
8. [Deploying the contracts](#deploying-the-contracts)
9. [Verifying contracts on OKLink](#verifying-contracts-on-oklink)
10. [Frontend](#frontend)
11. [Security model](#security-model)
12. [License](#license)

---

## Overview

X·Hooks Protocol is a catalogue of five non-upgradeable Uniswap V4 hooks built
from scratch for the **OKX Build-X Hackathon (2026)**.

Each hook intercepts a specific stage of the V4 swap pipeline to add
functionality the bare AMM lacks — without modifying the core protocol, without
governance, and without admin keys. The hooks are registered in a single
on-chain `HookRegistry` so the catalogue is discoverable, byte-verifiable, and
queryable from a single read.

The project ships end-to-end:

- **Smart contracts** (Foundry / Solidity 0.8.26, via\_ir, cancun EVM)
- **Deployment + interaction scripts** (CREATE2-mined hook addresses, real on-chain pool initialization, live swap execution proving callbacks fire)
- **Frontend** (Next.js + wagmi + RainbowKit) with a multi-page editorial dashboard reading directly from X Layer's public RPC

Everything is open source under MIT.

---

## Why these hooks

The bare Uniswap V4 AMM is a beautifully minimal primitive — but on its own it
leaves several real problems unsolved:

| Problem on a vanilla AMM | X·Hook that solves it |
|---|---|
| MEV bots extract value from large swaps via front-running / sandwich attacks | **OFA** — sealed solver auction for large trades |
| OTC trades depend on trusted intermediaries (escrows, multisigs, off-chain desks) | **BCS** — bilateral on-chain commitments with atomic trigger settlement |
| All LPs in a pool share the same risk profile — no way to express risk preference | **PLT** — CDO-style senior / junior tranching of fees and IL |
| First-in-block trades win, retail loses to bots that pay for priority lanes | **SUBA** — sealed-bid uniform-price batch auctions per epoch |
| Native limit orders require off-chain keepers that introduce trust and liveness risk | **CAL** — collateral-backed limit orders that auto-execute on a trigger swap |

Five separate problems, five purpose-built primitives, one composable interface.

---

## The five primitives

### I. OFA — Orderflow Auction (Execution)

Swaps above a configurable size threshold pause execution and open a sealed
N-block solver auction inside the same transaction. Solvers compete for the
right to fill the trade at an improved price. If no solver responds within the
window, the trade falls back to the regular AMM path with no penalty. Pending
orderflow is held as ERC-6909 claims against the PoolManager for the duration
of the auction.

- **Callbacks:** `beforeSwap`, `beforeSwapReturnDelta`
- **Use cases:** whale-sized swaps, DAO treasury rebalancing, aggregator routing for institutional flow.

### II. BCS — Bilateral Commitment Settlement (Settlement)

Two counterparties register an OTC commitment containing a `sqrtPrice` trigger
and the size of each leg. On every swap the hook reads live price via
`StateLibrary.getSlot0`; when spot crosses the trigger, the commitment settles
atomically. Collateral transfers via ERC-20 `safeTransfer` — no escrow contract,
no intermediary custody.

- **Callbacks:** `beforeSwap`
- **Use cases:** market-makers, OTC desks, treasury swaps with strategic thresholds, structured products needing price-conditional settlement.

### III. PLT — Programmable Liquidity Tranching (Liquidity)

LPs choose **SENIOR** (fee-priority, IL last) or **JUNIOR** (residual fees, IL
first) on deposit. After each swap, 70% of fees flow to senior, 30% to junior.
Replicates CDO subordination on-chain inside a single pool. Position is bound
via `hookData = abi.encode(lpAddress, tranche)` on every modify.

- **Callbacks:** `afterInitialize`, `beforeAddLiquidity`, `beforeRemoveLiquidity`, `afterSwap`
- **Use cases:** risk-tiered LP products, institutional LPs, yield aggregators, vaults wanting two return shapes from the same range.

### IV. SUBA — Sealed-bid Uniform Batch Auction (Execution)

All swaps during an epoch are intercepted at `beforeSwap` and held as ERC-6909
claims. At epoch end, a designated keeper calls `settleEpoch()` supplying a
uniform clearing price. Every order in the epoch executes at the **same price**
— removing positional MEV entirely. Implements the Budish-Cramton-Shim Frequent
Batch Auction model on an AMM.

- **Callbacks:** `afterInitialize`, `beforeSwap`, `beforeSwapReturnDelta`
- **Use cases:** token launches, memecoin and high-volatility pairs, protocol-owned-liquidity venues, periodic index rebalancing.

### V. CAL — Commitments As Liquidity (Forward Market)

Users lock ERC-20 collateral with a directional trigger price (BUY / SELL) and
an expiry block. On each swap, the hook checks whether `sqrtPrice` crossed the
trigger in the user's favour; if so, collateral executes atomically against the
pool via the `sync → settle → take` pattern. Expired commitments auto-refund;
owners can cancel any active commitment.

- **Callbacks:** `beforeSwap`, `beforeSwapReturnDelta`
- **Use cases:** native limit orders without a keeper network, stop-loss / take-profit primitives for vaults, conditional treasury management.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         X LAYER MAINNET                          │
│                          (Chain ID 196)                          │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
              ┌──────────────────────────────────────┐
              │     Uniswap V4 PoolManager           │
              │  0x360E68faCcca8cA495c1B759Fd9EEe…   │
              │      (singleton, canonical)          │
              └──────────────────────────────────────┘
                                │
                                ▼
              ┌──────────────────────────────────────┐
              │           HookRegistry               │
              │  0xeBc902Cee74345DD23f63E2f132f81E…  │
              │  append-only on-chain catalogue      │
              └──────────────────────────────────────┘
                                │
        ┌─────────────┬─────────┴─────────┬─────────────┬─────────────┐
        ▼             ▼                   ▼             ▼             ▼
   ┌────────┐   ┌────────┐         ┌────────┐    ┌────────┐    ┌────────┐
   │  OFA   │   │  BCS   │         │  PLT   │    │  SUBA  │    │  CAL   │
   │ before │   │ before │         │ before │    │ before │    │ before │
   │  Swap  │   │  Swap  │         │  Add   │    │  Swap  │    │  Swap  │
   │+Delta  │   │        │         │ +After │    │+Delta  │    │+Delta  │
   │        │   │        │         │ Init…  │    │        │    │        │
   └────────┘   └────────┘         └────────┘    └────────┘    └────────┘
        │             │                   │             │             │
        └─────────────┴───────────────────┴─────────────┴─────────────┘
                                │
                                ▼
                  Each hook is bound to its own
                  XHKA/XHKB demo pool (fee = 0.3 %, tickSpacing = 60).
```

**Address-encoded permissions.** Each hook contract is deployed via CREATE2
through the `Create2Deployer` so its permission bitmask lives in the low bits of
its address. Anyone can verify which V4 callbacks a hook is allowed to fire
just by reading the address — no need to trust an off-chain manifest.

**ERC-6909 claims.** Hooks that need to custody value mid-swap (OFA, SUBA, CAL)
mint ERC-6909 claims against the PoolManager. Settlement uses the canonical
`sync → settle → take` pattern. There is no intermediary custody, no escrow
contract, and no admin path to drain.

---

## Deployment addresses (X Layer Mainnet · chain 196)

| Contract | Address |
|---|---|
| HookRegistry | `0xeBc902Cee74345DD23f63E2f132f81E5fBE1D56D` |
| OFAHook  | `0x955523a8eD7999e05015bC6F7b854D447717c088` |
| BCSHook  | `0xb7128F16104e6DD0DCe6f89dfBf733440E7F8080` |
| PLTHook  | `0xb4313ADd866F4E30F22751F9Ccf2C526839eda40` |
| SUBAHook | `0xD8b747E0e895eD02FbDac6378A9548368374d088` |
| CALHook  | `0x3F26eF2279a0FfbBdC8270198106633008d78088` |
| PoolManager (V4) | `0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32` |
| Demo token XHKA  | `0xE26b32C27E39a736325E5D89366104425b8EF6EF` |
| Demo token XHKB  | `0x8199bFf13918c270ced3df9776862663b7c952e3` |

Browse any address on **OKLink:** `https://www.oklink.com/x-layer/address/<addr>`

A live, machine-readable copy is committed at
[`x-hooks-protocol/deployments/xlayer-mainnet.json`](x-hooks-protocol/deployments/xlayer-mainnet.json),
including every deployment tx hash, pool ID, swap execution result, and
registry-linking transaction.

---

## Repository layout

```
.
├── README.md                       # ← this file
├── frontend/                       # Next.js dashboard (wagmi + RainbowKit)
│   ├── app/
│   │   ├── page.tsx                # Landing — hero, hooks, deep-dive, about, FAQ
│   │   ├── dashboard/page.tsx      # Live terminal — registry + pool reads
│   │   ├── contracts/page.tsx      # Verifiable contract registry
│   │   └── hooks/[slug]/           # Per-hook detail pages
│   ├── components/                 # Site-nav, footer, theme, brand SVGs, ui/
│   ├── hooks/useHookRegistry.ts    # wagmi reads, pinned to chain 196
│   └── lib/
│       ├── constants.ts            # Hook identity catalogue, addresses, social
│       └── wagmi.ts                # X Layer chain definition
│
└── x-hooks-protocol/
    ├── contracts/                  # Foundry project
    │   ├── src/
    │   │   ├── HookRegistry.sol    # Append-only on-chain catalogue
    │   │   └── hooks/
    │   │       ├── OFAHook.sol
    │   │       ├── BCSHook.sol
    │   │       ├── PLTHook.sol
    │   │       ├── SUBAHook.sol
    │   │       └── CALHook.sol
    │   └── script/
    │       ├── DeployAll.s.sol     # CREATE2-mines + deploys all 5 hooks + registry
    │       ├── DeployPool.s.sol    # Deploys mock tokens + initializes 5 pools
    │       ├── ExecuteSwaps.s.sol  # Runs liquidity + real swaps → triggers callbacks
    │       └── RegisterPools.s.sol # Links pools + records interactions in registry
    ├── deployments/
    │   └── xlayer-mainnet.json     # Live deployment manifest + all tx hashes
    └── verification/               # Flattened sources for OKLink verification
        ├── HookRegistry_flat.sol
        ├── OFAHook_flat.sol
        ├── BCSHook_flat.sol
        ├── PLTHook_flat.sol
        ├── SUBAHook_flat.sol
        └── CALHook_flat.sol
```

---

## Local development

### Requirements

- Node ≥ 20
- Foundry (`forge`, `cast`) — nightly or 1.6+
- A funded X Layer wallet (only required for broadcast — read-only ops need nothing)

### Frontend

```bash
cd frontend
npm install
npm run dev               # http://localhost:3000
```

Environment variables (already wired with mainnet defaults — only override if you redeploy):

```env
NEXT_PUBLIC_CHAIN_ID=196
NEXT_PUBLIC_HOOK_REGISTRY=0xeBc902Cee74345DD23f63E2f132f81E5fBE1D56D
NEXT_PUBLIC_OFAH=0x955523a8eD7999e05015bC6F7b854D447717c088
NEXT_PUBLIC_BCSH=0xb7128F16104e6DD0DCe6f89dfBf733440E7F8080
NEXT_PUBLIC_PLTH=0xb4313ADd866F4E30F22751F9Ccf2C526839eda40
NEXT_PUBLIC_SUBAH=0xD8b747E0e895eD02FbDac6378A9548368374d088
NEXT_PUBLIC_CALH=0x3F26eF2279a0FfbBdC8270198106633008d78088
NEXT_PUBLIC_WALLETCONNECT_ID=<your-walletconnect-project-id>
```

### Contracts

```bash
cd x-hooks-protocol/contracts
forge install
forge build
forge test                # local unit tests
```

---

## Deploying the contracts

The repo ships four Foundry scripts. Run them in order against a fresh chain:

```bash
cd x-hooks-protocol/contracts

# 1. Deploy registry + all 5 hooks (CREATE2-mined addresses, idempotent)
forge script script/DeployAll.s.sol --rpc-url https://rpc.xlayer.tech \
  --private-key $PRIVATE_KEY --broadcast --slow

# 2. Deploy demo tokens (XHKA, XHKB) and initialize one V4 pool per hook
forge script script/DeployPool.s.sol:DeployPool --rpc-url https://rpc.xlayer.tech \
  --private-key $PRIVATE_KEY --broadcast --slow

# 3. Seed liquidity and execute one real swap per pool — fires every hook's
#    beforeSwap / afterSwap callback to prove the mechanism end-to-end.
forge script script/ExecuteSwaps.s.sol:ExecuteSwaps --rpc-url https://rpc.xlayer.tech \
  --private-key $PRIVATE_KEY --broadcast --slow

# 4. Link the initialized pools to their hooks in HookRegistry and record
#    interactions so the dashboard reflects live state.
forge script script/RegisterPools.s.sol:RegisterPools --rpc-url https://rpc.xlayer.tech \
  --private-key $PRIVATE_KEY --broadcast --slow
```

All four scripts have been broadcast on X Layer Mainnet — the resulting tx
hashes are recorded in `deployments/xlayer-mainnet.json` under
`pools.deployTxHashes`, `swapExecution.txHashes`, and `registryLinks.txHashes`.

> ⚠️ **Never commit `$PRIVATE_KEY`.** The scripts source it from the environment;
> the repo never reads or writes it to disk.

---

## Verifying contracts on OKLink

OKLink's verification form has a few non-default settings that **must** be set
correctly or verification will fail. For every contract use:

| Field | Value |
|---|---|
| Compiler type | Solidity (Single file) |
| Compiler version | `v0.8.26+commit.8a97fa7a` |
| Open Source License | MIT |
| **Optimization** | **Yes** (form defaults to No) |
| Optimization runs | `200` |
| **Via IR** | **Yes** (form defaults to No) |
| **EVM Version** | `cancun` (form defaults to "default") |
| Source code | paste the matching file from `x-hooks-protocol/verification/*_flat.sol` |
| Constructor args | leave the pre-filled ABI-encoded values |

Repeat for each of the 6 contracts (HookRegistry, OFAHook, BCSHook, PLTHook,
SUBAHook, CALHook).

---

## Frontend

Four pages, all reading live state from the X Layer public RPC:

- **`/`** — Editorial landing: hero, swap-flow diagram, hook taxonomy, deep-dive section explaining every hook, "More about" section, FAQ.
- **`/dashboard`** — Live terminal: hook count, pool count, interactions, per-hook KPI grid, initialized-pool table, network spec sheet. Refreshes every 30 s.
- **`/contracts`** — Verifiable contract registry: a table of every deployed address with one-click links to OKLink + a 3-step verification guide.
- **`/hooks/<name>`** — Per-hook detail page: oversized title, mechanics walkthrough, copyable code sample, contract metadata, permissions, live activity.

All reads use wagmi's `useReadContract` / `useReadContracts` with `chainId: 196`
pinned explicitly, so the dashboard always shows real chain state regardless of
the visitor's wallet state.

Design system: **Fraunces** (display serif), **DM Sans** (body), **JetBrains
Mono** (data). One signal colour — oxide orange — applied sparingly. Two themes
(dark / light) via `next-themes`.

---

## Security model

- **No upgradability.** Every hook is non-upgradeable and immutable after deployment.
- **No admin keys.** None of the contracts contain an owner, governance, multisig, or pause function.
- **One scoped role.** The SUBA epoch keeper is the only privileged role; it is set per-pool and can only call `settleEpoch` — it cannot freeze, drain, or modify user funds.
- **Address-encoded permissions.** CREATE2 mining commits each hook's permission mask to its address bits, so the V4 PoolManager itself enforces that hooks can only fire the callbacks they advertise.
- **ERC-6909 custody only.** Hooks never hold ERC-20 balances directly; mid-swap value is held as ERC-6909 claims against the PoolManager and released atomically via `sync → settle → take`.
- **No off-chain dependencies.** No oracles, no relayers, no keeper networks (except the per-pool SUBA settler), no off-chain orderbook.

---

## License

[MIT](LICENSE)

Built with care for the **OKX Build-X Hackathon, 2026**.
Follow the project on [Twitter / X](https://x.com/XHooks_protocol).
