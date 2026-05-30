"use client"

import { useState, useRef } from "react"
import { motion, type Variants } from "framer-motion"
import { SiteNav } from "@/components/site-nav"
import { SiteFooter } from "@/components/site-footer"
import { HookSelector } from "@/components/hook-simulator/HookSelector"
import { SwapForm } from "@/components/hook-simulator/SwapForm"
import { ExecutionTimeline } from "@/components/hook-simulator/ExecutionTimeline"
import { ResultPanel } from "@/components/hook-simulator/ResultPanel"
import { simulateSwap, type HookName, type SimResult, type ExecStep } from "@/lib/simulation"
import { getHookIdentity } from "@/lib/constants"

type Direction = "zeroForOne" | "oneForZero"

const wordVariants: Variants = {
  hidden: { opacity: 0, y: 32, skewY: 4 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    skewY: 0,
    transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1], delay: i * 0.07 },
  }),
}

const charVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: i * 0.025 },
  }),
}

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
}

function KineticText({ text, className, baseDelay = 0 }: { text: string; className?: string; baseDelay?: number }) {
  return (
    <span className={className} aria-label={text}>
      {text.split("").map((char, i) => (
        <motion.span
          key={i}
          custom={baseDelay + i}
          variants={charVariants}
          className="inline-block"
          style={{ whiteSpace: char === " " ? "pre" : undefined }}
        >
          {char === " " ? " " : char}
        </motion.span>
      ))}
    </span>
  )
}

function WordReveal({ text, className }: { text: string; className?: string }) {
  const words = text.split(" ")
  return (
    <p className={className} aria-label={text}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          custom={i}
          variants={wordVariants}
          className="inline-block mr-[0.25em]"
        >
          {word}
        </motion.span>
      ))}
    </p>
  )
}

const PENDING_STEPS: ExecStep[] = [
  { id: "user",   label: "User",          sublabel: "Swap initiated",         status: "PENDING", note: null },
  { id: "before", label: "beforeSwap",    sublabel: "Hook intercept check",   status: "PENDING", note: null },
  { id: "amm",    label: "Core AMM",      sublabel: "Constant-product curve", status: "PENDING", note: null },
  { id: "after",  label: "afterSwap",     sublabel: "Hook post-swap check",   status: "PENDING", note: null },
  { id: "settle", label: "Settle / Take", sublabel: "ERC-6909 settlement",    status: "PENDING", note: null },
]

const sectionNumVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: "easeOut" } },
}

export default function DemoPage() {
  const [selectedHook, setSelectedHook] = useState<HookName>("OFAHook")
  const [amount, setAmount] = useState("100")
  const [direction, setDirection] = useState<Direction>("zeroForOne")
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<SimResult | null>(null)

  const hookId = getHookIdentity(selectedHook)

  function handleHookChange(h: HookName) {
    setSelectedHook(h)
    setResult(null)
  }

  async function handleSimulate() {
    setRunning(true)
    setResult(null)
    // Realistic "broadcast → mempool → block inclusion" delay
    await new Promise((r) => setTimeout(r, 1800))
    const res = simulateSwap(selectedHook, Number(amount), direction)
    setResult(res)
    setRunning(false)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />

      <main className="flex-1 bg-(--surface-0)">
        {/* PAGE HEADER */}
        <motion.div
          className="border-b border-(--rule) px-4 py-8 md:px-8 md:py-12 max-w-[1400px] mx-auto"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.06 } },
          }}
        >
          <motion.div variants={fadeUpVariants} className="eyebrow mb-4">
            Hook Simulator
          </motion.div>
          <h1
            className="display text-[clamp(2.8rem,9vw,7.5rem)] leading-[0.88] tracking-[-0.035em] mb-5"
            aria-label="Simulate any swap"
          >
            <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.015, delayChildren: 0.1 } } }}>
              <KineticText text="Simulate" className="text-(--ink)" />
              {" "}
              <KineticText text="any" className="display-italic text-(--signal)" baseDelay={8} />
              {" "}
              <KineticText text="swap." className="text-(--ink)" baseDelay={11} />
            </motion.div>
          </h1>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05, delayChildren: 0.35 } } }}
          >
            <WordReveal
              text="Pick a hook, enter an amount, and watch the V4 execution pipeline animate step-by-step — no wallet, no gas, no real transaction."
              className="text-base md:text-lg text-(--ink-2) leading-relaxed max-w-2xl"
            />
          </motion.div>
        </motion.div>

        <div className="max-w-[1400px] mx-auto px-4 py-8 md:px-8 md:py-12 space-y-12 md:space-y-16">

          {/* SECTION 01 — Hook selector */}
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          >
            <div className="flex items-center gap-4 mb-5">
              <motion.span
                className="display text-3xl md:text-4xl text-(--muted) leading-none tabular-nums"
                initial="hidden"
                animate="visible"
                variants={sectionNumVariants}
              >
                01
              </motion.span>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-(--ink)">Select a hook</p>
                <p className="text-xs text-(--muted) mt-0.5">Each hook intercepts the swap pipeline differently</p>
              </div>
            </div>
            <HookSelector selected={selectedHook} onChange={handleHookChange} />
          </motion.section>

          {/* SECTION 02 — Swap form */}
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
          >
            <div className="flex items-center gap-4 mb-5">
              <span className="display text-3xl md:text-4xl text-(--muted) leading-none tabular-nums">02</span>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-(--ink)">Configure swap</p>
                <p className="text-xs text-(--muted) mt-0.5">Set amount and direction — pool reserves are 10,000 XHKB / 10,000 XHKA</p>
              </div>
            </div>
            <div className="flex justify-center">
              <SwapForm
                hookName={selectedHook}
                amount={amount}
                direction={direction}
                running={running}
                onAmountChange={setAmount}
                onFlip={() => setDirection(d => d === "zeroForOne" ? "oneForZero" : "zeroForOne")}
                onSimulate={handleSimulate}
              />
            </div>
          </motion.section>

          {/* SECTION 03 — Execution timeline */}
          {(running || result) && (
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div className="flex items-center gap-4 mb-5">
                <span className="display text-3xl md:text-4xl text-(--muted) leading-none tabular-nums">03</span>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-(--ink)">Execution pipeline</p>
                  <p className="text-xs text-(--muted) mt-0.5">V4 hook lifecycle — phase by phase</p>
                </div>
              </div>
              <ExecutionTimeline steps={result ? result.steps : PENDING_STEPS} />
            </motion.section>
          )}

          {/* SECTION 04 — Result */}
          {result && (
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center gap-4 mb-5">
                <span className="display text-3xl md:text-4xl text-(--muted) leading-none tabular-nums">04</span>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-(--ink)">Result</p>
                  <p className="text-xs text-(--muted) mt-0.5">Simulated outcome for {hookId?.shortname}</p>
                </div>
              </div>
              <ResultPanel result={result} />
            </motion.section>
          )}

          {/* How to use these hooks (integration guide) */}
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="flex items-center gap-4 mb-5">
              <span className="display text-3xl md:text-4xl text-(--muted) leading-none tabular-nums">05</span>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-(--ink)">How to use these hooks</p>
                <p className="text-xs text-(--muted) mt-0.5">Real-world integration — how a user, router, or contract actually calls a V4 pool with a hook attached</p>
              </div>
            </div>

            <div className="border border-(--rule) bg-(--surface-0) p-5 md:p-6 mb-4">
              <p className="text-sm text-(--ink-2) leading-relaxed">
                These hook contracts are <strong className="text-(--ink) font-semibold">permissionless infrastructure</strong>{" "}
                — anyone can attach them to their own pool. On Uniswap&apos;s web app,
                the <span className="mono text-(--ink)">New position</span> screen has an{" "}
                <span className="mono text-(--ink)">Enter hook address</span> field.
                Paste one of our contract addresses there and the pool is initialized with the hook baked in.
                Every swap in that pool then runs the hook&apos;s logic automatically — swappers need nothing extra.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-(--rule) border border-(--rule)">
              <UsageCard
                title="Add a hook to your pool"
                kind="Pool creator · UI"
                body="On the Uniswap web app, creating a hooked pool takes one extra field. No code, no deployment — just paste the hook address and the pool is live."
                steps={[
                  `Go to <span class="mono text-(--ink)">app.uniswap.org → Pool → New position</span>`,
                  `Select <span class="mono text-(--ink)">v4 position</span> from the top-right toggle`,
                  `Choose your token pair and fee tier`,
                  `Paste one of our contract addresses into the <span class="mono text-(--ink)">Enter hook address</span> field`,
                  `Continue — every swap in this pool now runs the hook automatically`,
                ]}
              />
              <UsageCard
                title="Swap in a hooked pool"
                kind="Solidity / contract"
                body="Swapping is identical to any V4 pool — hooks fire automatically from the PoolKey, nothing extra is needed at swap time. Implement IUnlockCallback, call manager.unlock(), then manager.swap() inside the callback."
                code={`contract MySwapper is IUnlockCallback {
  IPoolManager immutable manager;

  function swap(PoolKey calldata key) external {
    manager.unlock(abi.encode(key));
  }

  function unlockCallback(bytes calldata data)
      external returns (bytes memory) {
    PoolKey memory key = abi.decode(data, (PoolKey));
    // hook.beforeSwap fires automatically ↓
    BalanceDelta delta = manager.swap(
      key,
      IPoolManager.SwapParams({
        zeroForOne:        true,
        amountSpecified:   -100e18,
        sqrtPriceLimitX96: MIN_SQRT_RATIO + 1
      }),
      "" // hookData — empty for basic swaps
    );
    // hook.afterSwap fires automatically ↑
    // settle / take delta ...
  }
}`}
              />
              <UsageCard
                title="PLT — pick your tranche on deposit"
                kind="LP"
                body="Senior LPs (fee priority, IL absorbed last) and Junior LPs (residual fees, IL first) live in the same pool. The tranche is encoded in hookData on every modifyLiquidity call — no separate vault, no oracle."
                code={`bytes memory hookData = abi.encode(
  msg.sender,
  PLTHook.Tranche.SENIOR  // or JUNIOR
);
posManager.modifyLiquidities(
  abi.encode(params, hookData),
  deadline
);`}
              />
              <UsageCard
                title="CAL — post an on-chain limit order"
                kind="Trader"
                body="Lock collateral with a directional trigger and an expiry block. The hook executes your order atomically inside the next swap that crosses the trigger — no keeper, no off-chain orderbook, anyone can ride the trigger."
                code={`calHook.submitCommitment(
  poolKey,
  CALHook.Direction.BUY,
  triggerSqrtPriceX96,
  expiryBlock,
  collateralAmount
);`}
              />
              <UsageCard
                title="BCS — bilateral OTC commitment"
                kind="Two counterparties"
                body="Two parties register a commitment at a trigger price. The hook watches every swap; the first one that crosses the trigger settles both legs atomically against ERC-20 safeTransfer — no escrow contract, no governance."
                code={`bcsHook.submitCommitment(
  poolKey,
  counterparty,
  triggerSqrtPriceX96,
  token0Amount,
  token1Amount
);`}
              />
              <UsageCard
                title="SUBA — wait for the epoch clearing"
                kind="Wallet user / keeper"
                body="Orders submitted to SUBA are buffered until the keeper calls settleEpoch, which runs a uniform-price batch auction. Traders get a fair clearing price; keepers earn a gas incentive. Front-running is structurally impossible."
                code={`subaHook.submitOrder(
  poolKey,
  amountIn,
  minAmountOut,
  deadline
);

// keeper — called once per epoch
subaHook.settleEpoch(poolKey);`}
              />
            </div>
          </motion.section>

        </div>
      </main>

      <SiteFooter />
    </div>
  )
}

function UsageCard({
  title,
  kind,
  body,
  code,
  steps,
}: {
  title: string
  kind: string
  body: string
  code?: string
  steps?: string[]
}) {
  return (
    <div className="bg-(--surface-0) p-5 md:p-6 flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h3 className="display text-xl md:text-2xl text-(--ink) leading-tight">{title}</h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-(--muted) shrink-0">
          {kind}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-(--ink-2)">{body}</p>
      {steps && (
        <ol className="mt-1 space-y-2">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-(--ink-2)">
              <span className="mono text-[11px] text-(--muted) shrink-0 mt-0.5">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span dangerouslySetInnerHTML={{ __html: step }} />
            </li>
          ))}
        </ol>
      )}
      {code && (
        <pre className="overflow-x-auto bg-(--surface-1) border border-(--rule) p-3 text-[11.5px] leading-relaxed mono text-(--ink) mt-1">
          <code>{code}</code>
        </pre>
      )}
    </div>
  )
}
