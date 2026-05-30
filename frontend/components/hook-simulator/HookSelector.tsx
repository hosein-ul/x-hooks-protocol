"use client"

import { useRef } from "react"
import { motion, useMotionValue, useSpring, type Variants } from "framer-motion"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { HOOK_ORDER, getHookIdentity } from "@/lib/constants"
import type { HookName } from "@/lib/simulation"

type Props = {
  selected: HookName
  onChange: (h: HookName) => void
}

const containerV: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}

const cardV: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
}

function MagneticCard({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  className?: string
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 350, damping: 28 })
  const springY = useSpring(y, { stiffness: 350, damping: 28 })

  function handleMouseMove(e: React.MouseEvent<HTMLButtonElement>) {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    x.set((e.clientX - cx) * 0.18)
    y.set((e.clientY - cy) * 0.18)
  }

  function handleMouseLeave() {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.button
      ref={ref}
      variants={cardV}
      style={{ x: springX, y: springY }}
      whileTap={{ scale: 0.97 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={cn(
        "group flex flex-col gap-3 p-5 text-left transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-(--signal) cursor-pointer",
        active
          ? "bg-(--surface-1) border-l-2 border-l-(--signal)"
          : "bg-(--surface-0) hover:bg-(--surface-1) border-l-2 border-l-transparent",
        className,
      )}
    >
      {children}
    </motion.button>
  )
}

export function HookSelector({ selected, onChange }: Props) {
  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-px bg-(--rule) border border-(--rule)"
      variants={containerV}
      initial="hidden"
      animate="visible"
    >
      {HOOK_ORDER.map((name) => {
        const id = getHookIdentity(name)
        if (!id) return null
        const { Icon } = id
        const active = selected === name

        return (
          <MagneticCard key={name} active={active} onClick={() => onChange(name as HookName)}>
            <div className="flex items-start justify-between gap-2">
              <motion.span
                className={cn(
                  "display text-3xl leading-none",
                  active ? "text-(--signal)" : "text-(--muted) group-hover:text-(--ink-2)",
                )}
                animate={active ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                {id.ordinal}
              </motion.span>
              <motion.div
                animate={active ? { rotate: [0, 8, -4, 0] } : { rotate: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <Icon className={cn(
                  "h-4 w-4 mt-1 shrink-0 transition-colors",
                  active ? "text-(--signal)" : "text-(--muted) group-hover:text-(--ink-2)",
                )} />
              </motion.div>
            </div>

            <div>
              <p className={cn(
                "font-mono text-[11px] uppercase tracking-[0.16em] font-semibold mb-1 transition-colors",
                active ? "text-(--ink)" : "text-(--ink-2)",
              )}>
                {id.shortname}
              </p>
              <p className="text-xs text-(--muted) leading-snug line-clamp-2">{id.tagline}</p>
            </div>

            {/* Morphing badge */}
            <motion.div
              layout
              animate={active ? { opacity: 1, scale: 1 } : { opacity: 0.7, scale: 0.95 }}
              transition={{ duration: 0.25 }}
            >
              <Badge variant={active ? "signal" : "outline"}>{id.type}</Badge>
            </motion.div>

            {/* Active indicator line */}
            {active && (
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-(--signal)"
                layoutId="activeHookLine"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </MagneticCard>
        )
      })}
    </motion.div>
  )
}
