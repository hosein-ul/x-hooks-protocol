import type { LucideIcon } from "lucide-react"
import {
  Gavel,
  Handshake,
  Layers,
  TimerReset,
  Target,
  Network,
} from "lucide-react"

export type HookIdentity = {
  /** Lucide icon component — NO emojis */
  Icon: LucideIcon
  /** Single-letter editorial glyph used in big-display contexts */
  glyph: string
  /** Roman numeral position in the taxonomy */
  ordinal: string
  type: string
  shortname: string
  tagline: string
  /** One-line technical summary in headline voice */
  headline: string
  primitives: string[]
  mechanics: string[]
  usage: string
  /** Which v4 hook callbacks are wired */
  permissions: string[]
  /** Concrete real-world scenarios this hook unlocks */
  useCases: string[]
  /** A 1–2 paragraph deep explanation of the problem the hook solves */
  whyItMatters: string
}

// Real deployed addresses on X Layer Mainnet (block 61221454)
// Env vars override for other deployments
export const HOOK_ADDRESSES = {
  OFAHook:  (process.env.NEXT_PUBLIC_OFAH  ?? "0x955523a8eD7999e05015bC6F7b854D447717c088") as `0x${string}`,
  BCSHook:  (process.env.NEXT_PUBLIC_BCSH  ?? "0xb7128F16104e6DD0DCe6f89dfBf733440E7F8080") as `0x${string}`,
  PLTHook:  (process.env.NEXT_PUBLIC_PLTH  ?? "0xb4313ADd866F4E30F22751F9Ccf2C526839eda40") as `0x${string}`,
  SUBAHook: (process.env.NEXT_PUBLIC_SUBAH ?? "0xD8b747E0e895eD02FbDac6378A9548368374d088") as `0x${string}`,
  CALHook:  (process.env.NEXT_PUBLIC_CALH  ?? "0x3F26eF2279a0FfbBdC8270198106633008d78088") as `0x${string}`,
  Registry: (process.env.NEXT_PUBLIC_HOOK_REGISTRY ?? "0xeBc902Cee74345DD23f63E2f132f81E5fBE1D56D") as `0x${string}`,
}

// V4 PoolManager + demo pool tokens deployed by DeployPool.s.sol
export const POOL_MANAGER = "0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32" as `0x${string}`
export const POOL_TOKENS = {
  token0: "0x8199bFf13918c270ced3df9776862663b7c952e3" as `0x${string}`, // XHKB
  token1: "0xE26b32C27E39a736325E5D89366104425b8EF6EF" as `0x${string}`, // XHKA
} as const

const HOOK_IDENTITY_MAP: Record<string, HookIdentity> = {
  ofahook: {
    Icon: Gavel,
    glyph: "I",
    ordinal: "I.",
    type: "Execution",
    shortname: "OFA",
    tagline: "Large swaps trigger an N-block solver auction with AMM fallback.",
    headline: "Orderflow auction with sealed solver competition.",
    primitives: ["MEV Protection", "Sealed Auction", "Price Discovery"],
    permissions: ["beforeSwap", "beforeSwapReturnDelta"],
    mechanics: [
      "Swaps above the configured threshold pause execution and open a sealed solver auction in the same transaction.",
      "Solvers bid for N consecutive blocks; the winning bid fills the trade at an improved price relative to the AMM curve.",
      "If no solver responds within the window, the trade falls back to the regular AMM execution path with no penalty.",
      "Pending orderflow is held as ERC-6909 claims for the duration of the auction — there is no early withdrawal.",
    ],
    usage: `// Large swap automatically triggers OFA — no special params required
IPoolManager.SwapParams memory params = IPoolManager.SwapParams({
    zeroForOne: true,
    amountSpecified: -100_000e18, // large input → opens auction
    sqrtPriceLimitX96: MIN_SQRT_RATIO + 1
});
poolManager.swap(poolKey, params, "");`,
    useCases: [
      "Whale-sized swaps where slippage from naive AMM execution would leak value to MEV bots.",
      "DAO treasury rebalancing — opens a competitive solver auction for the best execution price.",
      "Aggregator routers offering institutional-grade execution without running their own RFQ infrastructure.",
      "Any swap above a configurable size threshold that should receive price improvement instead of raw AMM fills.",
    ],
    whyItMatters:
      "On a standard AMM, large swaps move the curve and bots front-run, back-run, or sandwich them — value that should belong to the trader silently leaks to MEV. OFA flips the model: instead of letting bots extract, the hook seals the swap and invites them to compete for the right to fill it. Whoever offers the user the best price wins. If nobody bids, the AMM still executes as a safe fallback. The user always gets at least the AMM price — and usually better.",
  },

  bcshook: {
    Icon: Handshake,
    glyph: "II",
    ordinal: "II.",
    type: "Settlement",
    shortname: "BCS",
    tagline: "Two-party OTC commitments auto-settle when spot crosses a trigger.",
    headline: "Bilateral commitment settlement on a trigger price.",
    primitives: ["OTC Settlement", "Price Trigger", "Bilateral"],
    permissions: ["beforeSwap"],
    mechanics: [
      "Two counterparties register a bilateral commitment containing a trigger sqrtPrice and the size of each leg.",
      "On every swap the hook reads live price via StateLibrary.getSlot0 against the pool's current state.",
      "When spot crosses the trigger, the commitment settles atomically in a single transaction.",
      "Collateral transfers via ERC-20 safeTransfer — no intermediary custody, no escrow contract.",
    ],
    usage: `// Register a bilateral OTC commitment
bcsHook.submitCommitment(
    poolKey,
    counterparty,        // address of other party
    triggerSqrtPrice,    // execution price as sqrtPriceX96
    token0Amount,        // amount of token0 to deliver
    token1Amount         // amount of token1 to receive
);`,
    useCases: [
      "Market-makers and counterparties agreeing on a future exchange price without involving an off-chain escrow.",
      "Treasury swaps that should only execute when the pool reaches a strategic threshold.",
      "OTC desks settling bilateral trades trustlessly inside DEX infrastructure they already use.",
      "Structured products that need price-conditional settlement primitives without governance.",
    ],
    whyItMatters:
      "OTC trades have always required a trusted intermediary — an escrow contract, a multisig, a centralized desk. BCS removes them all. Two parties register their commitment on-chain; the hook watches every swap and settles the deal the moment the pool's spot price crosses the agreed trigger. Atomic, trustless, no governance. Collateral never leaves the two participants' control until the trigger is hit, and then it settles in the same transaction as the swap that crossed it.",
  },

  plthook: {
    Icon: Layers,
    glyph: "III",
    ordinal: "III.",
    type: "Liquidity",
    shortname: "PLT",
    tagline: "CDP-style LP tranching — 70% of fees waterfall to Senior, 30% to Junior.",
    headline: "Programmable liquidity tranching with structured fee waterfall.",
    primitives: ["Tranching", "Fee Waterfall", "IL Protection"],
    permissions: ["afterInitialize", "beforeAddLiquidity", "beforeRemoveLiquidity", "afterSwap"],
    mechanics: [
      "LPs choose SENIOR (fee-priority, impermanent-loss last) or JUNIOR (higher risk, fee residual) on deposit.",
      "After each swap, 70% of fees flow to the senior tranche, 30% to junior — a fixed structured waterfall.",
      "Senior bears impermanent loss last; junior absorbs IL first, replicating CDO subordination on-chain.",
      "hookData = abi.encode(lpAddress, tranche) must be passed on every deposit to bind the position.",
    ],
    usage: `// Add liquidity to senior tranche
bytes memory hookData = abi.encode(msg.sender, PLTHook.Tranche.SENIOR);
modifyLiquidityRouter.modifyLiquidity(
    poolKey,
    IPoolManager.ModifyLiquidityParams({
        tickLower: -887220,
        tickUpper:  887220,
        liquidityDelta: int256(1000e18),
        salt: 0
    }),
    hookData
);`,
    useCases: [
      "Risk-tiered LP products where conservative capital takes the senior fee waterfall and yield-seekers take junior subordination.",
      "Institutional LPs needing a defined risk profile — senior tranche behaves like a fixed-priority fee claim.",
      "Yield-bearing primitives built on top of a single pool, exposing two different return/risk shapes to two different audiences.",
      "Vaults and yield aggregators looking for capital-efficient ways to split exposure across the same liquidity range.",
    ],
    whyItMatters:
      "Traditional Uniswap LPs all share the same risk and the same fee stream — there is no way to express preference for safety vs yield within a single pool. PLT borrows the CDO/tranche pattern from structured finance: senior LPs get fee priority and absorb impermanent loss last; junior LPs get the residual fees but eat IL first. Same pool, same range, two different risk shapes. It's the first on-chain primitive for tiered LP exposure that doesn't require a separate vault, oracle, or off-chain accounting.",
  },

  subahook: {
    Icon: TimerReset,
    glyph: "IV",
    ordinal: "IV.",
    type: "Execution",
    shortname: "SUBA",
    tagline: "Swaps buffered into epochs and settled at a single uniform clearing price.",
    headline: "Sealed-bid uniform-price batch auction over N blocks.",
    primitives: ["Batch Auction", "Uniform Price", "Anti-MEV"],
    permissions: ["afterInitialize", "beforeSwap", "beforeSwapReturnDelta"],
    mechanics: [
      "All swaps during an epoch are intercepted at beforeSwap and held as ERC-6909 claims against the manager.",
      "At epoch end, the designated keeper calls settleEpoch() supplying a uniform clearing price.",
      "Every order in the epoch executes at the same price — no front-running, no positional MEV.",
      "Users may withdraw unbuffered positions if an epoch expires without a settlement transaction.",
    ],
    usage: `// Swaps are automatically batched — no special params needed
// Keeper settles each epoch at the end of the window:
subaHook.settleEpoch(
    poolKey,
    clearingSqrtPrice,  // uniform clearing price for this batch
    epochId
);`,
    useCases: [
      "Token-launch pools where uniform pricing prevents sniping the first block.",
      "Memecoin and high-volatility pairs where positional MEV would dominate retail flow.",
      "DAO protocol-owned-liquidity venues that want fair, oracle-free price discovery on every epoch.",
      "Periodic rebalancing of indices and treasury baskets — every basket member trades at the same clearing price.",
    ],
    whyItMatters:
      "On a continuous AMM, position in the block determines price. Bots that pay for priority lanes win, and retail loses every time. SUBA imposes a simple rule: every order in the same epoch settles at the same price. There is no position-within-block to compete for. The model is the Frequent Batch Auction proposed by Budish, Cramton, and Shim — long argued to be the optimal market microstructure for fair execution. SUBA brings it to AMMs without an off-chain matching engine.",
  },

  calhook: {
    Icon: Target,
    glyph: "V",
    ordinal: "V.",
    type: "Forward Market",
    shortname: "CAL",
    tagline: "ERC-20 collateral commitments auto-execute when price reaches a trigger.",
    headline: "Commitments-as-liquidity — collateralized limit orders.",
    primitives: ["Limit Orders", "Collateral", "Auto-Execute"],
    permissions: ["beforeSwap", "beforeSwapReturnDelta"],
    mechanics: [
      "Users lock ERC-20 collateral with a directional trigger price (BUY or SELL) and an expiry block.",
      "On each swap the hook checks whether the current sqrtPrice crossed the trigger in the user's favor.",
      "When triggered, collateral executes atomically against the pool via the sync / settle / take pattern.",
      "Expired commitments are auto-refunded; owners may cancel any active commitment at any time.",
    ],
    usage: `// Post a BUY commitment: purchase token0 with token1 at trigger price
uint256 id = calHook.submitCommitment(
    poolKey,
    CALHook.Direction.BUY,
    triggerSqrtPrice,   // execute when spot <= this price
    expiryBlock,        // auto-refund after this block
    token1Amount        // collateral to spend
);`,
    useCases: [
      "On-chain limit orders that don't depend on a keeper network or a centralized orderbook.",
      "Stop-loss and take-profit primitives for vaults, treasuries, and structured products.",
      "Conditional treasury management — auto-buy a basis below a threshold, auto-sell above another.",
      "Delegated execution for managed accounts: collateral is locked, triggers are public, anyone can fulfil.",
    ],
    whyItMatters:
      "DEX users have asked for native limit orders since the first AMM shipped — and every previous attempt depended on off-chain keepers that introduced trust, latency, and liveness risk. CAL turns the swap itself into the trigger. Collateral lives in the hook, the trigger price is public, and any swap that crosses the trigger auto-executes the commitment atomically inside the same transaction. No keeper, no oracle, no governance. Just collateral plus a price.",
  },
}

// Stable ordered list for landing-page taxonomy / dashboard grid.
export const HOOK_ORDER = ["OFAHook", "BCSHook", "PLTHook", "SUBAHook", "CALHook"] as const

// Default icon for the Registry / fallback rendering.
export const RegistryIcon = Network

export function getHookIdentity(name: string): HookIdentity | undefined {
  const key = name.toLowerCase().replace(/[^a-z0-9]/g, "")
  return HOOK_IDENTITY_MAP[key]
}

export const EXPLORER_BASE = "https://www.oklink.com/x-layer/address/"
export const EXPLORER_TX   = "https://www.oklink.com/x-layer/tx/"

// Social / project links
export const SOCIAL_LINKS = {
  github:  "https://github.com/hosein-ul/x-hooks-protocol",
  twitter: "https://x.com/XHooks_protocol",
} as const
