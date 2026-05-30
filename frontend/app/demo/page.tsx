"use client"

import { useState, useRef } from "react"
import { motion, type Variants } from "framer-motion"
import { SiteNav } from "@/components/site-nav"
import { SiteFooter } from "@/components/site-footer"
import { HookSelector } from "@/components/hook-simulator/HookSelector"
import { SwapForm } from "@/components/hook-simulator/SwapForm"
import { ExecutionTimeline } from "@/components/hook-simulator/ExecutionTimeline"
import { ResultPanel } from "@/components/hook-simulator/ResultPanel"
import { simulateSwap, type HookName, type SimResult } from "@/lib/simulation"
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

  function handleFlip() {
    setDirection((d) => d === "zeroForOne" ? "oneForZero" : "zeroForOne")
    setResult(null)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />

      <main className="flex-1">
        <section className="border-b border-(--rule) overflow-hidden">
          <div className="mx-auto max-w-[1400px] px-4 pt-6 pb-10 md:px-6 md:pt-8 md:pb-12">
            <motion.div
              className="flex flex-wrap items-baseline gap-x-4 gap-y-2 mb-6 md:mb-8"
              initial="hidden"
              animate="visible"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
            >
              <motion.span className="eyebrow" variants={fadeUpVariants}>Hook Simulator</motion.span>
              <motion.span className="eyebrow text-(--muted)" variants={fadeUpVariants}>
                Frontend simulation · No wallet required
              </motion.span>
            </motion.div>

            <motion.h1
              className="display text-[clamp(2rem,7.5vw,5.5rem)] leading-[0.88] tracking-[-0.03em] mb-5 md:mb-6"
              initial="hidden"
              animate="visible"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.03 } } }}
            >
              <KineticText text="See what " baseDelay={0} />
              <KineticText text="your swap" className="display-italic" baseDelay={9} />
              <br />
              <KineticText text="triggers on-chain." baseDelay={19} />
            </motion.h1>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.045, delayChildren: 0.6 } } }}
            >
              <WordReveal
                text="Pick a hook, enter a swap amount, and watch the Uniswap V4 execution lifecycle animate step by step — showing exactly which callbacks fire, what each hook does, and what you receive."
                className="max-w-2xl text-base text-(--ink-2) leading-relaxed"
              />
            </motion.div>
          </div>
        </section>

        <div className="mx-auto max-w-[1400px] px-4 py-8 md:px-6 md:py-10 flex flex-col gap-10 md:gap-12">

          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
          >
            <motion.div className="flex items-center gap-4 mb-5" variants={fadeUpVariants}>
              <motion.span className="display text-3xl md:text-4xl text-(--muted) leading-none tabular-nums" variants={sectionNumVariants}>
                01
              </motion.span>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-(--ink)">Choose a Hook / Pool</p>
                <p className="text-xs text-(--muted) mt-0.5">Each hook runs on the same XHKB/XHKA pool — different execution behavior</p>
              </div>
            </motion.div>
            <motion.div variants={fadeUpVariants}>
              <HookSelector selected={selectedHook} onChange={handleHookChange} />
            </motion.div>
          </motion.section>

          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
          >
            <motion.div className="flex items-center gap-4 mb-5" variants={fadeUpVariants}>
              <motion.span className="display text-3xl md:text-4xl text-(--muted) leading-none tabular-nums" variants={sectionNumVariants}>
                02
              </motion.span>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-(--ink)">Configure Swap</p>
                <p className="text-xs text-(--muted) mt-0.5">
                  {hookId && `${hookId.shortname} · ${hookId.type} hook`}
                  {selectedHook === "OFAHook" && " — try amounts below and above 50 to see auction trigger"}
                  {selectedHook === "SUBAHook" && " — all swaps are buffered regardless of size"}
                  {selectedHook === "PLTHook" && " — swap runs normally; fee split shown in result"}
                </p>
              </div>
            </motion.div>
            <motion.div className="max-w-lg mx-auto" variants={fadeUpVariants}>
              <SwapForm
                hookName={selectedHook}
                amount={amount}
                direction={direction}
                running={running}
                onAmountChange={(v) => { setAmount(v); setResult(null) }}
                onFlip={handleFlip}
                onSimulate={handleSimulate}
              />
            </motion.div>
          </motion.section>

          {(running || result) && (
            <section>
              <motion.div
                className="flex items-center gap-4 mb-5"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              >
                <span className="display text-3xl md:text-4xl text-(--muted) leading-none tabular-nums">03</span>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-(--ink)">V4 Execution Lifecycle</p>
                  <p className="text-xs text-(--muted) mt-0.5">Step-by-step callback trace — green = FIRED · muted = SKIP · orange = BUFFERED / PENDING</p>
                </div>
              </motion.div>
              {running ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border border-(--rule) bg-(--surface-1) p-10 text-center"
                >
                  <motion.div
                    className="flex items-center justify-center gap-3"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-(--signal)" />
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-(--muted)">
                      Simulating execution…
                    </p>
                    <span className="h-1.5 w-1.5 rounded-full bg-(--signal)" />
                  </motion.div>
                </motion.div>
              ) : result ? (
                <ExecutionTimeline steps={result.steps} />
              ) : null}
            </section>
          )}

          {result && !running && (
            <section>
              <motion.div
                className="flex items-center gap-4 mb-5"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, ease: "easeOut", delay: 0.1 }}
              >
                <span className="display text-3xl md:text-4xl text-(--muted) leading-none tabular-nums">04</span>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-(--ink)">Result</p>
                  <p className="text-xs text-(--muted) mt-0.5">Computed amounts · hook outcome · plain-English explanation</p>
                </div>
              </motion.div>
              <ResultPanel result={result} />
            </section>
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
                — anyone can attach them to their own pool.
                In Uniswap V4 the <span className="mono text-(--ink)">hooks</span> field of a{" "}
                <span className="mono text-(--ink)">PoolKey</span> is set once at{" "}
                <span className="mono text-(--ink)">initialize()</span> time. After that, every swap
                in that pool automatically runs the hook's logic — swappers need no special calldata.
                You bring your own token pair; you choose which hook protects or manages it.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-(--rule) border border-(--rule)">
              <UsageCard
                title="Add a hook to your pool"
                kind="Pool creator"
                body="When initializing a new V4 pool for any token pair, set the hooks field to one of our contract addresses. From that moment, every swap in your pool runs through the hook automatically — your LPs and traders get MEV protection, fee splitting, or batch clearing with no changes to the swap flow."
                code={`// One-time setup — this is where the hook is attached
poolManager.initialize(
  PoolKey({
    currency0:   Currency.wrap(YOUR_TOKEN_A),
    currency1:   Currency.wrap(YOUR_TOKEN_B),
    fee:         3000,
    tickSpacing: 60,
    hooks:       IHooks(OFA_HOOK_ADDRESS) // ← our hook contract
  }),
  SQRT_PRICE_1_1, // initial sqrtPriceX96
  ""              // hookData for afterInitialize
);
// Every swap in this pool now runs OFAHook.beforeSwap() automatically`}
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
                body="Submit a swap as normal. The hook buffers it as an ERC-6909 claim against PoolManager. At epoch boundary the designated keeper publishes a uniform clearing price and every buffered order in the batch settles at that one price."
                code={`// Users — submit a normal swap, automatically buffered
poolManager.swap(poolKey, params, "");

// Keeper — publish clearing price at epoch end
subaHook.settleEpoch(
  poolKey,
  clearingSqrtPriceX96,
  epochId
);`}
              />
            </div>
          </motion.section>

          <motion.div
            className="border border-(--rule) bg-(--surface-1) px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="flex-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-(--ink) mb-1">About this simulator</p>
              <p className="text-xs text-(--muted) leading-relaxed">
                Simulation uses simplified constant-product math with the deployed pool reserves (10,000 XHKB / 10,000 XHKA).
                Hook behavior (auction thresholds, fee splits, batch buffering) matches the deployed contract logic.
                No transaction is sent — this is a pure frontend simulation.
              </p>
            </div>
            <div className="flex flex-col gap-1 text-right shrink-0">
              <span className="eyebrow text-(--muted)">Pool</span>
              <span className="font-mono text-xs text-(--ink-2)">XHKB / XHKA · 0.3% · tickSpacing 60</span>
            </div>
          </motion.div>

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
}: {
  title: string
  kind: string
  body: string
  code: string
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
      <pre className="overflow-x-auto bg-(--surface-1) border border-(--rule) p-3 text-[11.5px] leading-relaxed mono text-(--ink) mt-1">
        <code>{code}</code>
      </pre>
    </div>
  )
}
