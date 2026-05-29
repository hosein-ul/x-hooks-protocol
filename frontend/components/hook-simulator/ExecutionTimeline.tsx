"use client"

import { motion, AnimatePresence, type Variants } from "framer-motion"
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

const statusGlow: Record<StepStatus, string> = {
  FIRED:    "shadow-[0_0_12px_rgba(0,200,100,0.25)]",
  SKIP:     "",
  BUFFERED: "shadow-[0_0_12px_rgba(255,140,0,0.25)]",
  PENDING:  "shadow-[0_0_8px_rgba(255,140,0,0.15)]",
}

const containerV: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.2 } },
}

const cardV: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
  },
}

function KineticLabel({ text }: { text: string }) {
  return (
    <span>
      {text.split("").map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut", delay: i * 0.02 }}
          className="inline-block"
          style={{ whiteSpace: char === " " ? "pre" : undefined }}
        >
          {char === " " ? " " : char}
        </motion.span>
      ))}
    </span>
  )
}

function StatusBadge({ status }: { status: StepStatus }) {
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={status}
        layout
        initial={{ opacity: 0, scale: 0.8, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 4 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "self-start px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] border",
          statusStyles[status],
        )}
      >
        {status}
      </motion.span>
    </AnimatePresence>
  )
}

function PulseDot({ status }: { status: StepStatus }) {
  const shouldPulse = status === "FIRED" || status === "BUFFERED"
  return (
    <div className="relative h-2 w-2 shrink-0">
      {shouldPulse && (
        <motion.span
          className={cn("absolute inset-0 rounded-full", statusDot[status])}
          animate={{ scale: [1, 1.9, 1], opacity: [0.8, 0, 0.8] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <span className={cn("absolute inset-0 rounded-full", statusDot[status])} />
    </div>
  )
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
        <motion.div
          key={step.id}
          variants={cardV}
          className={cn("relative bg-(--surface-0) transition-shadow", statusGlow[step.status])}
        >
          {i < steps.length - 1 && (
            <motion.div
              className="hidden md:block absolute -right-[7px] top-1/2 -translate-y-1/2 z-10 w-3.5 h-3.5 border-t border-r border-(--rule) bg-(--surface-0) rotate-45"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.2 + 0.3, duration: 0.3, ease: "backOut" }}
            />
          )}

          <div className="p-4 flex flex-col gap-3 h-full">
            <div className="flex items-center justify-between gap-2">
              <motion.span
                className="font-mono text-[10px] text-(--muted) uppercase tracking-[0.18em] tabular-nums"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.2 + 0.1 }}
              >
                {String(i + 1).padStart(2, "0")}
              </motion.span>
              <PulseDot status={step.status} />
            </div>

            <div>
              <p className="font-mono text-[11px] font-semibold text-(--ink) uppercase tracking-[0.14em]">
                <KineticLabel text={step.label} />
              </p>
              <motion.p
                className="text-[11px] text-(--muted) mt-0.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.2 + 0.25 }}
              >
                {step.sublabel}
              </motion.p>
            </div>

            <StatusBadge status={step.status} />

            {step.note && (
              <motion.p
                className="text-[11px] text-(--ink-2) leading-snug border-t border-(--rule) pt-3 mt-auto"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.2 + 0.4 }}
              >
                {step.note}
              </motion.p>
            )}
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}
