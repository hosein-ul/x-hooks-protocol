export type HookName = "OFAHook" | "BCSHook" | "PLTHook" | "SUBAHook" | "CALHook"

export type StepStatus = "FIRED" | "SKIP" | "BUFFERED" | "PENDING"

export type ExecStep = {
  id: string
  label: string
  sublabel: string
  status: StepStatus
  note: string | null
}

export type SimResult = {
  hookName: HookName
  amountIn: number
  tokenIn: "XHKB" | "XHKA"
  tokenOut: "XHKB" | "XHKA"
  amountOut: number | null  // null = buffered/pending
  priceImpact: number
  steps: ExecStep[]
  outcomeTitle: string
  outcomeBody: string
  /** PLT-specific fee split */
  feeSplit?: { senior: number; junior: number; total: number }
}

// Pool initial reserves matching DeployPool.s.sol (10_000 tokens each side)
const RESERVE = 10_000

// Constant product AMM output with 0.3% fee
function ammOut(amountIn: number, reserveIn: number, reserveOut: number): number {
  const amountInWithFee = amountIn * 9970
  return (amountInWithFee * reserveOut) / (reserveIn * 10000 + amountInWithFee)
}

function priceImpact(amountIn: number, reserveIn: number): number {
  return (amountIn / (reserveIn + amountIn)) * 100
}

// OFA: auction triggers when swap > 0.5% of pool (>50 tokens)
const OFA_THRESHOLD = 50

export function simulateSwap(
  hookName: HookName,
  amountIn: number,
  direction: "zeroForOne" | "oneForZero",
): SimResult {
  const tokenIn  = (direction === "zeroForOne" ? "XHKB" : "XHKA") as "XHKB" | "XHKA"
  const tokenOut = (direction === "zeroForOne" ? "XHKA" : "XHKB") as "XHKB" | "XHKA"
  const out = ammOut(amountIn, RESERVE, RESERVE)
  const impact = priceImpact(amountIn, RESERVE)
  const fee = amountIn * 0.003

  const base = { amountIn, tokenIn, tokenOut, priceImpact: impact }

  switch (hookName) {
    case "OFAHook": {
      const large = amountIn >= OFA_THRESHOLD
      return {
        ...base,
        hookName,
        amountOut: large ? null : out,
        steps: [
          step("user",       "User",          "Swap initiated",                  "FIRED", null),
          step("before",     "beforeSwap",    "OFAHook intercepts",              "FIRED",
            large ? `Swap size ${amountIn} ≥ ${OFA_THRESHOLD} threshold — auction window opened` : `Swap size ${amountIn} < ${OFA_THRESHOLD} — below auction threshold`),
          step("amm",        "Core AMM",      "Constant-product curve",          large ? "BUFFERED" : "FIRED",
            large ? "Execution paused — awaiting solver bid" : `Output: ${out.toFixed(4)} ${tokenOut}`),
          step("after",      "afterSwap",     "Post-swap hook",                  "SKIP", null),
          step("settle",     "Settle / Take", "ERC-6909 settlement",             large ? "PENDING" : "FIRED",
            large ? "Best-bid solver will settle within N blocks" : "Tokens transferred to caller"),
        ],
        outcomeTitle: large ? "Auction triggered" : "Swap executed normally",
        outcomeBody: large
          ? `Your ${amountIn} ${tokenIn} swap exceeds the MEV protection threshold. The hook opens a sealed solver auction — competing solvers bid for the right to fill your order, guaranteeing you at least the AMM price and usually better. Settlement arrives within the configured window.`
          : `Your swap is below the OFA threshold (${OFA_THRESHOLD} ${tokenIn}). The trade routes directly through the AMM curve at the best available price with no MEV risk at this size.`,
      }
    }

    case "BCSHook": {
      return {
        ...base,
        hookName,
        amountOut: out,
        steps: [
          step("user",   "User",          "Swap initiated",               "FIRED", null),
          step("before", "beforeSwap",    "BCSHook intercepts",           "FIRED", "Scanning active bilateral commitments at current sqrtPrice"),
          step("amm",    "Core AMM",      "Constant-product curve",       "FIRED", `No commitment triggered — output: ${out.toFixed(4)} ${tokenOut}`),
          step("after",  "afterSwap",     "Post-swap hook",               "SKIP",  null),
          step("settle", "Settle / Take", "ERC-6909 settlement",          "FIRED", "Tokens transferred to caller"),
        ],
        outcomeTitle: "No commitment triggered — AMM executed",
        outcomeBody: `The BCSHook checked all active bilateral commitments against the current pool price. No registered counterparty had a matching trigger in this direction at this price level. The swap executed normally through the AMM curve.`,
      }
    }

    case "PLTHook": {
      const seniorFee = fee * 0.7
      const juniorFee = fee * 0.3
      return {
        ...base,
        hookName,
        amountOut: out,
        feeSplit: { senior: seniorFee, junior: juniorFee, total: fee },
        steps: [
          step("user",   "User",          "Swap initiated",               "FIRED", null),
          step("before", "beforeSwap",    "Pre-swap hook",                "SKIP",  null),
          step("amm",    "Core AMM",      "Constant-product curve",       "FIRED", `Swap output: ${out.toFixed(4)} ${tokenOut}`),
          step("after",  "afterSwap",     "PLTHook intercepts",           "FIRED", `Fee waterfall: ${seniorFee.toFixed(4)} ${tokenIn} → Senior · ${juniorFee.toFixed(4)} ${tokenIn} → Junior`),
          step("settle", "Settle / Take", "ERC-6909 settlement",          "FIRED", "Tokens transferred to caller"),
        ],
        outcomeTitle: "Swap executed — fee waterfall applied",
        outcomeBody: `The PLTHook distributed the ${fee.toFixed(4)} ${tokenIn} swap fee across two tranches: Senior LPs (fee-priority, IL-last) receive ${seniorFee.toFixed(4)} ${tokenIn} (70%) and Junior LPs (higher risk, higher residual) receive ${juniorFee.toFixed(4)} ${tokenIn} (30%). This CDO-style split runs entirely on-chain without a separate vault.`,
      }
    }

    case "SUBAHook": {
      return {
        ...base,
        hookName,
        amountOut: null,
        steps: [
          step("user",   "User",          "Swap initiated",               "FIRED",    null),
          step("before", "beforeSwap",    "SUBAHook intercepts",          "BUFFERED", `Order for ${amountIn} ${tokenIn} captured as ERC-6909 claim — added to current epoch batch`),
          step("amm",    "Core AMM",      "Constant-product curve",       "SKIP",     "Execution deferred to epoch settlement"),
          step("after",  "afterSwap",     "Post-swap hook",               "SKIP",     null),
          step("settle", "Settle / Take", "Epoch settlement",             "PENDING",  "Keeper will call settleEpoch() at epoch boundary — uniform clearing price for all orders"),
        ],
        outcomeTitle: "Order buffered in epoch batch",
        outcomeBody: `Your swap has been added to the current epoch batch. SUBAHook intercepts every swap and holds orders as ERC-6909 claims against the PoolManager. At epoch end, a keeper publishes a uniform clearing price and every order in the batch executes at that same price — no front-running, no positional MEV. You will receive output tokens once the epoch settles.`,
      }
    }

    case "CALHook": {
      return {
        ...base,
        hookName,
        amountOut: out,
        steps: [
          step("user",   "User",          "Swap initiated",               "FIRED", null),
          step("before", "beforeSwap",    "CALHook intercepts",           "FIRED", "Scanning active collateral commitments — checking if current sqrtPrice crossed any trigger"),
          step("amm",    "Core AMM",      "Constant-product curve",       "FIRED", `No limit order at this price — output: ${out.toFixed(4)} ${tokenOut}`),
          step("after",  "afterSwap",     "Post-swap hook",               "SKIP",  null),
          step("settle", "Settle / Take", "ERC-6909 settlement",          "FIRED", "Tokens transferred to caller"),
        ],
        outcomeTitle: "No active limit orders — AMM executed",
        outcomeBody: `The CALHook scanned all open collateral commitments in the direction of your swap. No commitment had its trigger price crossed by the current pool price. Your swap executed normally through the AMM. If a BUY or SELL commitment's trigger price had been reached, it would have executed atomically inside this same transaction.`,
      }
    }
  }
}

function step(
  id: string,
  label: string,
  sublabel: string,
  status: StepStatus,
  note: string | null,
): ExecStep {
  return { id, label, sublabel, status, note }
}
