# Session 3 Prompt — Copy this into the new Claude Code chat

---

Read CONTEXT.md and PROGRESS.md first.
Sessions 1 and 2 are complete. All contracts deployed on X Layer Mainnet.
Addresses are in deployments/xlayer-mainnet.json.
Now build the frontend dashboard.

## Tech Stack
- Next.js 14 (App Router, TypeScript)
- wagmi v2 + viem
- RainbowKit (wallet connection)
- Tailwind CSS + shadcn/ui
- @tanstack/react-query

## Setup Commands
cd frontend
npx create-next-app@latest . --typescript --tailwind --app --no-git
npm install wagmi viem @rainbow-me/rainbowkit @tanstack/react-query
npx shadcn@latest init

## X Layer Chain Config (for wagmi)
{
  id: 196,
  name: 'X Layer',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.xlayer.tech'] } },
  blockExplorers: { default: { name: 'OKLink', url: 'https://www.oklink.com/x-layer' } }
}

## Hook Visual Identity (hardcode these)
OFAHook:  icon=⚡  gradient=from-yellow-500 to-orange-500  type=Execution
BCSHook:  icon=🤝  gradient=from-blue-500 to-cyan-500      type=Settlement
PLTHook:  icon=🏗️  gradient=from-purple-500 to-pink-500    type=Liquidity
SUBAHook: icon=🔨  gradient=from-green-500 to-teal-500     type=Execution
CALHook:  icon=🎯  gradient=from-red-500 to-rose-500       type=Forward Market

## Page 1 — Main Dashboard (/)
Header: "X Hooks Protocol" + X Layer badge + Connect Wallet + live block number

Stats bar (live from HookRegistry contract):
  Total Hooks | Total Pools | Total Interactions | Network: X Layer (196)

Hook grid — 5 cards, each shows:
  - Icon + gradient background
  - Hook name + shortname badge
  - Contract address (click to copy + OKLink icon link)
  - ✓ Verified badge (green, from isVerified)
  - Type badge (Execution / Settlement / Liquidity / Forward Market)
  - Tagline (1 line)
  - 3 primitive tags
  - Live stats: X pools · Y interactions
  - "View Details →" button

## Page 2 — Hook Detail (/hooks/[address])
  - Full name + metadata from HookRegistry
  - Description paragraph
  - Key mechanics (3-4 bullet points, hardcoded per hook)
  - Live stats: interactions, pools using
  - Code snippet: how to use this hook (hardcoded per hook)
  - Links: OKLink explorer
  - Back button

## Data Fetching
useHookRegistry() custom hook:
  - reads getAllHooks() from registry
  - for each address reads hooks() mapping
  - returns { data: HookMetadata[], isLoading, error }
  - refreshes every 30s

Dashboard works READ-ONLY without wallet. Wallet only for future writes.

## .env.local (populate from deployments/xlayer-mainnet.json)
NEXT_PUBLIC_WALLETCONNECT_ID=
NEXT_PUBLIC_CHAIN_ID=196
NEXT_PUBLIC_HOOK_REGISTRY=
NEXT_PUBLIC_OFAH=
NEXT_PUBLIC_BCSH=
NEXT_PUBLIC_PLTH=
NEXT_PUBLIC_SUBAH=
NEXT_PUBLIC_CALH=

## Execution Order
1. scaffold Next.js + install deps
2. wagmi config with X Layer chain
3. constants.ts + contracts.ts (ABIs from contracts/out/)
4. useHookRegistry + useHookStats custom hooks
5. HookCard component
6. Main dashboard page
7. Hook detail page
8. npm run build → fix all errors
9. npm run dev → manual verify
10. Update PROGRESS.md — mark Session 3 complete

When done: say "SESSION 3 COMPLETE"
