import * as React from "react"
import { cn } from "@/lib/utils"

type Variant = "default" | "outline" | "signal" | "gain" | "ghost"

const variants: Record<Variant, string> = {
  default: "bg-(--surface-2) text-(--ink)",
  outline: "border border-(--rule) text-(--muted)",
  signal:  "bg-(--signal)/12 text-(--signal) border border-(--signal)/30",
  gain:    "bg-(--gain)/14 text-(--gain) border border-(--gain)/30",
  ghost:   "text-(--muted)",
}

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: Variant }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em]",
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
