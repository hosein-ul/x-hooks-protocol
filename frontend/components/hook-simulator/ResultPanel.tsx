"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { getHookIdentity } from "@/lib/constants"
import type { SimResult } from "@/lib/simulation"

type Props = {
  result: SimResult
}

export function ResultPanel({ result }: Props) {
  const {
    hookName,
    amountIn,
    tokenIn,
    tokenOut,
    amountOut,
    priceImpact,
    outcomeTitle,
    outcomeBody,
    feeSplit,
  } = result

  const id = getHookIdentity(hookName)
  const slug = hookName.toLowerCase().replace("hook", "-hook").replace("--", "-")

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="border border-(--rule) bg-(--surface-1)"
    >
      {/* Header row */}
      <div className="border-b border-(--rule) px-6 py-4 flex items-center gap-4">
        {id && <id.Icon className="h-5 w-5 text-(--signal) shrink-0" />}
        <div className="flex-1">
          <p className="eyebrow text-(--muted)">Simulation result · {hookName}</p>
          <p className="font-mono text-sm font-semibold text-(--ink) mt-0.5">{outcomeTitle}</p>
        </div>
        {id && <Badge variant="signal">{id.type}</Badge>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-(--rule)">
        {/* Amounts */}
        <div className="bg-(--surface-0) p-6 flex flex-col gap-4">
          <p className="eyebrow text-(--muted)">Swap amounts</p>
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-2xl text-(--ink)">{amountIn.toFixed(4)}</span>
              <span className="eyebrow text-(--muted)">{tokenIn} in</span>
            </div>
            <div className="w-px h-6 bg-(--rule) ml-2" />
            <div className="flex items-baseline gap-3">
              {amountOut !== null ? (
                <>
                  <span className="font-mono text-2xl text-(--gain)">{amountOut.toFixed(4)}</span>
                  <span className="eyebrow text-(--muted)">{tokenOut} out</span>
                </>
              ) : (
                <>
                  <span className="font-mono text-2xl text-(--signal)">Pending</span>
                  <span className="eyebrow text-(--muted)">{tokenOut} (deferred)</span>
                </>
              )}
            </div>
          </div>

          <div className="border-t border-(--rule) pt-4 grid grid-cols-2 gap-4">
            <Stat label="Price impact" value={`${priceImpact.toFixed(3)}%`} warn={priceImpact > 1} />
            <Stat label="Pool fee" value="0.30%" />
          </div>
        </div>

        {/* Outcome explanation */}
        <div className="bg-(--surface-0) p-6 flex flex-col gap-4">
          <p className="eyebrow text-(--muted)">What happened</p>
          <p className="text-sm text-(--ink-2) leading-relaxed">{outcomeBody}</p>

          {/* PLT fee split */}
          {feeSplit && (
            <div className="border border-(--rule) p-4 grid grid-cols-3 gap-3 mt-auto">
              <FeeCell label="Total fee" value={feeSplit.total.toFixed(4)} unit={tokenIn} />
              <FeeCell label="Senior (70%)" value={feeSplit.senior.toFixed(4)} unit={tokenIn} variant="gain" />
              <FeeCell label="Junior (30%)" value={feeSplit.junior.toFixed(4)} unit={tokenIn} variant="signal" />
            </div>
          )}

          {/* Link to hook detail */}
          <Link
            href={`/hooks/${slug}`}
            className="mt-auto self-start flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-(--muted) hover:text-(--ink) transition-colors"
          >
            Deep dive into {hookName}
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="eyebrow text-(--muted)">{label}</span>
      <span className={cn("font-mono text-sm font-semibold", warn ? "text-(--signal)" : "text-(--ink)")}>
        {value}
      </span>
    </div>
  )
}

function FeeCell({ label, value, unit, variant }: { label: string; value: string; unit: string; variant?: "gain" | "signal" }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="eyebrow text-(--muted) text-[9px]">{label}</span>
      <span className={cn(
        "font-mono text-xs font-semibold",
        variant === "gain"   ? "text-(--gain)"   :
        variant === "signal" ? "text-(--signal)"  :
        "text-(--ink)",
      )}>
        {value}
      </span>
      <span className="font-mono text-[9px] text-(--muted)">{unit}</span>
    </div>
  )
}
