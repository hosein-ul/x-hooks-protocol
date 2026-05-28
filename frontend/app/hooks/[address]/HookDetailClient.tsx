'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useHookInfo } from '@/hooks/useHookRegistry'
import { getHookIdentity, EXPLORER_BASE } from '@/lib/constants'

type Props = { address: `0x${string}` }

function shortAddr(addr: string) {
  return `${addr.slice(0, 10)}…${addr.slice(-8)}`
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
      <span className="text-sm" style={{ color: 'var(--text-2)' }}>{label}</span>
      <span className="text-sm font-medium font-mono" style={{ color: 'var(--text-1)' }}>{value}</span>
    </div>
  )
}

export function HookDetailClient({ address }: Props) {
  const { info, isLoading } = useHookInfo(address)
  const identity = getHookIdentity(info?.name ?? address)   // FIX: key by name
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const color    = identity?.color    ?? '#6366f1'
  const gradient = identity?.gradient ?? 'from-indigo-500 to-violet-500'
  const icon     = identity?.icon     ?? '🔗'
  const name     = info?.name ?? identity?.shortname ?? shortAddr(address)

  return (
    <div className="min-h-screen flex flex-col">

      {/* ─── Header ── */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          background: 'rgba(6,6,14,0.9)',
          backdropFilter: 'blur(16px)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
            style={{ color: 'var(--text-2)' }}
          >
            ← Back
          </Link>
          <span style={{ color: 'var(--border)' }}>|</span>
          <span className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
            Hook Details
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10">

        {/* ─── Hero Card ── */}
        <div className="glass rounded-2xl overflow-hidden mb-8">
          <div className={`h-[3px] bg-gradient-to-r ${gradient}`} />
          <div className="p-7 sm:p-10">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              {/* Icon */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                style={{ background: `${color}1a`, border: `1px solid ${color}30` }}
              >
                {icon}
              </div>

              {/* Title */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold" style={{ color: 'var(--text-1)' }}>
                    {name}
                  </h1>
                  {identity?.shortname && (
                    <span
                      className="text-xs font-mono px-2.5 py-1 rounded-full border"
                      style={{ color: 'var(--text-2)', borderColor: 'var(--border)' }}
                    >
                      {identity.shortname}
                    </span>
                  )}
                  {identity?.type && (
                    <span
                      className="text-xs font-medium px-2.5 py-1 rounded-full border"
                      style={{ color, borderColor: `${color}28`, background: `${color}12` }}
                    >
                      {identity.type}
                    </span>
                  )}
                  {(info?.isVerified ?? true) && (
                    <span
                      className="text-xs font-medium px-2.5 py-1 rounded-full border"
                      style={{
                        color: '#34d399',
                        borderColor: 'rgba(52,211,153,0.3)',
                        background: 'rgba(52,211,153,0.08)',
                      }}
                    >
                      ✓ Verified
                    </span>
                  )}
                </div>
                <p className="text-base leading-relaxed" style={{ color: 'var(--text-2)' }}>
                  {identity?.tagline ?? info?.description ?? ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* ─── Main column ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Description */}
            {info?.description && (
              <section className="glass rounded-2xl p-6">
                <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-1)' }}>
                  Description
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
                  {info.description}
                </p>
              </section>
            )}

            {/* Mechanics */}
            {identity?.mechanics && (
              <section className="glass rounded-2xl p-6">
                <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-1)' }}>
                  How It Works
                </h2>
                <ol className="space-y-3">
                  {identity.mechanics.map((point, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-relaxed">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
                        style={{ background: `${color}20`, color }}
                      >
                        {i + 1}
                      </span>
                      <span style={{ color: 'var(--text-2)' }}>{point}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* Code snippet */}
            {identity?.usage && (
              <section className="glass rounded-2xl p-6">
                <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-1)' }}>
                  Integration Example
                </h2>
                <pre
                  className="text-xs font-mono leading-relaxed overflow-x-auto rounded-xl p-4 whitespace-pre"
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    color: '#86efac',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  {identity.usage}
                </pre>
              </section>
            )}
          </div>

          {/* ─── Sidebar ── */}
          <div className="space-y-5">

            {/* Contract info */}
            <section className="glass rounded-2xl p-5">
              <h3
                className="text-xs font-semibold uppercase tracking-widest mb-4"
                style={{ color: 'var(--text-3)' }}
              >
                Contract
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs mb-1.5" style={{ color: 'var(--text-3)' }}>Address</div>
                  <div
                    className="flex items-center gap-2 rounded-lg px-3 py-2"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}
                  >
                    <span className="font-mono text-xs flex-1 truncate" style={{ color: 'var(--text-2)' }}>
                      {address}
                    </span>
                    <button
                      onClick={copy}
                      className="text-xs transition-colors flex-shrink-0"
                      style={{ color: copied ? '#34d399' : 'var(--text-3)' }}
                    >
                      {copied ? '✓' : '⧉'}
                    </button>
                  </div>
                </div>

                <a
                  href={`${EXPLORER_BASE}${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-sm font-medium py-2.5 rounded-xl border w-full transition-all duration-200 hover:opacity-80"
                  style={{
                    color: '#3b82f6',
                    borderColor: 'rgba(59,130,246,0.25)',
                    background: 'rgba(59,130,246,0.07)',
                  }}
                >
                  View on OKLink ↗
                </a>
              </div>
            </section>

            {/* Stats */}
            <section className="glass rounded-2xl p-5">
              <h3
                className="text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: 'var(--text-3)' }}
              >
                {isLoading ? 'Loading…' : 'Live Stats'}
              </h3>
              <div>
                <StatRow label="Pools using" value={info?.totalPoolsUsing?.toString() ?? '0'} />
                <StatRow label="Interactions" value={info?.totalInteractions?.toString() ?? '0'} />
                <StatRow label="Version" value={`v${info?.version ?? '1.0.0'}`} />
                <StatRow label="Status" value={(info?.isActive ?? true) ? 'Active' : 'Inactive'} />
              </div>
            </section>

            {/* Primitives */}
            {identity?.primitives && (
              <section className="glass rounded-2xl p-5">
                <h3
                  className="text-xs font-semibold uppercase tracking-widest mb-3"
                  style={{ color: 'var(--text-3)' }}
                >
                  Primitives
                </h3>
                <div className="flex flex-wrap gap-2">
                  {identity.primitives.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2.5 py-1 rounded-full border"
                      style={{
                        color: 'var(--text-2)',
                        borderColor: 'var(--border)',
                        background: 'rgba(255,255,255,0.03)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            )}

          </div>
        </div>
      </main>

      <footer className="border-t py-6" style={{ borderColor: 'var(--border)' }}>
        <div
          className="max-w-5xl mx-auto px-4 sm:px-6 text-center text-xs"
          style={{ color: 'var(--text-3)' }}
        >
          X Hooks Protocol · OKX Build-X Hackathon 2025 · Uniswap V4 · X Layer Mainnet (Chain 196)
        </div>
      </footer>
    </div>
  )
}
