'use client'

import { useState } from 'react'
import Link from 'next/link'
import { type HookInfo } from '@/hooks/useHookRegistry'
import { getHookIdentity, EXPLORER_BASE } from '@/lib/constants'

type Props = {
  info: HookInfo
}

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function HookCard({ info }: Props) {
  const [copied, setCopied] = useState(false)
  const identity = getHookIdentity(info.hookAddress)

  const gradient = identity?.gradient ?? 'from-gray-500 to-gray-600'
  const icon = identity?.icon ?? '🔗'
  const type = identity?.type ?? 'Hook'
  const shortname = identity?.shortname ?? info.name.slice(0, 3)
  const tagline = identity?.tagline ?? info.description

  function copyAddress() {
    navigator.clipboard.writeText(info.hookAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-gray-900/80 overflow-hidden hover:border-white/20 transition-all duration-200 hover:shadow-lg hover:shadow-black/30">
      {/* Gradient header */}
      <div className={`bg-gradient-to-r ${gradient} p-4 flex items-center gap-3`}>
        <span className="text-3xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-bold text-lg leading-tight">{info.name}</span>
            <span className="text-xs font-mono bg-white/20 text-white px-2 py-0.5 rounded-full">
              {shortname}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs bg-white/15 text-white px-2 py-0.5 rounded-full">{type}</span>
            {info.isVerified && (
              <span className="text-xs bg-green-500/30 text-green-300 border border-green-500/40 px-2 py-0.5 rounded-full">
                ✓ Verified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        <p className="text-gray-300 text-sm leading-relaxed">{tagline}</p>

        {/* Address */}
        <div className="flex items-center gap-2 bg-gray-800/60 rounded-lg px-3 py-2">
          <span className="font-mono text-xs text-gray-400 flex-1">{shortAddress(info.hookAddress)}</span>
          <button
            onClick={copyAddress}
            className="text-xs text-gray-400 hover:text-white transition-colors"
            title="Copy address"
          >
            {copied ? '✓' : '⧉'}
          </button>
          <a
            href={`${EXPLORER_BASE}${info.hookAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            title="View on OKLink"
          >
            ↗
          </a>
        </div>

        {/* Primitives */}
        {identity?.primitives && (
          <div className="flex flex-wrap gap-1.5">
            {identity.primitives.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-white/5 border border-white/10 text-gray-300 px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex gap-4 text-xs text-gray-500 mt-auto pt-1">
          <span>{info.totalPoolsUsing.toString()} pools</span>
          <span>{info.totalInteractions.toString()} interactions</span>
          <span className="text-gray-600">v{info.version}</span>
        </div>

        {/* CTA */}
        <Link
          href={`/hooks/${info.hookAddress}`}
          className={`mt-1 text-center text-sm font-medium bg-gradient-to-r ${gradient} text-white py-2 rounded-xl hover:opacity-90 transition-opacity`}
        >
          View Details →
        </Link>
      </div>
    </div>
  )
}
