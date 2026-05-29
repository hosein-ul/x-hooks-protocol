"use client"

import { motion, type Variants } from "framer-motion"
import { cn } from "@/lib/utils"
import type { ExecStep, StepStatus } from "@/lib/simulation"

type Props = {
  steps: ExecStep[]
}

const statusStyles: Record<StepStatus, string> = {
  FIRED:    "bg-(--gain)/12 border-(--gain)/40 text-(--gain)",
  SKIP:     "bg-(--surface-2) border-(--rule) text-(--muted)",
  BUFFERED: "bg-(--signal)/12 border-(--signal)/40 text-(--signal)",
  PENDING:  "bg-(--signal)/8  border-(--signal)/30 text-(--signal)",
}

const statusDot: Record<StepStatus, string> = {
  FIRED:    "bg-(--gain)",
  SKIP:     "bg-(--muted)/40",
  BUFFERED: "bg-(--signal)",
  PENDING:  "bg-(--signal)/60",
}

const containerV: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.18 } },
}

const itemV: Variants = {
  hidden:   { opacity: 0, y: 20 },
  visible:  { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
}

export function ExecutionTimeline({ steps }: Props) {
  return (
    <motion.div
      key={steps.map((s) => s.id + s.status).join()}
      variants={containerV}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-5 gap-px bg-(--rule) border border-(--rule)"
    >
      {steps.map((step, i) => (
        <motion.div key={step.id} variants={itemV} className="relative bg-(--surface-0)">
          {/* Connector arrow (desktop) */}
          {i < steps.length - 1 && (
            <div className="hidden md:block absolute -right-[7px] top-1/2 -translate-y-1/2 z-10 w-3.5 h-3.5 border-t border-r border-(--rule) bg-(--surface-0) rotate-45" />
          )}

          <div className="p-4 flex flex-col gap-3 h-full">
            {/* Step index + status dot */}
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] text-(--muted) uppercase tracking-[0.18em]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className={cn(
                "h-2 w-2 rounded-full shrink-0",
                statusDot[step.status],
              )} />
            </div>

            {/* Label */}
            <div>
              <p className="font-mono text-[11px] font-semibold text-(--ink) uppercase tracking-[0.14em]">
                {step.label}
              </p>
              <p className="text-[11px] text-(--muted) mt-0.5">{step.sublabel}</p>
            </div>

            {/* Status badge */}
            <span className={cn(
              "self-start px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] border",
              statusStyles[step.status],
            )}>
              {step.status}
            </span>

            {/* Note */}
            {step.note && (
              <p className="text-[11px] text-(--ink-2) leading-snug border-t border-(--rule) pt-3 mt-auto">
                {step.note}
              </p>
            )}
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}
