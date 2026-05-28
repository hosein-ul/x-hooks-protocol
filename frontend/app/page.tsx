"use client"

import Link from "next/link"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import { useBlockNumber } from "wagmi"
import { Button } from "@/components/ui/button"
import { AddressBlock } from "@/components/address-block"
import { Marquee } from "@/components/marquee"
import { SwapFlow } from "@/components/swap-flow"
import { HookRow } from "@/components/hook-row"
import { SiteNav } from "@/components/site-nav"
import { SiteFooter } from "@/components/site-footer"
import {
  HOOK_ORDER,
  HOOK_ADDRESSES,
  POOL_MANAGER,
} from "@/lib/constants"
import { useAllHookInfos, useRegistryStats } from "@/hooks/useHookRegistry"

export default function LandingPage() {
  const { data: blockNumber } = useBlockNumber({ watch: true })
  const { infos } = useAllHookInfos()
  const { hookCount, poolCount } = useRegistryStats()

  const totalInteractions = infos.reduce((sum, h) => sum + Number(h.totalInteractions), 0)
  const liveHookCount = hookCount != null ? Number(hookCount) : 5
  const livePoolCount = poolCount != null ? Number(poolCount) : 5

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />

      <main className="flex-1">

        {/* HERO — editorial masthead */}
        <section className="border-b border-(--rule)">
          <div className="mx-auto max-w-[1400px] px-6 pt-16 pb-12 md:pt-24 md:pb-20">
            {/* Eyebrow row */}
            <div className="flex flex-wrap items-baseline gap-4 mb-10">
              <span className="eyebrow">Vol. I · No. 01</span>
              <span className="eyebrow text-(--ink-2)">X Layer Mainnet · Chain 196</span>
              <span className="eyebrow text-(--ink-2)">May 2025</span>
              <span className="flex-1" />
              {blockNumber != null && (
                <span className="font-mono text-[11px] text-(--muted) uppercase tracking-[0.18em]">
                  <span className="dot-live inline-block h-1.5 w-1.5 rounded-full mr-2 align-middle" />
                  Block #{blockNumber.toString()}
                </span>
              )}
            </div>

            {/* Massive editorial title */}
            <h1 className="display text-[clamp(3rem,11vw,9.5rem)] leading-[0.88] tracking-[-0.04em]">
              The hook<br />
              <span className="display-italic">primitive</span> press.
            </h1>

            {/* Subhead + CTAs */}
            <div className="mt-12 grid grid-cols-12 gap-8">
              <div className="col-span-12 md:col-span-7">
                <p className="text-lg leading-relaxed text-(--ink-2) md:text-xl">
                  Five production-grade Uniswap V4 hooks on X Layer.
                  Sealed orderflow auctions, bilateral OTC settlement,
                  CDP-style LP tranching, sealed-bid batch auctions,
                  and collateral-backed forward orders —
                  composed into a single registry and exposed through one PoolManager.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Button asChild size="lg">
                    <Link href="/dashboard">
                      Open Terminal <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/contracts">
                      Verifiable Contracts
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Stats column */}
              <div className="col-span-12 md:col-span-5 grid grid-cols-2 gap-px bg-(--rule) border border-(--rule)">
                <Stat label="Hooks Deployed" value={liveHookCount.toString().padStart(2, "0")} />
                <Stat label="Pools Registered" value={livePoolCount.toString().padStart(2, "0")} />
                <Stat
                  label="Interactions"
                  value={totalInteractions > 0 ? totalInteractions.toLocaleString() : "—"}
                />
                <Stat label="Chain" value="X-LAYER" sub="196" />
              </div>
            </div>
          </div>
        </section>

        {/* MARQUEE ticker */}
        <Marquee
          items={[
            <><span className="text-(--signal)">●</span> LIVE</>,
            <>X·HOOKS PROTOCOL</>,
            <>UNISWAP V4 · CANCUN EVM</>,
            <>POOL MANAGER · {POOL_MANAGER.slice(0, 10)}…</>,
            <>OFA · BCS · PLT · SUBA · CAL</>,
            <>OKX BUILD-X HACKATHON 2025</>,
            <>SOLIDITY 0.8.26 · VIA-IR</>,
            <>FIVE HOOKS · ONE REGISTRY</>,
          ]}
        />

        {/* SECTION — swap flow */}
        <section className="border-b border-(--rule)">
          <div className="mx-auto max-w-[1400px] px-6 py-16">
            <div className="grid grid-cols-12 gap-8 mb-10">
              <div className="col-span-12 md:col-span-3">
                <div className="eyebrow mb-3">Figure 01</div>
                <h2 className="display text-4xl md:text-5xl leading-[0.95]">
                  Anatomy of a<br /><span className="display-italic">v4 swap.</span>
                </h2>
              </div>
              <div className="col-span-12 md:col-span-7 md:col-start-6">
                <p className="text-base leading-relaxed text-(--ink-2)">
                  Every swap on Uniswap V4 passes through a deterministic six-phase pipeline.
                  Each X Hook intercepts the pipeline at a specific phase — never modifying the
                  core, only composing on top. The diagram below maps where each hook
                  takes control of the execution flow.
                </p>
              </div>
            </div>

            <SwapFlow />

            <div className="mt-6 grid grid-cols-12 gap-8">
              <div className="col-span-12 md:col-span-9 md:col-start-4">
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-xs text-(--muted) md:grid-cols-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-(--signal)" />
                    <span>Sealed intercept — execution paused, hook in control.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-(--ink)" />
                    <span>Atomic — settlement reverts on any failed leg.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-(--gain)" />
                    <span>Fallback — AMM continues if the hook abstains.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION — taxonomy / table of contents */}
        <section className="border-b border-(--rule)">
          <div className="mx-auto max-w-[1400px] px-6 pt-16 pb-2">
            <div className="grid grid-cols-12 gap-8 mb-8">
              <div className="col-span-12 md:col-span-3">
                <div className="eyebrow mb-3">Index</div>
                <h2 className="display text-4xl md:text-5xl leading-[0.95]">
                  The five<br /><span className="display-italic">primitives.</span>
                </h2>
              </div>
              <div className="col-span-12 md:col-span-7 md:col-start-6">
                <p className="text-base leading-relaxed text-(--ink-2)">
                  Each hook is a self-contained smart contract with a deterministic permission
                  mask, deployed via Create2 against the v4 PoolManager. Five primitives,
                  three execution categories. Read the technical sheet for each.
                </p>
              </div>
            </div>
          </div>

          <div className="border-y border-(--rule)">
            {HOOK_ORDER.map((name) => {
              const live = infos.find((i) => i.name === name)
              return (
                <HookRow
                  key={name}
                  name={name}
                  address={HOOK_ADDRESSES[name as keyof typeof HOOK_ADDRESSES]}
                  pools={live?.totalPoolsUsing}
                  interactions={live?.totalInteractions}
                />
              )
            })}
          </div>
        </section>

        {/* SECTION — colophon / architecture */}
        <section className="border-b border-(--rule)">
          <div className="mx-auto max-w-[1400px] px-6 py-20 grid grid-cols-12 gap-8">
            <div className="col-span-12 md:col-span-3">
              <div className="eyebrow mb-3">Colophon</div>
              <h2 className="display text-4xl md:text-5xl leading-[0.95]">
                Built like<br /><span className="display-italic">infrastructure.</span>
              </h2>
            </div>

            <div className="col-span-12 md:col-span-9 grid grid-cols-1 gap-x-12 gap-y-10 md:grid-cols-3">
              <Note number="01" title="Single registry, five hooks">
                The HookRegistry is an append-only on-chain catalogue. Every hook is
                registered with name, type, version, and deployer — and queryable from
                a single contract address.
              </Note>
              <Note number="02" title="Permissions baked into the address">
                Each hook contract is mined via Create2 so its <span className="mono text-(--ink)">address</span>{" "}
                encodes its permission mask. Anyone can verify which v4 callbacks a
                hook can fire just by reading its address bits.
              </Note>
              <Note number="03" title="ERC-6909 claims, sync / settle / take">
                Intercepts hold value as ERC-6909 claims against the PoolManager and
                resolve via the canonical{" "}
                <span className="mono text-(--ink)">sync → settle → take</span>{" "}
                pattern — no intermediary custody, no escrow.
              </Note>
              <Note number="04" title="Solidity 0.8.26 · via_ir">
                Compiled with{" "}
                <span className="mono text-(--ink)">via_ir</span>{" "}
                and 200-run optimizer on the cancun EVM target.
                Deterministic builds, ABI-stable across redeploys.
              </Note>
              <Note number="05" title="Sourcemaps for OKLink">
                Each contract ships a flattened source file ready for OKLink
                verification. Verifiable from the registry, byte-for-byte.
              </Note>
              <Note number="06" title="No multisig, no admin">
                The hooks themselves are non-upgradeable. Hook-specific keepers
                (SUBA epoch settlement) are role-scoped per pool, not global.
              </Note>
            </div>
          </div>
        </section>

        {/* SECTION — closing CTA */}
        <section className="bg-(--ink) text-(--surface-0)">
          <div className="mx-auto max-w-[1400px] px-6 py-16 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            <div>
              <div className="mono text-[11px] uppercase tracking-[0.18em] opacity-60 mb-3">
                Open the terminal
              </div>
              <h2 className="display text-5xl md:text-6xl leading-[0.95]">
                Live data,<br />
                <span className="display-italic">verified addresses,<br />zero handwaving.</span>
              </h2>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <AddressBlock
                label="Registry"
                address={HOOK_ADDRESSES.Registry}
                truncate={false}
                showExplorer
                className="opacity-90"
              />
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] hover:opacity-80"
              >
                Enter dashboard <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-(--surface-0) px-5 py-5">
      <div className="eyebrow mb-2">{label}</div>
      <div className="display text-3xl text-(--ink)">{value}</div>
      {sub && <div className="mono text-[11px] text-(--muted) mt-1">{sub}</div>}
    </div>
  )
}

function Note({
  number,
  title,
  children,
}: {
  number: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mono text-[11px] text-(--muted) tracking-[0.18em] mb-2">{number}</div>
      <h3 className="text-base font-medium text-(--ink) mb-2">{title}</h3>
      <p className="text-sm leading-relaxed text-(--ink-2)">{children}</p>
    </div>
  )
}
