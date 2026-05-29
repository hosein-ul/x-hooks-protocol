"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { HOOK_ORDER, getHookIdentity } from "@/lib/constants"
import type { HookName } from "@/lib/simulation"

type Props = {
  selected: HookName
  onChange: (h: HookName) => void
}

export function HookSelector({ selected, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-px bg-(--rule) border border-(--rule)">
      {HOOK_ORDER.map((name) => {
        const id = getHookIdentity(name)
        if (!id) return null
        const { Icon } = id
        const active = selected === name

        return (
          <motion.button
            key={name}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onChange(name as HookName)}
            className={cn(
              "group flex flex-col gap-3 p-5 text-left transition-colors focus:outline-none",
              active
                ? "bg-(--surface-1) border-l-2 border-l-(--signal)"
                : "bg-(--surface-0) hover:bg-(--surface-1) border-l-2 border-l-transparent",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className={cn(
                "display text-3xl leading-none transition-colors",
                active ? "text-(--signal)" : "text-(--muted) group-hover:text-(--ink-2)",
              )}>
                {id.ordinal}
              </span>
              <Icon className={cn(
                "h-4 w-4 mt-1 shrink-0 transition-colors",
                active ? "text-(--signal)" : "text-(--muted) group-hover:text-(--ink-2)",
              )} />
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
            <Badge variant={active ? "signal" : "outline"}>{id.type}</Badge>
          </motion.button>
        )
      })}
    </div>
  )
}
