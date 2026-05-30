"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useBlockNumber } from "wagmi"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/",           label: "Index" },
  { href: "/dashboard",  label: "Dashboard" },
  { href: "/demo",       label: "Simulator" },
  { href: "/contracts",  label: "Contracts" },
] as const

export function SiteNav() {
  const path = usePathname()
  const { data: blockNumber } = useBlockNumber({ watch: true })

  return (
    <header className="sticky top-0 z-40 border-b border-(--rule) bg-(--surface-0)/85 backdrop-blur-xl">
      {/* Top bar */}
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-4 md:gap-8 md:px-6">
        {/* ── Wordmark ── */}
        <Link href="/" className="flex items-baseline gap-2 font-bold tracking-tight shrink-0">
          <span className="display text-lg">X·Hooks</span>
          <span className="eyebrow hidden sm:inline">Protocol</span>
        </Link>

        {/* ── Desktop nav ── */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? path === "/"
                : path.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors",
                  active ? "text-(--ink)" : "text-(--muted) hover:text-(--ink)",
                )}
              >
                {item.label}
                {active && (
                  <span className="block h-px bg-(--ink) mt-[1px]" aria-hidden />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="flex-1" />

        {/* ── Block counter (desktop) ── */}
        {blockNumber != null && (
          <div className="hidden md:flex items-center gap-2 font-mono text-[11px] text-(--muted)">
            <span className="h-1.5 w-1.5 rounded-full dot-live" />
            <span className="uppercase tracking-[0.16em]">Block</span>
            <span className="text-(--ink-2)">#{blockNumber.toString()}</span>
          </div>
        )}

        <ThemeToggle />
      </div>

      {/* ── Mobile nav strip ── */}
      <nav
        className="md:hidden flex items-center gap-1 overflow-x-auto border-t border-(--rule) px-4 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? path === "/"
              : path.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
                active ? "text-(--ink)" : "text-(--muted) hover:text-(--ink)",
              )}
            >
              {item.label}
              {active && (
                <span className="block h-px bg-(--ink) mt-[1px]" aria-hidden />
              )}
            </Link>
          )
        })}
        <span className="flex-1" />
        {blockNumber != null && (
          <span className="shrink-0 font-mono text-[10px] text-(--muted) uppercase tracking-[0.14em] flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full dot-live" />
            #{blockNumber.toString()}
          </span>
        )}
      </nav>
    </header>
  )
}
