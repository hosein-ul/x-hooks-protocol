"use client"

import Link from "next/link"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import { GithubIcon, XIcon } from "@/components/icons/brand"
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
  SOCIAL_LINKS,
  getHookIdentity,
} from "@/lib/constants"
import { useAllHookInfos, useRegistryStats } from "@/hooks/useHookRegistry"
import { motion, type Variants } from "framer-motion"

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}
const itemVariants: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: "easeOut" } },
}

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
        <section className="border-b border-(--rule) relative hero-bg">
          <div className="mx-auto max-w-[1400px] px-4 pt-6 pb-10 md:px-6 md:pt-10 md:pb-20 relative">
            {/* Eyebrow row */}
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 mb-8 md:mb-10">
              <span className="eyebrow">Vol. I · No. 01</span>
              <span className="eyebrow text-(--ink-2)">X Layer Mainnet · Chain 196</span>
              <span className="eyebrow text-(--ink-2)">May 2026</span>
              <span className="flex-1" />
              {blockNumber != null && (
                <span className="font-mono text-[11px] text-(--muted) uppercase tracking-[0.18em]">
                  <span className="dot-live inline-block h-1.5 w-1.5 rounded-full mr-2 align-middle" />
                  Block #{blockNumber.toString()}
                </span>
              )}
            </div>

            {/* Massive editorial title */}
            <motion.h1 className="display text-[clamp(2.5rem,12vw,9.5rem)] leading-[0.88] tracking-[-0.04em]">
              {["The", "hook"].map((word, i) => (
                <motion.span
                  key={word + i}
                  className="inline-block mr-[0.22em]"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: i * 0.1 }}
                >
                  {word}
                </motion.span>
              ))}
              <br />
              {[<span key="primitive" className="display-italic">primitive</span>, "press."].map((word, i) => (
                <motion.span
                  key={i}
                  className="inline-block mr-[0.18em]"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: (2 + i) * 0.1 }}
                >
                  {word}
                </motion.span>
              ))}
            </motion.h1>

            {/* Subhead + CTAs */}
            <div className="mt-10 md:mt-12 grid grid-cols-12 gap-6 md:gap-8">
              <div className="col-span-12 md:col-span-7">
                <p className="text-base leading-relaxed text-(--ink-2) md:text-xl">
                  Five production-grade Uniswap V4 hooks on X Layer.
                  Sealed orderflow auctions, bilateral OTC settlement,
                  CDP-style LP tranching, sealed-bid batch auctions,
                  and collateral-backed forward orders —
                  composed into a single registry and exposed through one PoolManager.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Button asChild size="lg" variant="signal">
                      <Link href="/demo">
                        Hook Simulator <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Button asChild size="lg">
                      <Link href="/dashboard">
                        Open Terminal <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Button asChild size="lg" variant="outline">
                      <Link href="/contracts">
                        Verifiable Contracts
                      </Link>
                    </Button>
                  </motion.div>
                </div>
              </div>

              {/* Stats column */}
              <motion.div
                className="col-span-12 md:col-span-5 grid grid-cols-2 gap-px bg-(--rule) border border-(--rule)"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
              >
                <Stat label="Hooks Deployed" value={liveHookCount.toString().padStart(2, "0")} />
                <Stat label="Pools Registered" value={livePoolCount.toString().padStart(2, "0")} />
                <Stat
                  label="Interactions"
                  value={totalInteractions > 0 ? totalInteractions.toLocaleString() : "—"}
                />
                <Stat label="Chain" value="X-LAYER" sub="196" />
              </motion.div>
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
            <>OKX BUILD-X HACKATHON 2026</>,
            <>SOLIDITY 0.8.26 · VIA-IR</>,
            <>FIVE HOOKS · ONE REGISTRY</>,
          ]}
        />

        {/* SECTION — swap flow */}
        <section className="border-b border-(--rule)">
          <motion.div
            className="mx-auto max-w-[1400px] px-4 py-10 md:px-6 md:py-16"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="grid grid-cols-12 gap-8 mb-10">
              <div className="col-span-12 md:col-span-3">
                <div className="eyebrow mb-3">Protocol</div>
                <h2 className="display text-[clamp(2rem,6vw,4.5rem)] leading-[0.92]">
                  <span className="display-italic">v4</span> swap.
                </h2>
              </div>
              <div className="col-span-12 md:col-span-9">
                <p className="text-base md:text-lg leading-relaxed text-(--ink-2) max-w-2xl">
                  Every swap on Uniswap V4 passes through a deterministic six-phase pipeline.
                  Each hook targets a specific phase — never modifying the core, only composing on top.
                  The diagram below maps where each hook takes control of the execution flow.
                </p>
              </div>
            </div>
            <SwapFlow />
            <p className="mt-5 text-[11px] font-mono text-(--muted) uppercase tracking-[0.14em]">
              Table · Transaction execution
            </p>
          </motion.div>
        </section>

        {/* SECTION — hook index */}
        <section className="border-b border-(--rule)">
          <div className="mx-auto max-w-[1400px] px-4 py-10 md:px-6 md:py-16">
            <motion.div
              className="grid grid-cols-12 gap-8 mb-10"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={containerVariants}
            >
              <motion.div className="col-span-12 md:col-span-3" variants={itemVariants}>
                <div className="eyebrow mb-3">Index</div>
                <h2 className="display text-[clamp(2rem,6vw,4.5rem)] leading-[0.92]">
                  Every hook, <span className="display-italic">explained.</span>
                </h2>
              </motion.div>
              <motion.div className="col-span-12 md:col-span-9" variants={itemVariants}>
                <p className="text-base md:text-lg leading-relaxed text-(--ink-2) max-w-2xl">
                  Each primitive solves a specific class of problem on a generic AMM — MEV leakage, missing OTC rails,
                  uniform fee-tier pools, fee-tier pools, fair price discovery, or collateral commitments. The following maps one problem
                  to one hook, explaining where it intercepts, what it changes, and how to use it.
                </p>
              </motion.div>
            </motion.div>

            <div className="border-t border-(--rule)">
              {HOOK_ORDER.map((name) => {
                const addr = HOOK_ADDRESSES[name as keyof typeof HOOK_ADDRESSES]
                if (!addr) return null
                return <HookRow key={name} name={name} address={addr} />
              })}
            </div>
          </div>
        </section>

        {/* SECTION — pool manager address */}
        <section className="border-b border-(--rule)">
          <div className="mx-auto max-w-[1400px] px-4 py-10 md:px-6 md:py-16">
            <div className="grid grid-cols-12 gap-8">
              <div className="col-span-12 md:col-span-3">
                <div className="eyebrow mb-3">Entrypoint</div>
                <h2 className="display text-[clamp(1.8rem,5vw,4rem)] leading-[0.92]">
                  One <span className="display-italic">manager.</span>
                </h2>
              </div>
              <div className="col-span-12 md:col-span-9">
                <p className="text-base leading-relaxed text-(--ink-2) mb-6 max-w-2xl">
                  All five hooks are registered against a single canonical <code className="mono text-sm bg-(--surface-2) px-1.5 py-0.5">PoolManager</code> deployment on X Layer Mainnet.
                  Every swap, liquidity operation, and hook interaction routes through this one address — no proxy, no upgradeability.
                </p>
                <div className="inline-flex items-center gap-4 border border-(--rule) bg-(--surface-1) px-5 py-4">
                  <span className="eyebrow">PoolManager</span>
                  <AddressBlock address={POOL_MANAGER} truncate={false} showExplorer />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION — social / links */}
        <section>
          <div className="mx-auto max-w-[1400px] px-4 py-10 md:px-6 md:py-16">
            <div className="grid grid-cols-12 gap-8">
              <div className="col-span-12 md:col-span-3">
                <div className="eyebrow mb-3">Community</div>
                <h2 className="display text-[clamp(1.8rem,5vw,4rem)] leading-[0.92]">
                  Stay <span className="display-italic">updated.</span>
                </h2>
              </div>
              <div className="col-span-12 md:col-span-9 flex flex-wrap gap-4">
                <a
                  href={SOCIAL_LINKS.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 border border-(--rule) px-5 py-3 text-sm font-medium text-(--ink) hover:bg-(--surface-1) transition-colors"
                >
                  <GithubIcon className="h-4 w-4" /> GitHub
                </a>
                <a
                  href={SOCIAL_LINKS.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 border border-(--rule) px-5 py-3 text-sm font-medium text-(--ink) hover:bg-(--surface-1) transition-colors"
                >
                  <XIcon className="h-4 w-4" /> Twitter
                </a>
              </div>
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
    <div className="bg-(--surface-1) px-4 py-4 md:px-6 md:py-6">
      <div className="eyebrow mb-2">{label}</div>
      <div className="display text-3xl sm:text-4xl md:text-5xl leading-none tabular-nums">{value}</div>
      {sub && <div className="font-mono text-xs text-(--muted) mt-1">{sub}</div>}
    </div>
  )
}
