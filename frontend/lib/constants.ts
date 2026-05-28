export type HookIdentity = {
  icon: string
  color: string       // accent hex color
  gradient: string    // tailwind gradient classes
  type: string
  shortname: string
  tagline: string
  primitives: string[]
  mechanics: string[]
  usage: string
}

// Real deployed addresses on X Layer Mainnet (block 61211835)
// Used as hardcoded fallback — env vars override for other deployments
export const HOOK_ADDRESSES = {
  OFAHook:  (process.env.NEXT_PUBLIC_OFAH  ?? '0x955523a8eD7999e05015bC6F7b854D447717c088') as `0x${string}`,
  BCSHook:  (process.env.NEXT_PUBLIC_BCSH  ?? '0xb7128F16104e6DD0DCe6f89dfBf733440E7F8080') as `0x${string}`,
  PLTHook:  (process.env.NEXT_PUBLIC_PLTH  ?? '0xb4313ADd866F4E30F22751F9Ccf2C526839eda40') as `0x${string}`,
  SUBAHook: (process.env.NEXT_PUBLIC_SUBAH ?? '0xD8b747E0e895eD02FbDac6378A9548368374d088') as `0x${string}`,
  CALHook:  (process.env.NEXT_PUBLIC_CALH  ?? '0x3F26eF2279a0FfbBdC8270198106633008d78088') as `0x${string}`,
  Registry: (process.env.NEXT_PUBLIC_HOOK_REGISTRY ?? '0xeBc902Cee74345DD23f63E2f132f81E5fBE1D56D') as `0x${string}`,
}

// Keyed by lowercase hook name — immune to address/env-var issues
const HOOK_IDENTITY_MAP: Record<string, HookIdentity> = {
  ofahook: {
    icon: '⚡',
    color: '#f97316',
    gradient: 'from-amber-500 to-orange-500',
    type: 'Execution',
    shortname: 'OFA',
    tagline: 'Large swaps trigger a competitive N-block solver auction with AMM fallback',
    primitives: ['MEV Protection', 'Auction', 'Price Discovery'],
    mechanics: [
      'Swaps above threshold pause execution and open a sealed solver auction',
      'Solvers compete for N blocks; winning bid fills the trade at improved price',
      'If no solver responds the trade falls back to normal AMM execution',
      'Hook holds ERC-6909 claims during the auction window — no early withdrawal',
    ],
    usage: `// Large swap → triggers OFA automatically, no extra setup needed
IPoolManager.SwapParams memory params = IPoolManager.SwapParams({
    zeroForOne: true,
    amountSpecified: -100_000e18, // large input triggers auction
    sqrtPriceLimitX96: MIN_SQRT_RATIO + 1
});
poolManager.swap(poolKey, params, "");`,
  },

  bcshook: {
    icon: '🤝',
    color: '#3b82f6',
    gradient: 'from-blue-500 to-cyan-400',
    type: 'Settlement',
    shortname: 'BCS',
    tagline: 'Two-party OTC commitments auto-settle when spot price crosses a trigger',
    primitives: ['OTC Settlement', 'Price Trigger', 'Bilateral'],
    mechanics: [
      'Two counterparties register a bilateral commitment with a trigger sqrtPrice',
      'On each swap the hook reads live price via StateLibrary.getSlot0()',
      'When spot crosses the trigger the commitment settles atomically in one tx',
      'Collateral moves via ERC-20 safeTransfer — no intermediary custody',
    ],
    usage: `// Register a bilateral OTC commitment
bcsHook.submitCommitment(
    poolKey,
    counterparty,        // address of other party
    triggerSqrtPrice,    // execution price as sqrtPriceX96
    token0Amount,        // how much token0 to deliver
    token1Amount         // how much token1 to receive
);`,
  },

  plthook: {
    icon: '🏗️',
    color: '#a855f7',
    gradient: 'from-purple-500 to-pink-500',
    type: 'Liquidity',
    shortname: 'PLT',
    tagline: 'CDP-style LP tranching — 70 % fee waterfall to Senior, 30 % to Junior',
    primitives: ['Tranching', 'Fee Waterfall', 'IL Protection'],
    mechanics: [
      'LPs choose SENIOR (fee-priority, IL-protected last) or JUNIOR (higher risk)',
      'After each swap, 70 % of fees flow to senior tranche, 30 % to junior',
      'Senior bears impermanent loss last — junior absorbs IL first, like CDO structure',
      'hookData = abi.encode(lpAddress, tranche) must be passed on every deposit',
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
  },

  subahook: {
    icon: '🔨',
    color: '#10b981',
    gradient: 'from-emerald-500 to-teal-400',
    type: 'Execution',
    shortname: 'SUBA',
    tagline: 'Swaps buffered into epoch batches and settled at a single uniform clearing price',
    primitives: ['Batch Auction', 'Uniform Price', 'Anti-MEV'],
    mechanics: [
      'All swaps during an epoch are intercepted and held as ERC-6909 claims',
      'At epoch end the keeper calls settleEpoch() to determine clearing price',
      'Every order within the epoch executes at the same price — no front-running',
      'Users can withdraw unbuffered positions if an epoch expires without settlement',
    ],
    usage: `// Swaps are automatically batched — no special params needed
// Keeper settles each epoch at the end of the window:
subaHook.settleEpoch(
    poolKey,
    clearingSqrtPrice,  // uniform clearing price for this batch
    epochId
);`,
  },

  calhook: {
    icon: '🎯',
    color: '#f43f5e',
    gradient: 'from-rose-500 to-red-500',
    type: 'Forward Market',
    shortname: 'CAL',
    tagline: 'ERC-20 collateral commitments auto-execute when price reaches a trigger',
    primitives: ['Limit Orders', 'Collateral', 'Auto-Execute'],
    mechanics: [
      'Users lock ERC-20 collateral with a directional trigger price (BUY or SELL)',
      'On each swap, the hook checks if current sqrtPrice crossed the trigger',
      'When triggered, collateral executes atomically via sync / settle / take pattern',
      'Expired commitments auto-refund; owners can cancel any active commitment',
    ],
    usage: `// Post a BUY commitment: purchase token0 with token1 at trigger price
uint256 id = calHook.submitCommitment(
    poolKey,
    CALHook.Direction.BUY,
    triggerSqrtPrice,   // execute when spot <= this price
    expiryBlock,        // auto-refund after this block
    token1Amount        // collateral to spend
);`,
  },
}

// Look up by hook name (primary) — robust against address/env-var mismatches
export function getHookIdentity(name: string): HookIdentity | undefined {
  const key = name.toLowerCase().replace(/[^a-z0-9]/g, '')
  return HOOK_IDENTITY_MAP[key]
}

export const EXPLORER_BASE = 'https://www.oklink.com/x-layer/address/'
export const EXPLORER_TX   = 'https://www.oklink.com/x-layer/tx/'
