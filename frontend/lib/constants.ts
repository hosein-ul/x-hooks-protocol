export type HookIdentity = {
  icon: string
  gradient: string
  type: string
  shortname: string
  tagline: string
  primitives: string[]
  mechanics: string[]
  usage: string
}

export const HOOK_ADDRESSES = {
  OFAHook: (process.env.NEXT_PUBLIC_OFAH ?? '0x0000000000000000000000000000000000000000') as `0x${string}`,
  BCSHook: (process.env.NEXT_PUBLIC_BCSH ?? '0x0000000000000000000000000000000000000000') as `0x${string}`,
  PLTHook: (process.env.NEXT_PUBLIC_PLTH ?? '0x0000000000000000000000000000000000000000') as `0x${string}`,
  SUBAHook: (process.env.NEXT_PUBLIC_SUBAH ?? '0x0000000000000000000000000000000000000000') as `0x${string}`,
  CALHook: (process.env.NEXT_PUBLIC_CALH ?? '0x0000000000000000000000000000000000000000') as `0x${string}`,
}

const OFA_IDENTITY: HookIdentity = {
  icon: '⚡',
  gradient: 'from-yellow-500 to-orange-500',
  type: 'Execution',
  shortname: 'OFA',
  tagline: 'Large swaps trigger N-block solver auction with AMM fallback',
  primitives: ['MEV Protection', 'Auction', 'Price Discovery'],
  mechanics: [
    'Swaps above threshold pause execution and open a sealed solver auction',
    'Solvers compete for N blocks; best bid fills the trade at improved price',
    'If no solver responds, trade falls back to normal AMM execution',
    'Hook holds ERC-6909 claims during the auction window',
  ],
  usage: `// Add hookData to large swaps — no extra setup needed
IPoolManager.SwapParams memory params = IPoolManager.SwapParams({
    zeroForOne: true,
    amountSpecified: -100_000e18, // large input triggers auction
    sqrtPriceLimitX96: MIN_SQRT_RATIO + 1
});
poolManager.swap(poolKey, params, "");`,
}

const BCS_IDENTITY: HookIdentity = {
  icon: '🤝',
  gradient: 'from-blue-500 to-cyan-500',
  type: 'Settlement',
  shortname: 'BCS',
  tagline: 'Two-party OTC deals auto-settle when spot price crosses trigger',
  primitives: ['OTC Settlement', 'Price Trigger', 'Bilateral'],
  mechanics: [
    'Two counterparties register a bilateral commitment with a trigger price',
    'On each swap, the hook reads live sqrtPriceX96 via StateLibrary',
    'When spot price crosses the agreed trigger, commitment auto-settles atomically',
    'Collateral is transferred directly via ERC-20; no intermediary custody',
  ],
  usage: `// Register a bilateral commitment
bcsHook.submitCommitment(
    poolKey,
    counterparty,        // address of other party
    triggerSqrtPrice,    // execution price as sqrtPriceX96
    token0Amount,        // how much token0 to deliver
    token1Amount         // how much token1 to receive
);`,
}

const PLT_IDENTITY: HookIdentity = {
  icon: '🏗️',
  gradient: 'from-purple-500 to-pink-500',
  type: 'Liquidity',
  shortname: 'PLT',
  tagline: 'Senior/Junior LP tranches with 70/30 fee waterfall, CDP-style IL protection',
  primitives: ['Tranching', 'Fee Waterfall', 'IL Protection'],
  mechanics: [
    'LPs choose SENIOR (fee-priority, IL-protected) or JUNIOR (higher risk, lower fees)',
    'After each swap, fees split 70% to senior tranche, 30% to junior',
    'Senior bears impermanent loss last; junior absorbs IL first — like structured credit',
    'hookData = abi.encode(lpAddress, tranche) on every addLiquidity call',
  ],
  usage: `// Add liquidity to senior tranche
bytes memory hookData = abi.encode(msg.sender, PLTHook.Tranche.SENIOR);
modifyLiquidityRouter.modifyLiquidity(
    poolKey,
    IPoolManager.ModifyLiquidityParams({
        tickLower: -887220,
        tickUpper: 887220,
        liquidityDelta: int256(1000e18),
        salt: 0
    }),
    hookData
);`,
}

const SUBA_IDENTITY: HookIdentity = {
  icon: '🔨',
  gradient: 'from-green-500 to-teal-500',
  type: 'Execution',
  shortname: 'SUBA',
  tagline: 'All swaps buffered into epochs, settled at uniform clearing price',
  primitives: ['Batch Auction', 'Uniform Price', 'Anti-MEV'],
  mechanics: [
    'All swaps during an epoch are intercepted and buffered as ERC-6909 claims',
    'At epoch end, keeper calls settleEpoch() to determine uniform clearing price',
    'Every order executes at the same price — eliminates front-running entirely',
    'Unsettled orders can be withdrawn by users if epoch expires unclaimed',
  ],
  usage: `// Normal swaps are automatically batched — no special params needed
// Keeper settles each epoch:
subaHook.settleEpoch(
    poolKey,
    clearingSqrtPrice, // uniform price for this batch
    epochId
);`,
}

const CAL_IDENTITY: HookIdentity = {
  icon: '🎯',
  gradient: 'from-red-500 to-rose-500',
  type: 'Forward Market',
  shortname: 'CAL',
  tagline: 'Collateral commitments auto-execute as liquidity when price crosses trigger',
  primitives: ['Limit Orders', 'Collateral', 'Auto-Execute'],
  mechanics: [
    'Users lock ERC-20 collateral with a directional trigger price (BUY or SELL)',
    'On each swap, hook checks if current sqrtPrice has crossed the trigger',
    'When triggered, collateral executes atomically via sync/settle/take pattern',
    'Expired commitments are refunded; owners can cancel any active commitment',
  ],
  usage: `// Post a BUY commitment: buy token0 with token1 when price drops to trigger
uint256 id = calHook.submitCommitment(
    poolKey,
    CALHook.Direction.BUY,
    triggerSqrtPrice,   // execute when spot <= this
    expiryBlock,        // auto-refund after this block
    token1Amount        // collateral to spend
);`,
}

// Map from lowercase address -> identity
// NEXT_PUBLIC_* vars are inlined at build time
export const HOOK_IDENTITY: Record<string, HookIdentity> = {
  [HOOK_ADDRESSES.OFAHook.toLowerCase()]: OFA_IDENTITY,
  [HOOK_ADDRESSES.BCSHook.toLowerCase()]: BCS_IDENTITY,
  [HOOK_ADDRESSES.PLTHook.toLowerCase()]: PLT_IDENTITY,
  [HOOK_ADDRESSES.SUBAHook.toLowerCase()]: SUBA_IDENTITY,
  [HOOK_ADDRESSES.CALHook.toLowerCase()]: CAL_IDENTITY,
}

export function getHookIdentity(address: string): HookIdentity | undefined {
  return HOOK_IDENTITY[address.toLowerCase()]
}

export const EXPLORER_BASE = 'https://www.oklink.com/x-layer/address/'
