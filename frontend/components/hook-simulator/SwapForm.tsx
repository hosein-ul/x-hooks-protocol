"use client"

import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { HookName } from "@/lib/simulation"

type Direction = "zeroForOne" | "oneForZero"

type Props = {
  hookName: HookName
  amount: string
  direction: Direction
  running: boolean
  onAmountChange: (v: string) => void
  onFlip: () => void
  onSimulate: () => void
}

const TOKEN = { zero: "XHKB", one: "XHKA" }

export function SwapForm({
  amount,
  direction,
  running,
  onAmountChange,
  onFlip,
  onSimulate,
}: Props) {
  const tokenIn  = direction === "zeroForOne" ? TOKEN.zero : TOKEN.one
  const tokenOut = direction === "zeroForOne" ? TOKEN.one  : TOKEN.zero

  return (
    <div className="border border-(--rule) bg-(--surface-1) p-6 flex flex-col gap-4">
      {/* From */}
      <div className="flex flex-col gap-1.5">
        <label className="eyebrow text-(--muted)">From</label>
        <div className="flex items-center gap-3 border border-(--rule) bg-(--surface-0) px-4 py-3 focus-within:border-(--ink) transition-colors">
          <input
            type="number"
            min="0.001"
            max="9999"
            step="any"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder="0.00"
            className="flex-1 bg-transparent font-mono text-xl text-(--ink) outline-none placeholder:text-(--muted) [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="font-mono text-sm font-semibold text-(--ink-2) uppercase tracking-widest">
            {tokenIn}
          </span>
        </div>
      </div>

      {/* Flip */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-(--rule)" />
        <button
          onClick={onFlip}
          className="h-8 w-8 border border-(--rule) flex items-center justify-center text-(--muted) hover:text-(--ink) hover:border-(--ink) transition-colors"
          aria-label="Flip direction"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1 h-px bg-(--rule)" />
      </div>

      {/* To */}
      <div className="flex flex-col gap-1.5">
        <label className="eyebrow text-(--muted)">To (estimated)</label>
        <div className="flex items-center gap-3 border border-(--rule) bg-(--surface-0)/50 px-4 py-3">
          <span className="flex-1 font-mono text-xl text-(--muted)">—</span>
          <span className="font-mono text-sm font-semibold text-(--ink-2) uppercase tracking-widest">
            {tokenOut}
          </span>
        </div>
      </div>

      {/* Pool info row */}
      <div className="flex items-center justify-between text-[11px] font-mono text-(--muted) uppercase tracking-[0.14em]">
        <span>Fee: 0.30%</span>
        <span>Pool liquidity: 10,000 / 10,000</span>
        <span>tickSpacing: 60</span>
      </div>

      <Button
        variant="signal"
        size="lg"
        className="w-full"
        onClick={onSimulate}
        disabled={running || !amount || Number(amount) <= 0}
      >
        {running ? "Simulating…" : "Simulate Swap"}
      </Button>
    </div>
  )
}
