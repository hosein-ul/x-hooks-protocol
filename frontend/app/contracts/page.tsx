"use client"

import Link from "next/link"
import { ExternalLink, CircleCheck, FileCode2, Network } from "lucide-react"
import { SiteNav } from "@/components/site-nav"
import { SiteFooter } from "@/components/site-footer"
import { AddressBlock } from "@/components/address-block"
import { Badge } from "@/components/ui/badge"
import { KineticChars, KineticContainer } from "@/components/kinetic-text"
import {
  HOOK_ORDER,
  HOOK_ADDRESSES,
  POOL_MANAGER,
  POOL_TOKENS,
  EXPLORER_BASE,
  getHookIdentity,
} from "@/lib/constants"

export default function ContractsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />

      <main className="flex-1 bg-(--surface-0)">

        {/* Header strip */}
        <div className="border-b border-(--rule)">
          <div className="mx-auto max-w-[1400px] px-6 py-12 grid grid-cols-12 gap-6 items-end">
            <div className="col-span-12 md:col-span-8">
              <div className="eyebrow mb-3">Manifest</div>
              <KineticContainer staggerChildren={0.025}>
                <h1 className="display text-5xl md:text-6xl leading-[0.95]">
                  <KineticChars text="Verifiable" />
                  <br />
                  <KineticChars text="contract registry." className="display-italic" baseDelay={11} />
                </h1>
              </KineticContainer>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-(--ink-2)">
                Every contract deployed by the X Hooks Protocol on X Layer mainnet.
                Flattened source files are checked into the monorepo for byte-exact
                OKLink verification. Each row links to the public block explorer.
              </p>
            </div>
            <div className="col-span-12 md:col-span-4 flex md:justify-end gap-3 flex-wrap">
              <Badge variant="outline">Chain 196</Badge>
              <Badge variant="outline">Solidity 0.8.26</Badge>
              <Badge variant="outline">via_ir</Badge>
            </div>
          </div>
        </div>

        {/* Registry table */}
        <section className="border-b border-(--rule)">
          <div className="mx-auto max-w-[1400px] px-6 py-12">
            <SectionHeader number="01" title="Protocol contracts" />

            <div className="border border-(--rule)">
              <ContractRow
                ordinal="R."
                category="Registry"
                name="HookRegistry"
                tagline="Append-only catalogue of every hook on X Layer."
                address={HOOK_ADDRESSES.Registry}
                verified
                size="8.2 KB"
              />
              {HOOK_ORDER.map((name) => {
                const id = getHookIdentity(name)
                if (!id) return null
                const addr = HOOK_ADDRESSES[name as keyof typeof HOOK_ADDRESSES]
                return (
                  <ContractRow
                    key={name}
                    ordinal={id.ordinal}
                    category={id.type}
                    name={name}
                    tagline={id.headline}
                    address={addr}
                    verified
                    href={`/hooks/${name.toLowerCase()}`}
                  />
                )
              })}
            </div>

            <div className="mt-6 grid grid-cols-12 gap-6 text-xs text-(--muted)">
              <div className="col-span-12 md:col-span-3 flex items-center gap-2">
                <CircleCheck className="h-3.5 w-3.5 text-(--gain)" /> Registered + verified on-chain
              </div>
              <div className="col-span-12 md:col-span-5 flex items-center gap-2">
                <FileCode2 className="h-3.5 w-3.5" /> Flattened source in <code className="mono text-(--ink)">/x-hooks-protocol/verification/</code>
              </div>
            </div>
          </div>
        </section>

        {/* Pools section */}
        <section className="border-b border-(--rule)">
          <div className="mx-auto max-w-[1400px] px-6 py-12">
            <SectionHeader number="02" title="V4 Pools" />
            <p className="text-sm text-(--ink-2) max-w-2xl mb-6">
              Five canonical{" "}
              <span className="mono text-(--ink)">XHKB / XHKA</span>{" "}
              pools have been initialized on X Layer — one per hook — through the
              Uniswap V4 PoolManager at the address below. Fee 0.3%, tickSpacing 60,
              initial sqrtPrice 1:1.
            </p>

            <div className="border border-(--rule) mb-6">
              <ContractRow
                ordinal="∞"
                category="Core"
                name="Uniswap V4 PoolManager"
                tagline="Canonical singleton; all pools live inside it."
                address={POOL_MANAGER}
              />
              <ContractRow
                ordinal="T0"
                category="ERC-20"
                name="X Hooks Token B"
                tagline="Demo pool currency0 (XHKB)."
                address={POOL_TOKENS.token0}
              />
              <ContractRow
                ordinal="T1"
                category="ERC-20"
                name="X Hooks Token A"
                tagline="Demo pool currency1 (XHKA)."
                address={POOL_TOKENS.token1}
              />
            </div>

            <div className="mt-8">
              <h3 className="display text-2xl md:text-3xl mb-2">
                Pool IDs{" "}
                <span className="display-italic text-(--muted)">(bytes32)</span>
              </h3>
              <p className="text-sm text-(--ink-2) max-w-2xl mb-5">
                In Uniswap V4 all pools live inside the PoolManager singleton.
                Each pool is identified by a{" "}
                <span className="mono text-(--ink)">bytes32</span> keccak256
                hash of its PoolKey (token0, token1, fee, tickSpacing, hooks).
                These IDs are used to query on-chain state.
              </p>

              <div className="border border-(--rule)">
                {[
                  {
                    hook: "OFAHook",
                    id: "0xd2dbfc52093172c084f07489b035367c83ba38e143e21b1236ebe59202199cb6",
                  },
                  {
                    hook: "BCSHook",
                    id: "0x1202c5ade749da93a0f97449d92bc8bfd1db74cc11b49e2afc9051ca79964976",
                  },
                  {
                    hook: "PLTHook",
                    id: "0x57dcbf83710828f3d530daf53725c0faacc970afd0cb23e1965e21d3d5326f06",
                  },
                  {
                    hook: "SUBAHook",
                    id: "0x600edb115d98e91142105e77f29eb1f87c05dbfa0bd7c0b800f62847feb746fa",
                  },
                  {
                    hook: "CALHook",
                    id: "0xa3dfc4b76570d536daa1b9154e0ffeebb530e1a637d53ea9debb5a8c0ac634fa",
                  },
                ].map(({ hook, id }) => (
                  <div
                    key={hook}
                    className="grid grid-cols-12 items-center gap-x-4 gap-y-2 px-5 py-4 border-b border-(--rule) last:border-b-0 hover:bg-(--surface-1) transition-colors"
                  >
                    <div className="col-span-12 md:col-span-2">
                      <Link
                        href={`/hooks/${hook.toLowerCase()}`}
                        className="text-sm font-medium text-(--ink) link-underline"
                      >
                        {hook}
                      </Link>
                    </div>

                    <div className="col-span-10 md:col-span-9 mono text-xs text-(--ink-2) break-all">
                      {id}
                    </div>

                    <div className="col-span-2 md:col-span-1 flex justify-end">
                      <a
                        href="https://www.oklink.com/x-layer/address/0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="View PoolManager on OKLink"
                        className="text-(--muted) hover:text-(--ink)"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-xs text-(--muted)">
                <Network className="inline h-3.5 w-3.5 mr-1 align-[-2px]" />
                Each hook name links to its detail page. The external link opens
                the PoolManager singleton on OKLink.
              </p>
            </div>
          </div>
        </section>

        {/* Verification guide */}
        <section>
          <div className="mx-auto max-w-[1400px] px-6 py-16 grid grid-cols-12 gap-8">
            <div className="col-span-12 md:col-span-3">
              <div className="eyebrow mb-3">03</div>
              <h2 className="display text-3xl md:text-4xl">
                How to<br /><span className="display-italic">verify.</span>
              </h2>
            </div>

            <div className="col-span-12 md:col-span-9 grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-8">
              <Step number="01" title="Open OKLink">
                Go to the address page on{" "}
                <a
                  href="https://www.oklink.com/x-layer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-(--ink) link-underline"
                >
                  OKLink X Layer
                </a>{" "}
                and click <span className="mono text-(--ink)">Verify and Publish</span>.
              </Step>
              <Step number="02" title="Compiler settings">
                Select Solidity <span className="mono text-(--ink)">v0.8.26</span>, EVM target{" "}
                <span className="mono text-(--ink)">cancun</span>, optimizer enabled with{" "}
                <span className="mono text-(--ink)">200</span> runs. Toggle{" "}
                <span className="mono text-(--ink)">via_ir</span>.
              </Step>
              <Step number="03" title="Paste flattened source">
                Use the file{" "}
                <span className="mono text-(--ink)">&lt;ContractName&gt;_flat.sol</span>{" "}
                from{" "}
                <span className="mono text-(--ink)">verification/</span>{" "}
                and submit. The bytecode matches on-chain byte-for-byte.
              </Step>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}

function SectionHeader({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-end gap-6 mb-8">
      <div className="display text-5xl md:text-6xl text-(--muted) leading-none">{number}</div>
      <h2 className="display text-3xl md:text-4xl">{title}</h2>
    </div>
  )
}

function ContractRow({
  ordinal,
  category,
  name,
  tagline,
  address,
  verified,
  size,
  href,
}: {
  ordinal: string
  category: string
  name: string
  tagline: string
  address: string
  verified?: boolean
  size?: string
  href?: string
}) {
  return (
    <div className="grid grid-cols-12 items-start md:items-center gap-x-4 gap-y-3 px-5 py-5 border-b border-(--rule) last:border-b-0 hover:bg-(--surface-1) transition-colors">
      <div className="col-span-2 md:col-span-1 display text-2xl text-(--muted) leading-none">
        {ordinal}
      </div>

      <div className="col-span-10 md:col-span-5">
        <div className="flex items-baseline gap-3 flex-wrap">
          {href ? (
            <Link href={href} className="text-base font-medium text-(--ink) link-underline">
              {name}
            </Link>
          ) : (
            <span className="text-base font-medium text-(--ink)">{name}</span>
          )}
          <Badge variant="outline">{category}</Badge>
          {verified && (
            <span className="inline-flex items-center gap-1 mono text-[10px] uppercase tracking-[0.14em] text-(--gain)">
              <CircleCheck className="h-3 w-3" /> Verified
            </span>
          )}
          {size && (
            <span className="mono text-[10px] uppercase tracking-[0.14em] text-(--muted)">
              {size}
            </span>
          )}
        </div>
        <div className="text-sm text-(--ink-2) mt-1">{tagline}</div>
      </div>

      <div className="col-span-10 md:col-span-5 mono text-xs text-(--ink-2) break-all">
        {address}
      </div>

      <div className="col-span-2 md:col-span-1 flex justify-end">
        <a
          href={`${EXPLORER_BASE}${address}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View on OKLink"
          className="text-(--muted) hover:text-(--ink)"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  )
}

function Step({
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
