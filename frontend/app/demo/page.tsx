"use client"

import { useState } from "react"
import { SiteNav } from "@/components/site-nav"
import { SiteFooter } from "@/components/site-footer"
import { HookSelector } from "@/components/hook-simulator/HookSelector"
import { SwapForm } from "@/components/hook-simulator/SwapForm"
import { ExecutionTimeline } from "@/components/hook-simulator/ExecutionTimeline"
import { ResultPanel } from "@/components/hook-simulator/ResultPanel"
import { simulateSwap, type HookName, type SimResult } from "@/lib/simulation"
import { getHookIdentity } from "@/lib/constants"

type Direction = "zeroForOne" | "oneForZero"

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
    await new Promise((r) => setTimeout(r, 600))
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
        {/* Header */}
        <section className="border-b border-(--rule)">
          <div className="mx-auto max-w-[1400px] px-6 pt-8 pb-10">
            <div className="flex items-baseline gap-4 mb-6">
              <span className="eyebrow">Hook Simulator</span>
              <span className="eyebrow text-(--muted)">Frontend simulation · No wallet required</span>
            </div>
            <h1 className="display text-[clamp(2.2rem,6vw,5rem)] leading-[0.9] tracking-[-0.03em] mb-4">
              See what <span className="display-italic">your swap</span>
              <br />triggers on-chain.
            </h1>
            <p className="max-w-2xl text-base text-(--ink-2) leading-relaxed">
              Pick a hook, enter a swap amount, and watch the Uniswap V4 execution
              lifecycle animate step by step — showing exactly which callbacks fire,
              what each hook does, and what you receive. Uses the deployed pool
              parameters (XHKB/XHKA, fee 0.3%, tickSpacing 60).
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-[1400px] px-6 py-10 flex flex-col gap-10">

          {/* 01 — Hook selector */}
          <section>
            <div className="flex items-center gap-4 mb-4">
              <span className="display text-4xl text-(--muted) leading-none">01</span>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-(--ink)">Choose a Hook / Pool</p>
                <p className="text-xs text-(--muted) mt-0.5">Each hook runs on the same XHKB/XHKA pool — different execution behavior</p>
              </div>
            </div>
            <HookSelector selected={selectedHook} onChange={handleHookChange} />
          </section>

          {/* 02 — Swap form */}
          <section>
            <div className="flex items-center gap-4 mb-4">
              <span className="display text-4xl text-(--muted) leading-none">02</span>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-(--ink)">Configure Swap</p>
                <p className="text-xs text-(--muted) mt-0.5">
                  {hookId && `${hookId.shortname} · ${hookId.type} hook`}
                  {selectedHook === "OFAHook" && " — try amounts below and above 50 to see auction trigger"}
                  {selectedHook === "SUBAHook" && " — all swaps are buffered regardless of size"}
                  {selectedHook === "PLTHook" && " — swap runs normally; fee split shown in result"}
                </p>
              </div>
            </div>
            <div className="max-w-lg">
              <SwapForm
                hookName={selectedHook}
                amount={amount}
                direction={direction}
                running={running}
                onAmountChange={(v) => { setAmount(v); setResult(null) }}
                onFlip={handleFlip}
                onSimulate={handleSimulate}
              />
            </div>
          </section>

          {/* 03 — Execution timeline */}
          {(running || result) && (
            <section>
              <div className="flex items-center gap-4 mb-4">
                <span className="display text-4xl text-(--muted) leading-none">03</span>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-(--ink)">V4 Execution Lifecycle</p>
                  <p className="text-xs text-(--muted) mt-0.5">Step-by-step callback trace — green = FIRED · muted = SKIP · orange = BUFFERED / PENDING</p>
                </div>
              </div>
              {running ? (
                <div className="border border-(--rule) bg-(--surface-1) p-8 text-center">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-(--muted)">
                    Simulating execution…
                  </p>
                </div>
              ) : result ? (
                <ExecutionTimeline steps={result.steps} />
              ) : null}
            </section>
          )}

          {/* 04 — Result */}
          {result && !running && (
            <section>
              <div className="flex items-center gap-4 mb-4">
                <span className="display text-4xl text-(--muted) leading-none">04</span>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-(--ink)">Result</p>
                  <p className="text-xs text-(--muted) mt-0.5">Computed amounts · hook outcome · plain-English explanation</p>
                </div>
              </div>
              <ResultPanel result={result} />
            </section>
          )}

          {/* Info strip */}
          <div className="border border-(--rule) bg-(--surface-1) px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
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
          </div>

        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
