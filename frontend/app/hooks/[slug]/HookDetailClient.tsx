"use client"

import Link from "next/link"
import { ArrowLeft, CircleCheck, ExternalLink } from "lucide-react"
import { useHookInfo } from "@/hooks/useHookRegistry"
import { getHookIdentity, EXPLORER_BASE, HOOK_ORDER } from "@/lib/constants"
import { SiteNav } from "@/components/site-nav"
import { SiteFooter } from "@/components/site-footer"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AddressBlock } from "@/components/address-block"
import { fmtNumber } from "@/lib/utils"

type Props = {
  address: `0x${string}`
  /** Server-side name hint when the slug resolves to a known hook */
  hint?: string
}

export function HookDetailClient({ address, hint }: Props) {
  const { info, isLoading } = useHookInfo(address)
  const identity = getHookIdentity(info?.name ?? hint ?? "")

  if (!identity) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteNav />
        <main className="flex-1 mx-auto max-w-[1400px] px-6 py-20">
          <h1 className="display text-4xl mb-4">
            {isLoading ? "Loading…" : "Hook not found."}
          </h1>
          <Link href="/dashboard" className="text-(--ink) link-underline">
            Return to dashboard
          </Link>
        </main>
        <SiteFooter />
      </div>
    )
  }

  const {
    Icon, ordinal, shortname, type, tagline, headline,
    mechanics, primitives, usage, permissions,
  } = identity
  const name = info?.name ?? hint ?? shortname

  const idx = HOOK_ORDER.findIndex((n) => n.toLowerCase() === name.toLowerCase())
  const prev = idx > 0 ? HOOK_ORDER[idx - 1] : null
  const next = idx >= 0 && idx < HOOK_ORDER.length - 1 ? HOOK_ORDER[idx + 1] : null

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />

      <main className="flex-1 bg-(--surface-0)">

        {/* Back strip */}
        <div className="border-b border-(--rule)">
          <div className="mx-auto max-w-[1200px] px-6 py-4 flex items-center justify-between">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-(--muted) hover:text-(--ink)"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <span className="eyebrow">{ordinal} of V</span>
              <span className="eyebrow">{type}</span>
            </div>
          </div>
        </div>

        <article>
          {/* Header */}
          <header className="border-b border-(--rule)">
            <div className="mx-auto max-w-[1200px] px-6 pt-16 pb-12 md:pt-20 md:pb-16">
              <div className="flex items-center gap-3 mb-6">
                <Icon className="h-5 w-5 text-(--signal)" strokeWidth={1.5} />
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-(--muted)">
                  Hook · {ordinal} {shortname}
                </span>
                {info?.isVerified && (
                  <span className="inline-flex items-center gap-1 mono text-[10px] uppercase tracking-[0.14em] text-(--gain)">
                    <CircleCheck className="h-3 w-3" /> Verified
                  </span>
                )}
              </div>

              <h1 className="display text-[clamp(2.75rem,8vw,7.5rem)] leading-[0.92] tracking-[-0.04em]">
                {shortname}<span className="display-italic">.</span>
              </h1>

              <p className="mt-8 max-w-3xl text-xl md:text-2xl leading-snug text-(--ink-2) display">
                {headline}
              </p>

              <p className="mt-4 max-w-3xl text-base leading-relaxed text-(--muted)">
                {tagline}
              </p>

              <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-px bg-(--rule) border border-(--rule)">
                <Meta label="Type" value={type} />
                <Meta label="Status" value={info ? (info.isActive ? "Active" : "Idle") : "—"} />
                <Meta label="Version" value={`v${info?.version ?? "1.0.0"}`} mono />
                <Meta label="Pools" value={info ? info.totalPoolsUsing.toString() : "0"} />
              </div>
            </div>
          </header>

          {/* Body */}
          <div className="border-b border-(--rule)">
            <div className="mx-auto max-w-[1200px] px-6 py-16 grid grid-cols-12 gap-10">
              <div className="col-span-12 md:col-span-8">
                <div className="mb-12">
                  <div className="eyebrow mb-3">Mechanics</div>
                  <h2 className="display text-3xl md:text-4xl mb-8">How it works.</h2>
                  <ol className="space-y-7">
                    {mechanics.map((m, i) => (
                      <li key={i} className="grid grid-cols-12 gap-4">
                        <div className="col-span-2 md:col-span-1 display text-3xl text-(--muted) leading-none">
                          {String(i + 1).padStart(2, "0")}
                        </div>
                        <p className="col-span-10 md:col-span-11 text-base leading-relaxed text-(--ink-2)">
                          {m}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>

                <Separator className="my-10" />

                <div>
                  <div className="eyebrow mb-3">Integration</div>
                  <h2 className="display text-3xl md:text-4xl mb-6">Code sample.</h2>
                  <pre className="overflow-x-auto bg-(--surface-1) border border-(--rule) p-5 text-[12.5px] leading-relaxed mono text-(--ink)">
                    <code>{usage}</code>
                  </pre>
                </div>
              </div>

              <aside className="col-span-12 md:col-span-4 space-y-8">
                <div>
                  <div className="eyebrow mb-3">Contract</div>
                  <div className="space-y-3 border-t border-(--rule) pt-4">
                    <SideRow label="Address">
                      <AddressBlock address={address} truncate showExplorer={false} />
                    </SideRow>
                    {info?.deployer && (
                      <SideRow label="Deployer">
                        <AddressBlock address={info.deployer} truncate showExplorer={false} />
                      </SideRow>
                    )}
                    {info?.deployedAt != null && (
                      <SideRow label="Deployed" mono>
                        <code className="text-[12px]">#{info.deployedAt.toString()}</code>
                      </SideRow>
                    )}
                  </div>
                  <a
                    href={`${EXPLORER_BASE}${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 border border-(--rule) py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-(--ink) hover:bg-(--surface-1)"
                  >
                    View on OKLink <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

                <div>
                  <div className="eyebrow mb-3">Permissions</div>
                  <div className="border-t border-(--rule) pt-4 flex flex-wrap gap-1.5">
                    {permissions.map((p) => (
                      <Badge key={p} variant="outline">{p}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="eyebrow mb-3">Primitives</div>
                  <div className="border-t border-(--rule) pt-4 flex flex-wrap gap-1.5">
                    {primitives.map((p) => (
                      <Badge key={p} variant="default">{p}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="eyebrow mb-3">Live activity</div>
                  <div className="border-t border-(--rule) pt-4 space-y-3">
                    <SideRow label="Pools using">
                      {info ? info.totalPoolsUsing.toString() : isLoading ? "…" : "—"}
                    </SideRow>
                    <SideRow label="Interactions">
                      {info ? fmtNumber(info.totalInteractions) : isLoading ? "…" : "—"}
                    </SideRow>
                  </div>
                </div>
              </aside>
            </div>
          </div>

          {/* Prev / next */}
          <nav className="border-b border-(--rule)">
            <div className="mx-auto max-w-[1200px] px-6 py-10 grid grid-cols-2 gap-6">
              {prev ? <NavCard direction="prev" name={prev} /> : <div />}
              {next ? <NavCard direction="next" name={next} /> : <div />}
            </div>
          </nav>
        </article>
      </main>

      <SiteFooter />
    </div>
  )
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-(--surface-0) px-5 py-4">
      <div className="eyebrow mb-2">{label}</div>
      <div className={mono ? "mono text-base text-(--ink)" : "text-base font-medium text-(--ink)"}>
        {value}
      </div>
    </div>
  )
}

function SideRow({
  label,
  children,
  mono,
}: {
  label: string
  children: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="eyebrow shrink-0">{label}</span>
      <span className={mono ? "mono text-(--ink-2)" : "text-(--ink-2)"}>{children}</span>
    </div>
  )
}

function NavCard({
  direction,
  name,
}: {
  direction: "prev" | "next"
  name: string
}) {
  const id = getHookIdentity(name)
  if (!id) return <div />
  const isNext = direction === "next"
  return (
    <Link
      href={`/hooks/${name.toLowerCase()}`}
      className={`group border border-(--rule) p-6 hover:bg-(--surface-1) transition-colors ${
        isNext ? "text-right" : ""
      }`}
    >
      <div className="eyebrow mb-2">
        {isNext ? "Next" : "Previous"} · {id.ordinal}
      </div>
      <div className="display text-2xl md:text-3xl">{id.shortname}</div>
      <div className="text-sm text-(--ink-2) mt-1">{id.headline}</div>
    </Link>
  )
}
