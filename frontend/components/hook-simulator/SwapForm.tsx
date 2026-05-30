"use client"

import { motion, AnimatePresence } from "framer-motion"
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
const RESERVE = 10_000
// SUBA always buffers, OFA buffers above threshold — show note instead of estimate
const OFA_THRESHOLD = 50

function previewOut(amountIn: number): number {
  const withFee = amountIn * 9970
  return (withFee * RESERVE) / (RESERVE * 10000 + withFee)
}

export function SwapForm({
  hookName,
  amount,
  direction,
  running,
  onAmountChange,
  onFlip,
  onSimulate,
}: Props) {
  const tokenIn  = direction === "zeroForOne" ? TOKEN.zero : TOKEN.one
  const tokenOut = direction === "zeroForOne" ? TOKEN.one  : TOKEN.zero

  const amountNum = Number(amount)
  const validAmount = amount !== "" && Number.isFinite(amountNum) && amountNum > 0
  const willBuffer =
    hookName === "SUBAHook" ||
    (hookName === "OFAHook" && validAmount && amountNum >= OFA_THRESHOLD)
  const estimate = validAmount ? previewOut(amountNum) : null
  const estimateLabel = !validAmount
    ? "—"
    : willBuffer
      ? "pending"
      : estimate!.toFixed(4)

  return (
    <motion.div
      className="border border-(--rule) bg-(--surface-1) p-6 flex flex-col gap-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* From */}
      <div className="flex flex-col gap-1.5">
        <label className="eyebrow text-(--muted)">From</label>
        <div className="flex items-center gap-3 border border-(--rule) bg-(--surface-0) px-4 py-3 transition-colors focus-within:border-(--ink)">
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
          <AnimatePresence mode="wait">
            <motion.span
              key={tokenIn}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="font-mono text-sm font-semibold text-(--ink-2) uppercase tracking-widest"
            >
              {tokenIn}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      {/* Flip */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-(--rule)" />
        <motion.button
          onClick={onFlip}
          whileHover={{ scale: 1.1, rotate: 180 }}
          whileTap={{ scale: 0.92, rotate: 180 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="h-8 w-8 border border-(--rule) flex items-center justify-center text-(--muted) hover:text-(--ink) hover:border-(--ink) transition-colors"
          aria-label="Flip direction"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
        </motion.button>
        <div className="flex-1 h-px bg-(--rule)" />
      </div>

      {/* To */}
      <div className="flex flex-col gap-1.5">
        <label className="eyebrow text-(--muted)">To (estimated)</label>
        <div className="flex items-center gap-3 border border-(--rule) bg-(--surface-0)/50 px-4 py-3">
          <AnimatePresence mode="wait">
            <motion.span
              key={estimateLabel}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={cn(
                "flex-1 font-mono text-xl tabular-nums",
                validAmount && !willBuffer ? "text-(--ink)" : "text-(--muted)",
              )}
            >
              {estimateLabel}
            </motion.span>
          </AnimatePresence>
          <AnimatePresence mode="wait">
            <motion.span
              key={tokenOut}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="font-mono text-sm font-semibold text-(--ink-2) uppercase tracking-widest"
            >
              {tokenOut}
            </motion.span>
          </AnimatePresence>
        </div>
        {willBuffer && (
          <p className="font-mono text-[10px] text-(--signal) uppercase tracking-[0.14em]">
            {hookName === "SUBAHook"
              ? "Buffered — settled at epoch clearing price"
              : `Auction triggered (≥ ${OFA_THRESHOLD} ${tokenIn}) — solver-filled, price ≥ AMM`}
          </p>
        )}
      </div>

      {/* Pool info row */}
      <div className="flex items-center justify-between text-[11px] font-mono text-(--muted) uppercase tracking-[0.14em]">
        <span>Fee: 0.30%</span>
        <span>Pool liquidity: 10,000 / 10,000</span>
        <span>tickSpacing: 60</span>
      </div>

      <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
        <Button
          variant="signal"
          size="lg"
          className="w-full"
          onClick={onSimulate}
          disabled={running || !amount || Number(amount) <= 0}
        >
          <AnimatePresence mode="wait">
            {running ? (
              <motion.span
                key="running"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <motion.span
                  className="h-1.5 w-1.5 rounded-full bg-current"
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ duration: 0.7, repeat: Infinity }}
                />
                Simulating…
              </motion.span>
            ) : (
              <motion.span
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Simulate Swap
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>
    </motion.div>
  )
}
