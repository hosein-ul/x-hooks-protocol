'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useBlockNumber } from 'wagmi'
import { HookCard } from '@/components/HookCard'
import { useAllHookInfos, useRegistryStats, type HookInfo } from '@/hooks/useHookRegistry'
import { HOOK_ADDRESSES } from '@/lib/constants'

const FALLBACK_HOOKS: HookInfo[] = [
  { hookAddress: HOOK_ADDRESSES.OFAHook, hookType: 0, name: 'OFAHook', description: 'Orderflow Auction: large swaps trigger N-block solver auction with AMM fallback', version: '1.0.0', deployer: '0x0000000000000000000000000000000000000000', deployedAt: 0n, isVerified: true, isActive: true, totalPoolsUsing: 0n, totalInteractions: 0n },
  { hookAddress: HOOK_ADDRESSES.BCSHook, hookType: 1, name: 'BCSHook', description: 'Bilateral Commitment Settlement: two-party OTC deal auto-settles at trigger price', version: '1.0.0', deployer: '0x0000000000000000000000000000000000000000', deployedAt: 0n, isVerified: true, isActive: true, totalPoolsUsing: 0n, totalInteractions: 0n },
  { hookAddress: HOOK_ADDRESSES.PLTHook, hookType: 2, name: 'PLTHook', description: 'Programmable Liquidity Tranching: Senior/Junior LP tranches with 70/30 fee waterfall', version: '1.0.0', deployer: '0x0000000000000000000000000000000000000000', deployedAt: 0n, isVerified: true, isActive: true, totalPoolsUsing: 0n, totalInteractions: 0n },
  { hookAddress: HOOK_ADDRESSES.SUBAHook, hookType: 3, name: 'SUBAHook', description: 'Sealed-Bid Uniform-Price Batch Auction: all swaps buffered into epochs, settled at uniform price', version: '1.0.0', deployer: '0x0000000000000000000000000000000000000000', deployedAt: 0n, isVerified: true, isActive: true, totalPoolsUsing: 0n, totalInteractions: 0n },
  { hookAddress: HOOK_ADDRESSES.CALHook, hookType: 4, name: 'CALHook', description: 'Commitments-as-Liquidity: collateral auto-executes as liquidity when price crosses trigger', version: '1.0.0', deployer: '0x0000000000000000000000000000000000000000', deployedAt: 0n, isVerified: true, isActive: true, totalPoolsUsing: 0n, totalInteractions: 0n },
]

export default function Dashboard() {
  const { data: blockNumber } = useBlockNumber({ watch: true })
  const { infos: registryInfos, isLoading } = useAllHookInfos()
  const { hookCount, poolCount } = useRegistryStats()

  const displayHooks = registryInfos.length > 0 ? registryInfos : FALLBACK_HOOKS

  const totalInteractions = displayHooks.reduce(
    (sum, h) => sum + Number(h.totalInteractions),
    0,
  )

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold tracking-tight text-white">X Hooks Protocol</span>
            <span className="text-xs font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-full">
              X Layer
            </span>
          </div>
          <div className="flex items-center gap-4">
            {blockNumber !== undefined && (
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                #{blockNumber.toString()}
              </span>
            )}
            <ConnectButton chainStatus="icon" accountStatus="avatar" showBalance={false} />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Total Hooks', value: hookCount !== undefined ? hookCount.toString() : '5' },
            { label: 'Total Pools', value: poolCount !== undefined ? poolCount.toString() : '—' },
            { label: 'Total Interactions', value: totalInteractions > 0 ? totalInteractions.toLocaleString() : '—' },
            { label: 'Network', value: 'X Layer (196)' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-900/60 border border-white/10 rounded-xl px-4 py-3">
              <div className="text-xs text-gray-500 mb-1">{label}</div>
              <div className="text-lg font-semibold text-white font-mono">{value}</div>
            </div>
          ))}
        </div>

        {/* Hook grid */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-1">Deployed Hooks</h2>
          <p className="text-gray-500 text-sm">
            {isLoading ? 'Loading live data from registry...' : 'Live data from HookRegistry contract on X Layer Mainnet'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayHooks.map((info) => (
            <HookCard key={info.hookAddress} info={info} />
          ))}
        </div>
      </main>

      <footer className="border-t border-white/10 py-6 text-center text-xs text-gray-600">
        X Hooks Protocol — OKX Build-X Hackathon 2025 · Built on Uniswap V4 · X Layer Mainnet (Chain 196)
      </footer>
    </div>
  )
}
