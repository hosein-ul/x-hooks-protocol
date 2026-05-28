'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useBlockNumber } from 'wagmi'
import { HookCard } from '@/components/HookCard'
import { useAllHookInfos, useRegistryStats, type HookInfo } from '@/hooks/useHookRegistry'

const FALLBACK_HOOKS: HookInfo[] = [
  {
    hookAddress: '0x955523a8eD7999e05015bC6F7b854D447717c088',
    hookType: 0, name: 'OFAHook',
    description: 'Orderflow Auction: large swaps trigger N-block solver auction with AMM fallback',
    version: '1.0.0', deployer: '0xC0d1AC70A3A32BceA4a124e65eb22eb5f0d0Adc2',
    deployedAt: 61211835n, isVerified: true, isActive: true,
    totalPoolsUsing: 0n, totalInteractions: 0n,
  },
  {
    hookAddress: '0xb7128F16104e6DD0DCe6f89dfBf733440E7F8080',
    hookType: 1, name: 'BCSHook',
    description: 'Bilateral Commitment Settlement: two-party OTC deal auto-settles at trigger price',
    version: '1.0.0', deployer: '0xC0d1AC70A3A32BceA4a124e65eb22eb5f0d0Adc2',
    deployedAt: 61211835n, isVerified: true, isActive: true,
    totalPoolsUsing: 0n, totalInteractions: 0n,
  },
  {
    hookAddress: '0xb4313ADd866F4E30F22751F9Ccf2C526839eda40',
    hookType: 2, name: 'PLTHook',
    description: 'Programmable Liquidity Tranching: Senior/Junior LP tranches with 70/30 fee waterfall',
    version: '1.0.0', deployer: '0xC0d1AC70A3A32BceA4a124e65eb22eb5f0d0Adc2',
    deployedAt: 61211835n, isVerified: true, isActive: true,
    totalPoolsUsing: 0n, totalInteractions: 0n,
  },
  {
    hookAddress: '0xD8b747E0e895eD02FbDac6378A9548368374d088',
    hookType: 3, name: 'SUBAHook',
    description: 'Sealed-Bid Uniform-Price Batch Auction: all swaps buffered into epochs',
    version: '1.0.0', deployer: '0xC0d1AC70A3A32BceA4a124e65eb22eb5f0d0Adc2',
    deployedAt: 61211835n, isVerified: true, isActive: true,
    totalPoolsUsing: 0n, totalInteractions: 0n,
  },
  {
    hookAddress: '0x3F26eF2279a0FfbBdC8270198106633008d78088',
    hookType: 4, name: 'CALHook',
    description: 'Commitments-as-Liquidity: collateral auto-executes as liquidity when price crosses trigger',
    version: '1.0.0', deployer: '0xC0d1AC70A3A32BceA4a124e65eb22eb5f0d0Adc2',
    deployedAt: 61211835n, isVerified: true, isActive: true,
    totalPoolsUsing: 0n, totalInteractions: 0n,
  },
]

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="glass rounded-2xl px-5 py-4">
      <div className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>
        {label}
      </div>
      <div className="text-2xl font-bold font-mono" style={{ color: 'var(--text-1)' }}>
        {value}
      </div>
      {sub && (
        <div className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>
          {sub}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { data: blockNumber } = useBlockNumber({ watch: true })
  const { infos: registryInfos, isLoading } = useAllHookInfos()
  const { hookCount, poolCount } = useRegistryStats()

  const displayHooks = registryInfos.length > 0 ? registryInfos : FALLBACK_HOOKS

  const totalInteractions = displayHooks.reduce((sum, h) => sum + Number(h.totalInteractions), 0)

  return (
    <div className="min-h-screen flex flex-col">

      {/* ─── Header ──────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          background: 'rgba(6,6,14,0.85)',
          backdropFilter: 'blur(16px)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <span className="text-xl">⛓️</span>
            <span className="font-bold text-lg tracking-tight" style={{ color: 'var(--text-1)' }}>
              X Hooks Protocol
            </span>
            <span
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border"
              style={{
                color: '#818cf8',
                borderColor: 'rgba(129,140,248,0.25)',
                background: 'rgba(129,140,248,0.08)',
              }}
            >
              X Layer Mainnet
            </span>
          </div>

          {/* Right */}
          <div className="flex items-center gap-4">
            {blockNumber != null && (
              <span
                className="hidden md:flex items-center gap-1.5 text-xs font-mono"
                style={{ color: 'var(--text-3)' }}
              >
                <span className="live-dot w-1.5 h-1.5 rounded-full bg-emerald-400" />
                #{blockNumber.toString()}
              </span>
            )}
            <ConnectButton chainStatus="icon" accountStatus="avatar" showBalance={false} />
          </div>
        </div>
      </header>

      <main className="flex-1">

        {/* ─── Hero ────────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
          <div className="max-w-3xl mb-10">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight mb-4 gradient-text">
              X Hooks Protocol
            </h1>
            <p className="text-lg leading-relaxed" style={{ color: 'var(--text-2)' }}>
              Five production-grade Uniswap V4 hooks deployed on X Layer Mainnet —
              MEV protection, structured liquidity, batch auctions, bilateral settlement,
              and collateral-backed limit orders.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Hooks Deployed"
              value={hookCount != null ? hookCount.toString() : '5'}
              sub="on X Layer Mainnet"
            />
            <StatCard
              label="Pools Using"
              value={poolCount != null ? poolCount.toString() : '—'}
              sub="registered pools"
            />
            <StatCard
              label="Interactions"
              value={totalInteractions > 0 ? totalInteractions.toLocaleString() : '—'}
              sub="total on-chain calls"
            />
            <StatCard
              label="Network"
              value="X Layer"
              sub="Chain ID 196"
            />
          </div>
        </section>

        {/* ─── Hook Grid ───────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-1)' }}>
                Protocol Hooks
              </h2>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
                {isLoading
                  ? 'Loading live data from HookRegistry…'
                  : 'Live from HookRegistry · refreshes every 30 s'}
              </p>
            </div>
            <div
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border"
              style={{
                color: '#10b981',
                borderColor: 'rgba(16,185,129,0.25)',
                background: 'rgba(16,185,129,0.08)',
              }}
            >
              <span className="live-dot w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Live
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayHooks.map((info) => (
              <HookCard key={info.hookAddress} info={info} />
            ))}
          </div>
        </section>

      </main>

      {/* ─── Footer ──────────────────────────────────────────── */}
      <footer
        className="border-t py-8"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-3)' }}>
            <span>⛓️</span>
            <span>X Hooks Protocol</span>
            <span>·</span>
            <span>OKX Build-X Hackathon 2025</span>
          </div>
          <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-3)' }}>
            <span>Built on Uniswap V4</span>
            <span>·</span>
            <a
              href="https://www.oklink.com/x-layer/address/0xeBc902Cee74345DD23f63E2f132f81E5fBE1D56D"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-indigo-400 transition-colors"
            >
              HookRegistry ↗
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
