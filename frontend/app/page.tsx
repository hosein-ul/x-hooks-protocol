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
        <section className="border-b border-(--rule) relative bg-(--surface-0) hero-bg">
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
          </motion.div>
        </section>

        {/* SECTION — taxonomy / table of contents */}
        <section className="border-b border-(--rule)">
          <motion.div
            className="mx-auto max-w-[1400px] px-4 pt-10 pb-2 md:px-6 md:pt-16"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
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
          </motion.div>

          <motion.div
            className="border-y border-(--rule)"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            {HOOK_ORDER.map((name) => {
              const live = infos.find((i) => i.name === name)
              return (
                <motion.div key={name} variants={itemVariants}>
                  <HookRow
                    name={name}
                    address={HOOK_ADDRESSES[name as keyof typeof HOOK_ADDRESSES]}
                    pools={live?.totalPoolsUsing}
                    interactions={live?.totalInteractions}
                  />
                </motion.div>
              )
            })}
          </motion.div>
        </section>

        {/* SECTION — DEEP DIVE */}
        <section className="border-b border-(--rule)">
          <motion.div
            className="mx-auto max-w-[1400px] px-4 py-12 md:px-6 md:py-20"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="grid grid-cols-12 gap-8 mb-12">
              <div className="col-span-12 md:col-span-3">
                <div className="eyebrow mb-3">Field guide</div>
                <h2 className="display text-4xl md:text-5xl leading-[0.95]">
                  Every hook,<br /><span className="display-italic">explained.</span>
                </h2>
              </div>
              <div className="col-span-12 md:col-span-7 md:col-start-6">
                <p className="text-base leading-relaxed text-(--ink-2)">
                  Each primitive solves a specific class of problem on a generic AMM —
                  MEV leakage, missing OTC rails, undifferentiated LP risk, fair price
                  discovery, native limit orders. Below is the long form for each one:
                  what it does, why it matters, where you would actually use it.
                </p>
              </div>
            </div>

            <div className="space-y-px bg-(--rule) border border-(--rule)">
              {HOOK_ORDER.map((name) => {
                const id = getHookIdentity(name)
                if (!id) return null
                return (
                  <HookDeepDive
                    key={name}
                    name={name}
                    ordinal={id.ordinal}
                    Icon={id.Icon}
                    shortname={id.shortname}
                    type={id.type}
                    headline={id.headline}
                    whyItMatters={id.whyItMatters}
                    mechanics={id.mechanics}
                    useCases={id.useCases}
                    permissions={id.permissions}
                  />
                )
              })}
            </div>
          </motion.div>
        </section>

        {/* SECTION — ABOUT */}
        <section className="border-b border-(--rule) bg-(--surface-1)">
          <motion.div
            className="mx-auto max-w-[1400px] px-4 py-12 md:px-6 md:py-20 grid grid-cols-12 gap-6 md:gap-8"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="col-span-12 md:col-span-3">
              <div className="eyebrow mb-3">About</div>
              <h2 className="display text-4xl md:text-5xl leading-[0.95]">
                More about<br /><span className="display-italic">the protocol.</span>
              </h2>
            </div>

            <div className="col-span-12 md:col-span-9 space-y-8">
              <div className="space-y-5 text-base md:text-lg leading-relaxed text-(--ink-2) max-w-3xl">
                <p>
                  <span className="text-(--ink) font-medium">X·Hooks Protocol</span> is a
                  catalogue of five production-grade Uniswap V4 hooks deployed on
                  X Layer Mainnet (chain 196). Each hook addresses a specific shortcoming
                  of a vanilla AMM — MEV extraction, missing OTC infrastructure, undifferentiated
                  LP risk, sniping-prone launches, and the absence of native limit orders —
                  and resolves it without modifying the core protocol.
                </p>
                <p>
                  Built from scratch for the OKX Build-X hackathon. No upgradability, no
                  admin keys, no governance. Every hook is deployed via Create2 so its
                  permission mask is encoded in the address itself, and every contract is
                  registered in a single on-chain <span className="mono text-(--ink)">HookRegistry</span>{" "}
                  so the catalogue is discoverable, byte-verifiable, and queryable from a
                  single read.
                </p>
                <p>
                  The frontend is a wagmi/Next.js dashboard that pins all reads to X Layer&apos;s
                  public RPC, so the displayed state is always the real chain state — not a
                  cached snapshot. Anyone can clone the repo, deploy the contracts to any
                  EVM that supports Uniswap V4, and stand up an identical interface.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-(--rule) border border-(--rule)">
                <Fact label="Network" value="X Layer Mainnet" sub="Chain ID 196" />
                <Fact label="Hooks shipped" value="05" sub="One registry · five primitives" />
                <Fact label="License" value="MIT" sub="Open source on GitHub" />
                <Fact label="Compiler" value="0.8.26" sub="cancun · via_ir · 200 runs" />
                <Fact label="Built for" value="OKX Build-X" sub="Hackathon 2026" />
                <Fact label="Status" value="Mainnet live" sub="Verifiable on OKLink" />
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href={SOCIAL_LINKS.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border border-(--rule) bg-(--surface-0) px-5 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-(--ink) hover:bg-(--surface-2)"
                >
                  <GithubIcon className="h-3.5 w-3.5" /> Repository
                </a>
                <a
                  href={SOCIAL_LINKS.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border border-(--rule) bg-(--surface-0) px-5 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-(--ink) hover:bg-(--surface-2)"
                >
                  <XIcon className="h-3.5 w-3.5" /> @XHooks_protocol
                </a>
                <Link
                  href="/contracts"
                  className="inline-flex items-center gap-2 border border-(--rule) bg-(--surface-0) px-5 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-(--ink) hover:bg-(--surface-2)"
                >
                  Verifiable Contracts <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </motion.div>
        </section>

        {/* SECTION — FAQ */}
        <section className="border-b border-(--rule)">
          <motion.div
            className="mx-auto max-w-[1400px] px-4 py-12 md:px-6 md:py-20 grid grid-cols-12 gap-6 md:gap-8"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="col-span-12 md:col-span-3">
              <div className="eyebrow mb-3">F·A·Q</div>
              <h2 className="display text-4xl md:text-5xl leading-[0.95]">
                Common<br /><span className="display-italic">questions.</span>
              </h2>
              <p className="mt-5 text-sm text-(--muted) max-w-xs">
                Quick answers about how the protocol works, where it runs, and how to use it.
              </p>
            </div>

            <div className="col-span-12 md:col-span-9">
              <dl className="divide-y divide-(--rule) border-y border-(--rule)">
                {FAQ.map((f, i) => (
                  <FaqItem key={i} number={String(i + 1).padStart(2, "0")} q={f.q} a={f.a} />
                ))}
              </dl>
            </div>
          </motion.div>
        </section>

        {/* SECTION — colophon */}
        <section className="border-b border-(--rule)">
          <motion.div
            className="mx-auto max-w-[1400px] px-4 py-12 md:px-6 md:py-20 grid grid-cols-12 gap-6 md:gap-8"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
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
          </motion.div>
        </section>

        {/* SECTION — on-chain manifest strip */}
        <section className="border-b border-(--rule)">
          <motion.div
            className="mx-auto max-w-[1400px] px-4 py-10 md:px-6 md:py-12"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <div className="eyebrow mb-2">On-Chain</div>
                <h2 className="display text-3xl md:text-4xl">
                  Contracts &amp; <span className="display-italic">pool IDs.</span>
                </h2>
              </div>
              <Link
                href="/contracts"
                className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-(--muted) hover:text-(--ink)"
              >
                Full manifest <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="border border-(--rule) mb-6">
              {([
                ["OFAHook",  "0xd2dbfc52093172c084f07489b035367c83ba38e143e21b1236ebe59202199cb6"],
                ["BCSHook",  "0x1202c5ade749da93a0f97449d92bc8bfd1db74cc11b49e2afc9051ca79964976"],
                ["PLTHook",  "0x57dcbf83710828f3d530daf53725c0faacc970afd0cb23e1965e21d3d5326f06"],
                ["SUBAHook", "0x600edb115d98e91142105e77f29eb1f87c05dbfa0bd7c0b800f62847feb746fa"],
                ["CALHook",  "0xa3dfc4b76570d536daa1b9154e0ffeebb530e1a637d53ea9debb5a8c0ac634fa"],
              ] as [string, string][]).map(([hookName, poolId]) => (
                <Link
                  key={hookName}
                  href={`/hooks/${hookName.toLowerCase()}`}
                  className="grid grid-cols-12 items-center gap-x-4 px-5 py-3.5 border-b border-(--rule) last:border-b-0 hover:bg-(--surface-1) transition-colors"
                >
                  <div className="col-span-3 md:col-span-2 text-sm font-medium text-(--ink)">{hookName}</div>
                  <div className="col-span-8 md:col-span-9 font-mono text-[11px] text-(--ink-2) break-all leading-snug">{poolId}</div>
                  <div className="col-span-1 flex justify-end">
                    <ArrowUpRight className="h-3.5 w-3.5 text-(--muted)" />
                  </div>
                </Link>
              ))}
            </div>
            <p className="text-xs font-mono text-(--muted) uppercase tracking-[0.14em]">
              Pool ID = keccak256(PoolKey) · XHKB / XHKA · fee 3000 · tickSpacing 60 ·{" "}
              <a href={`https://www.oklink.com/x-layer/address/${POOL_MANAGER}`} target="_blank" rel="noopener noreferrer" className="hover:text-(--ink) link-underline">
                PoolManager on OKLink ↗
              </a>
            </p>
          </motion.div>
        </section>

        {/* SECTION — closing CTA */}
        <section className="bg-(--ink) text-(--surface-0)">
          <div className="mx-auto max-w-[1400px] px-4 py-12 md:px-6 md:py-16 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
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

function Fact({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-(--surface-0) px-5 py-4">
      <div className="eyebrow mb-2">{label}</div>
      <div className="text-base font-medium text-(--ink) leading-tight">{value}</div>
      {sub && <div className="mono text-[11px] text-(--muted) mt-1">{sub}</div>}
    </div>
  )
}

function HookDeepDive({
  name,
  ordinal,
  Icon,
  shortname,
  type,
  headline,
  whyItMatters,
  mechanics,
  useCases,
  permissions,
}: {
  name: string
  ordinal: string
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  shortname: string
  type: string
  headline: string
  whyItMatters: string
  mechanics: string[]
  useCases: string[]
  permissions: string[]
}) {
  return (
    <article className="bg-(--surface-0) px-5 md:px-10 py-10 md:py-16 grid grid-cols-12 gap-6 md:gap-8">
      <div className="col-span-12 md:col-span-3">
        <div className="flex items-center gap-2 mb-4">
          <Icon className="h-4 w-4 text-(--signal)" strokeWidth={1.5} />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-(--muted)">
            {ordinal} {type}
          </span>
        </div>
        <h3 className="display text-5xl md:text-6xl leading-[0.92] tracking-[-0.02em]">
          {shortname}<span className="display-italic">.</span>
        </h3>
        <p className="mt-4 text-sm text-(--ink-2) leading-relaxed display">
          {headline}
        </p>
        <Link
          href={`/hooks/${name.toLowerCase()}`}
          className="mt-6 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-(--ink) link-underline"
        >
          Read the sheet <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="col-span-12 md:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
        <div>
          <div className="eyebrow mb-3">Why it matters</div>
          <p className="text-[15px] leading-relaxed text-(--ink-2)">{whyItMatters}</p>
        </div>

        <div>
          <div className="eyebrow mb-3">How it works</div>
          <ol className="space-y-3 text-[14px] leading-relaxed text-(--ink-2)">
            {mechanics.map((m, i) => (
              <li key={i} className="grid grid-cols-12 gap-3">
                <span className="col-span-1 mono text-(--muted) text-[12px]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="col-span-11">{m}</span>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <div className="eyebrow mb-3">Use cases</div>
          <ul className="space-y-2.5 text-[14px] leading-relaxed text-(--ink-2)">
            {useCases.map((u, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-2 inline-block h-1 w-3 shrink-0 bg-(--signal)" />
                <span>{u}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="eyebrow mb-3">V4 callbacks wired</div>
          <div className="flex flex-wrap gap-1.5">
            {permissions.map((p) => (
              <span
                key={p}
                className="mono text-[11px] uppercase tracking-[0.1em] border border-(--rule) px-2 py-1 text-(--ink-2)"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  )
}

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "What is X·Hooks Protocol?",
    a: "A catalogue of five production-grade Uniswap V4 hooks deployed on X Layer Mainnet. Each hook is a specialised smart contract that intercepts a stage of the V4 swap pipeline to add functionality the bare AMM lacks — sealed auctions, OTC settlement, LP tranching, batch auctions, and on-chain limit orders.",
  },
  {
    q: "Which network is the protocol live on?",
    a: (
      <>
        X Layer Mainnet (chain ID <span className="mono text-(--ink)">196</span>). The
        canonical PoolManager is <span className="mono text-(--ink)">0x360E…FB32</span>,
        and the HookRegistry is <span className="mono text-(--ink)">0xeBc9…D56D</span>.
        Both are queryable on OKLink.
      </>
    ),
  },
  {
    q: "Do I need to use a special router?",
    a: "No. Hooks attach to standard V4 pools, so any wallet or aggregator that swaps through the canonical PoolManager interacts with them automatically. Some hooks (PLT, CAL, BCS) accept extra parameters via hookData for richer behaviour, but the basic swap path is the same.",
  },
  {
    q: "Are the contracts upgradeable?",
    a: "No. Every hook is non-upgradeable, has no admin, and has no governance. The only privileged role is the SUBA epoch keeper, which is per-pool and only allowed to call settleEpoch — it cannot freeze, drain, or alter user funds.",
  },
  {
    q: "How do I verify a hook is what it claims to be?",
    a: "Each hook is deployed via Create2 so its permission mask is encoded in its address bits. Read the address, and you can verify which V4 callbacks the contract is allowed to fire. The HookRegistry pins the name, type, version, and deployer of each contract on-chain.",
  },
  {
    q: "Where can I see live activity?",
    a: (
      <>
        The <Link href="/dashboard" className="text-(--ink) link-underline">/dashboard</Link>{" "}
        page reads directly from the HookRegistry and PoolManager every 30 seconds.
        It shows pool counts, interaction counts, and the current block — all real chain
        state, no caching.
      </>
    ),
  },
  {
    q: "What was the protocol built for?",
    a: "X·Hooks Protocol was built from scratch for the OKX Build-X hackathon (2026). The goal was a single coherent suite of hooks demonstrating that V4 can host primitives previously thought to require off-chain infrastructure — MEV-resistant auctions, structured liquidity, native limit orders — while keeping the same trustless guarantees as a vanilla AMM.",
  },
  {
    q: "Is the code open source?",
    a: (
      <>
        Yes. The full repository — contracts, deployment scripts, frontend — is
        published under MIT on{" "}
        <a
          href={SOCIAL_LINKS.github}
          target="_blank"
          rel="noopener noreferrer"
          className="text-(--ink) link-underline"
        >
          GitHub
        </a>
        . Follow{" "}
        <a
          href={SOCIAL_LINKS.twitter}
          target="_blank"
          rel="noopener noreferrer"
          className="text-(--ink) link-underline"
        >
          @XHooks_protocol
        </a>{" "}
        for release notes and protocol updates.
      </>
    ),
  },
]

function FaqItem({ number, q, a }: { number: string; q: string; a: React.ReactNode }) {
  return (
    <div className="py-6 md:py-7 grid grid-cols-12 gap-4">
      <div className="col-span-2 md:col-span-1">
        <span className="mono text-[12px] text-(--muted) tracking-[0.18em]">{number}</span>
      </div>
      <div className="col-span-10 md:col-span-11">
        <dt className="display text-xl md:text-2xl text-(--ink) leading-snug">{q}</dt>
        <dd className="mt-2 text-[15px] leading-relaxed text-(--ink-2)">{a}</dd>
      </div>
    </div>
  )
}
