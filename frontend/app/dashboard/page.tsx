"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useBlockNumber } from "wagmi"
import { ArrowUpRight, CircleCheck, Activity, Layers3, Boxes, Network } from "lucide-react"
import { SiteNav } from "@/components/site-nav"
import { SiteFooter } from "@/components/site-footer"
import { AddressBlock } from "@/components/address-block"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { KineticChars, KineticContainer } from "@/components/kinetic-text"
import {
  HOOK_ORDER,
  HOOK_ADDRESSES,
  POOL_MANAGER,
  POOL_TOKENS,
  getHookIdentity,
} from "@/lib/constants"
import { fmtNumber } from "@/lib/utils"

type HookStat = {
  hookAddress: string
  name: string
  description: string
  version: string
  deployer: string
  deployedAt: number
  isVerified: boolean
  isActive: boolean
  totalPoolsUsing: number
  totalInteractions: number
}

type StatsData = {
  hookCount: number
  poolCount: number
  totalInteractions: number
  hooks: HookStat[]
}

function useStats() {
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    try {
      const res = await fetch('/api/stats', { next: { revalidate: 30 } })
      if (res.ok) {
        const json = await res.json()
        if (!json.error) setData(json)
      }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    refetch()
    const id = setInterval(refetch, 30_000)
    return () => clearInterval(id)
  }, [refetch])

  return { data, loading }
}

export default function DashboardPage() {
  const { data: blockNumber } = useBlockNumber({ watch: true, chainId: 196 })
  const { data, loading } = useStats()

  const hookCount   = data?.hookCount   ?? 0
  const poolCount   = data?.poolCount   ?? 0
  const totalInter  = data?.totalInteractions ?? 0
  const hooks       = data?.hooks ?? []
  const verifiedCount = hooks.filter((h) => h.isVerified).length
  const activeCount   = hooks.filter((h) => h.isActive).length

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />

      <main className="flex-1 bg-(--surface-0)">

        {/* Section header strip */}
        <div className="border-b border-(--rule)">
          <div className="mx-auto max-w-[1400px] px-4 py-8 md:px-6 md:py-10 grid grid-cols-12 gap-5 md:gap-6 items-end">
            <div className="col-span-12 md:col-span-7">
              <div className="eyebrow mb-3">Section / Dashboard</div>
              <KineticContainer staggerChildren={0.03}>
                <h1 className="display text-4xl sm:text-5xl md:text-6xl leading-[0.95]">
                  <KineticChars text="Live " />
                  <KineticChars text="terminal." className="display-italic" baseDelay={5} />
                </h1>
              </KineticContainer>
              <p className="mt-3 max-w-xl text-sm text-(--ink-2)">
                Live on-chain state read directly from the HookRegistry on{" "}
                <span className="mono text-(--ink)">X Layer</span>.{" "}
                Refreshes every 30 seconds.
              </p>
            </div>

            <div className="col-span-12 md:col-span-5 flex md:justify-end gap-3 flex-wrap">
              <Badge variant={loading ? "outline" : "gain"}>
                {loading ? "Loading…" : "Live"}
              </Badge>
              <Badge variant="outline">Chain 196</Badge>
              <Badge variant="outline">
                Block #{blockNumber != null ? blockNumber.toString() : "—"}
              </Badge>
            </div>
          </div>
        </div>

        {/* KPI row */}
        <section className="border-b border-(--rule)">
          <div className="mx-auto max-w-[1400px] grid grid-cols-2 md:grid-cols-4">
            <Kpi
              label="Hooks Deployed"
              value={hookCount.toString().padStart(2, "0")}
              sub={`${verifiedCount} verified · ${activeCount} active`}
              Icon={Layers3}
            />
            <Kpi
              label="Pools Registered"
              value={poolCount.toString().padStart(2, "0")}
              sub="Live from HookRegistry"
              Icon={Boxes}
            />
            <Kpi
              label="Interactions"
              value={totalInter > 0 ? fmtNumber(totalInter) : "—"}
              sub="Aggregate across hooks"
              Icon={Activity}
            />
            <Kpi
              label="Pool Manager"
              value="v4"
              sub="Singleton · Cancun EVM"
              Icon={Network}
              last
            />
          </div>
        </section>

        {/* Hook grid */}
        <section className="border-b border-(--rule)">
          <div className="mx-auto max-w-[1400px] px-4 py-10 md:px-6 md:py-12">
            <div className="flex items-end justify-between mb-6">
              <div>
                <div className="eyebrow mb-2">Hooks</div>
                <h2 className="display text-3xl md:text-4xl">Protocol primitives</h2>
              </div>
              <Link
                href="/contracts"
                className="hidden md:inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-(--muted) hover:text-(--ink)"
              >
                Verifiable addresses <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-(--rule) border border-(--rule)">
              {HOOK_ORDER.map((name) => {
                const addr = HOOK_ADDRESSES[name as keyof typeof HOOK_ADDRESSES]
                const live = hooks.find((h) => h.name === name)
                return <HookCell key={name} name={name} address={addr} info={live} />
              })}
              <Link
                href="/contracts"
                className="group bg-(--surface-1) p-6 hover:bg-(--surface-2) transition-colors flex flex-col gap-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Network className="h-4 w-4 text-(--ink-2)" strokeWidth={1.5} />
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-(--muted)">
                      R · Registry
                    </span>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-(--muted) transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-(--ink)" />
                </div>
                <div>
                  <div className="display text-2xl">Catalogue</div>
                  <div className="text-sm text-(--ink-2) mt-1 leading-snug">
                    The on-chain index of every hook deployed by the protocol — append-only and queryable.
                  </div>
                </div>
                <div className="mt-auto">
                  <AddressBlock address={HOOK_ADDRESSES.Registry} truncate />
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* V4 Pools */}
        <section className="border-b border-(--rule)">
          <div className="mx-auto max-w-[1400px] px-4 py-10 md:px-6 md:py-12">
            <div className="flex items-end justify-between mb-6">
              <div>
                <div className="eyebrow mb-2">V4 Pools</div>
                <h2 className="display text-3xl md:text-4xl">Initialized pools</h2>
              </div>
              <Badge variant="outline" className="hidden md:inline-flex">
                fee 0.3% · spacing 60
              </Badge>
            </div>

            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-px bg-(--rule) border border-(--rule)">
              <TokenCell symbol="XHKB" name="X Hooks Token B" address={POOL_TOKENS.token0} role="token0" />
              <TokenCell symbol="XHKA" name="X Hooks Token A" address={POOL_TOKENS.token1} role="token1" />
            </div>

            <div className="border border-(--rule)">
              <div className="hidden md:grid grid-cols-12 px-5 py-3 border-b border-(--rule) bg-(--surface-1) text-[10px] uppercase tracking-[0.16em] text-(--muted) font-mono">
                <div className="col-span-3">Hook</div>
                <div className="col-span-4">Hook Address</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-2">Pair</div>
                <div className="col-span-1 text-right">Open</div>
              </div>
              {HOOK_ORDER.map((name) => {
                const id = getHookIdentity(name)
                if (!id) return null
                const addr = HOOK_ADDRESSES[name as keyof typeof HOOK_ADDRESSES]
                const { Icon } = id
                return (
                  <Link
                    key={name}
                    href={`/hooks/${name.toLowerCase()}`}
                    className="flex flex-col gap-2 md:grid md:grid-cols-12 md:items-center md:gap-0 px-4 py-3.5 md:px-5 border-b border-(--rule) last:border-b-0 hover:bg-(--surface-1) transition-colors"
                  >
                    <div className="md:col-span-3 flex items-center gap-3 min-w-0">
                      <Icon className="h-3.5 w-3.5 text-(--signal) shrink-0" strokeWidth={1.5} />
                      <span className="font-medium text-(--ink)">{id.shortname}</span>
                      <span className="font-mono text-[10px] text-(--muted) uppercase tracking-[0.14em]">
                        {id.ordinal}
                      </span>
                      <span className="md:hidden ml-auto">
                        <ArrowUpRight className="h-4 w-4 text-(--muted)" />
                      </span>
                    </div>
                    <div className="md:col-span-4">
                      <AddressBlock address={addr} truncate />
                    </div>
                    <div className="md:col-span-2 flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{id.type}</Badge>
                      <span className="md:hidden font-mono text-xs text-(--ink-2)">
                        XHKB / XHKA
                      </span>
                    </div>
                    <div className="hidden md:block md:col-span-2 font-mono text-xs text-(--ink-2)">
                      XHKB / XHKA
                    </div>
                    <div className="hidden md:flex md:col-span-1 justify-end">
                      <ArrowUpRight className="h-4 w-4 text-(--muted) group-hover:text-(--ink)" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        {/* Network */}
        <section>
          <div className="mx-auto max-w-[1400px] px-4 py-10 md:px-6 md:py-12 grid grid-cols-12 gap-6 md:gap-8">
            <div className="col-span-12 md:col-span-3">
              <div className="eyebrow mb-2">Network</div>
              <h2 className="display text-3xl md:text-4xl">X Layer Mainnet</h2>
            </div>
            <div className="col-span-12 md:col-span-9 grid grid-cols-2 md:grid-cols-4 gap-px bg-(--rule) border border-(--rule)">
              <Spec label="Chain ID" value="196" mono />
              <Spec label="Native" value="OKB" />
              <Spec label="EVM" value="Cancun" />
              <Spec label="Explorer" value="OKLink" />
              <Spec label="Compiler" value="0.8.26" mono />
              <Spec label="Optimizer" value="200 runs" mono />
              <Spec label="IR Pipeline" value="via_ir" mono />
              <Spec label="Pool Manager" value={POOL_MANAGER.slice(0, 8) + "…"} mono />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}

function Kpi({
  label,
  value,
  sub,
  Icon,
  last,
}: {
  label: string
  value: string
  sub?: string
  Icon: typeof Layers3
  last?: boolean
}) {
  return (
    <div className={`px-5 py-5 md:px-6 md:py-7 ${last ? "" : "md:border-r"} border-(--rule) border-b md:border-b-0`}>
      <div className="flex items-center gap-2 mb-3 text-(--muted)">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
        <span className="eyebrow">{label}</span>
      </div>
      <div className="display text-3xl sm:text-4xl md:text-5xl text-(--ink) leading-none">{value}</div>
      {sub && <div className="mt-2 font-mono text-[11px] text-(--muted)">{sub}</div>}
    </div>
  )
}

function HookCell({
  name,
  address,
  info,
}: {
  name: string
  address: `0x${string}`
  info: HookStat | undefined
}) {
  const id = getHookIdentity(name)
  if (!id) return null
  const { Icon, ordinal, shortname, type, headline, permissions } = id

  return (
    <Link
      href={`/hooks/${name.toLowerCase()}`}
      className="group bg-(--surface-0) p-6 hover:bg-(--surface-1) transition-colors flex flex-col gap-5"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-(--signal)" strokeWidth={1.5} />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-(--muted)">
            {ordinal} {type}
          </span>
        </div>
        <ArrowUpRight className="h-4 w-4 text-(--muted) transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-(--ink)" />
      </div>

      <div>
        <div className="display text-2xl">{shortname}</div>
        <div className="text-sm text-(--ink-2) mt-1 leading-snug">{headline}</div>
      </div>

      <div className="flex flex-wrap gap-1">
        {permissions.map((p) => (
          <span
            key={p}
            className="mono text-[10px] uppercase tracking-[0.14em] text-(--muted) bg-(--surface-2) px-1.5 py-0.5"
          >
            {p}
          </span>
        ))}
      </div>

      <Separator />

      <div className="grid grid-cols-3 gap-3">
        <Stat tiny label="Pools" value={info ? info.totalPoolsUsing.toString() : "—"} />
        <Stat tiny label="Calls" value={info ? fmtNumber(info.totalInteractions) : "—"} />
        <Stat
          tiny
          label="Status"
          value={info ? (info.isActive ? "Active" : "Idle") : "—"}
        />
      </div>

      <div className="flex items-center justify-between">
        <AddressBlock address={address} truncate />
        {info?.isVerified && (
          <span className="inline-flex items-center gap-1 mono text-[10px] uppercase tracking-[0.14em] text-(--gain)">
            <CircleCheck className="h-3 w-3" /> Verified
          </span>
        )}
      </div>
    </Link>
  )
}

function Stat({
  label,
  value,
  tiny,
}: {
  label: string
  value: string
  tiny?: boolean
}) {
  return (
    <div>
      <div className="mono text-[10px] uppercase tracking-[0.14em] text-(--muted) mb-1">
        {label}
      </div>
      <div className={tiny ? "text-base font-medium text-(--ink)" : "display text-2xl text-(--ink)"}>
        {value}
      </div>
    </div>
  )
}

function TokenCell({
  symbol,
  name,
  address,
  role,
}: {
  symbol: string
  name: string
  address: `0x${string}`
  role: string
}) {
  return (
    <div className="bg-(--surface-0) px-5 py-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="display text-3xl text-(--ink)">{symbol}</div>
        <div>
          <div className="text-sm text-(--ink-2)">{name}</div>
          <div className="mono text-[10px] uppercase tracking-[0.14em] text-(--muted) mt-0.5">{role}</div>
        </div>
      </div>
      <AddressBlock address={address} truncate />
    </div>
  )
}

function Spec({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-(--surface-0) px-5 py-4">
      <div className="eyebrow mb-2">{label}</div>
      <div className={mono ? "mono text-base text-(--ink)" : "text-base font-medium text-(--ink)"}>
        {value}
      </div>
    </div>
  )
}
