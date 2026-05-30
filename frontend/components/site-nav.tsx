"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useBlockNumber } from "wagmi"
import { ConnectButton } from "@rainbow-me/rainbowkit"
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
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-8 px-6">
        {/* ── Wordmark ── */}
        <Link href="/" className="flex items-baseline gap-2 font-bold tracking-tight">
          <span className="display text-lg">X·Hooks</span>
          <span className="eyebrow hidden sm:inline">Protocol</span>
        </Link>

        {/* ── Nav ── */}
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

        {/* ── Block counter ── */}
        {blockNumber != null && (
          <div className="hidden md:flex items-center gap-2 font-mono text-[11px] text-(--muted)">
            <span className="h-1.5 w-1.5 rounded-full dot-live" />
            <span className="uppercase tracking-[0.16em]">Block</span>
            <span className="text-(--ink-2)">#{blockNumber.toString()}</span>
          </div>
        )}

        <ThemeToggle />

        <ConnectButton chainStatus="icon" accountStatus="avatar" showBalance={false} />
      </div>
    </header>
  )
}
