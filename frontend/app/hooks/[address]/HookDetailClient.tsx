'use client'

import Link from 'next/link'
import { useHookInfo } from '@/hooks/useHookRegistry'
import { getHookIdentity, EXPLORER_BASE } from '@/lib/constants'
import { useState } from 'react'

type Props = { address: `0x${string}` }

function shortAddress(addr: string) {
  return `${addr.slice(0, 10)}...${addr.slice(-8)}`
}

export function HookDetailClient({ address }: Props) {
  const { info, isLoading } = useHookInfo(address)
  const identity = getHookIdentity(address)
  const [copied, setCopied] = useState(false)

  function copyAddress() {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const gradient = identity?.gradient ?? 'from-gray-500 to-gray-600'
  const icon = identity?.icon ?? '🔗'
  const name = info?.name ?? identity?.shortname ?? shortAddress(address)

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-white/10 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1"
          >
            ← Back
          </Link>
          <span className="text-white/20">|</span>
          <span className="text-2xl font-bold text-white">X Hooks Protocol</span>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10">
        {/* Hero */}
        <div className={`rounded-2xl bg-gradient-to-r ${gradient} p-8 mb-8`}>
          <div className="flex items-start gap-5">
            <span className="text-5xl">{icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-white">{name}</h1>
                {identity?.shortname && (
                  <span className="text-sm font-mono bg-white/20 text-white px-3 py-1 rounded-full">
                    {identity.shortname}
                  </span>
                )}
                {identity?.type && (
                  <span className="text-sm bg-white/15 text-white px-3 py-1 rounded-full">
                    {identity.type}
                  </span>
                )}
                {(info?.isVerified ?? true) && (
                  <span className="text-sm bg-green-500/30 text-green-200 border border-green-400/40 px-3 py-1 rounded-full">
                    ✓ Verified
                  </span>
                )}
              </div>
              <p className="text-white/80 text-lg leading-relaxed">
                {identity?.tagline ?? info?.description ?? ''}
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {info?.description && (
              <section className="bg-gray-900/60 border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-3">Description</h2>
                <p className="text-gray-300 leading-relaxed">{info.description}</p>
              </section>
            )}

            {/* Mechanics */}
            {identity?.mechanics && (
              <section className="bg-gray-900/60 border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Key Mechanics</h2>
                <ul className="space-y-3">
                  {identity.mechanics.map((point, i) => (
                    <li key={i} className="flex gap-3 text-gray-300 text-sm leading-relaxed">
                      <span className="text-gray-500 flex-shrink-0 mt-0.5">{'0' + (i + 1) + '.'}</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Usage snippet */}
            {identity?.usage && (
              <section className="bg-gray-900/60 border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">How to Use</h2>
                <pre className="text-xs font-mono text-green-300 bg-black/40 rounded-xl p-4 overflow-x-auto leading-relaxed whitespace-pre">
                  {identity.usage}
                </pre>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Contract info */}
            <section className="bg-gray-900/60 border border-white/10 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Contract</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Address</div>
                  <div className="flex items-center gap-2 bg-gray-800/60 rounded-lg px-3 py-2">
                    <span className="font-mono text-xs text-gray-300 flex-1 truncate">{address}</span>
                    <button
                      onClick={copyAddress}
                      className="text-gray-400 hover:text-white transition-colors text-sm flex-shrink-0"
                      title="Copy"
                    >
                      {copied ? '✓' : '⧉'}
                    </button>
                  </div>
                </div>
                <a
                  href={`${EXPLORER_BASE}${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:text-blue-300 rounded-xl py-2.5 text-sm transition-colors"
                >
                  View on OKLink ↗
                </a>
                {info?.version && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Version</div>
                    <div className="text-sm text-gray-300">{info.version}</div>
                  </div>
                )}
              </div>
            </section>

            {/* Stats */}
            <section className="bg-gray-900/60 border border-white/10 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                {isLoading ? 'Loading stats...' : 'Live Stats'}
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Pools Using', value: info?.totalPoolsUsing?.toString() ?? '0' },
                  { label: 'Total Interactions', value: info?.totalInteractions?.toString() ?? '0' },
                  { label: 'Status', value: (info?.isActive ?? true) ? 'Active' : 'Inactive' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span className="text-gray-200 font-mono">{value}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Primitives */}
            {identity?.primitives && (
              <section className="bg-gray-900/60 border border-white/10 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Primitives</h3>
                <div className="flex flex-wrap gap-2">
                  {identity.primitives.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-white/5 border border-white/10 text-gray-300 px-3 py-1 rounded-full"
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

      <footer className="border-t border-white/10 py-6 text-center text-xs text-gray-600">
        X Hooks Protocol — OKX Build-X Hackathon 2025 · Built on Uniswap V4 · X Layer Mainnet (Chain 196)
      </footer>
    </div>
  )
}
