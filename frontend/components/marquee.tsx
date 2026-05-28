"use client"

import { ReactNode } from "react"

type Props = {
  items: ReactNode[]
  /** seconds for one loop */
  duration?: number
}

export function Marquee({ items, duration = 60 }: Props) {
  const repeated = [...items, ...items]
  return (
    <div className="relative overflow-hidden border-y border-(--rule) bg-(--surface-1)">
      <div
        className="marquee-track flex w-max items-center gap-12 whitespace-nowrap px-6 py-3"
        style={{ animationDuration: `${duration}s` }}
      >
        {repeated.map((item, i) => (
          <div key={i} className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-(--ink-2)">
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}
