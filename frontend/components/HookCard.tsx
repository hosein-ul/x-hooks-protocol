'use client'

import { useState } from 'react'
import Link from 'next/link'
import { type HookInfo } from '@/hooks/useHookRegistry'
import { getHookIdentity, EXPLORER_BASE } from '@/lib/constants'

type Props = { info: HookInfo }

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function HookCard({ info }: Props) {
  const [copied, setCopied] = useState(false)
  const identity = getHookIdentity(info.name)   // FIX: key by name, not address

  const color    = identity?.color    ?? '#6366f1'
  const gradient = identity?.gradient ?? 'from-indigo-500 to-violet-500'
  const icon     = identity?.icon     ?? '🔗'
  const type     = identity?.type     ?? 'Hook'

  function copy() {
    navigator.clipboard.writeText(info.hookAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div
      className="glass card-hover flex flex-col rounded-2xl overflow-hidden"
      style={{ '--hook-color': color } as React.CSSProperties}
    >
      {/* Gradient accent line */}
      <div
        className={`h-[2px] bg-gradient-to-r ${gradient} flex-shrink-0`}
      />

      <div className="flex flex-col flex-1 p-5 gap-4">

        {/* ── Header row ── */}
        <div className="flex items-start gap-3">
          {/* Icon pill */}
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{
              background: `${color}1a`,
              border: `1px solid ${color}30`,
            }}
          >
            {icon}
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            {/* Name + verified */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-base leading-tight" style={{ color: 'var(--text-1)' }}>
                {info.name}
              </span>
              {info.isVerified && (
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border"
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

            {/* Badges */}
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full border"
                style={{
                  color,
                  borderColor: `${color}28`,
                  background: `${color}12`,
                }}
              >
                {type}
              </span>
              {identity?.shortname && (
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                  style={{ color: 'var(--text-3)', borderColor: 'var(--border)' }}
                >
                  {identity.shortname}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Tagline ── */}
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
          {identity?.tagline ?? info.description}
        </p>

        {/* ── Address row ── */}
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}
        >
          <span className="font-mono text-xs flex-1" style={{ color: 'var(--text-2)' }}>
            {shortAddr(info.hookAddress)}
          </span>
          <button
            onClick={copy}
            title="Copy address"
            className="text-xs transition-colors hover:opacity-80"
            style={{ color: copied ? '#34d399' : 'var(--text-3)' }}
          >
            {copied ? '✓' : '⧉'}
          </button>
          <a
            href={`${EXPLORER_BASE}${info.hookAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            title="View on OKLink"
            className="text-xs transition-colors hover:opacity-80"
            style={{ color: 'var(--text-3)' }}
          >
            ↗
          </a>
        </div>

        {/* ── Primitive tags ── */}
        {identity?.primitives && (
          <div className="flex flex-wrap gap-1.5">
            {identity.primitives.map((tag) => (
              <span
                key={tag}
                className="text-[11px] px-2 py-0.5 rounded-full border"
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
        )}

        {/* ── Stats ── */}
        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-3)' }}>
          <span>{info.totalPoolsUsing.toString()} pools</span>
          <span>·</span>
          <span>{info.totalInteractions.toString()} interactions</span>
          <span>·</span>
          <span>v{info.version}</span>
        </div>

        {/* ── CTA ── */}
        <Link
          href={`/hooks/${info.hookAddress}`}
          className="mt-auto flex items-center justify-center gap-2 text-sm font-medium py-2.5 rounded-xl border transition-all duration-200 hover:opacity-90"
          style={{
            color,
            borderColor: `${color}28`,
            background: `${color}0e`,
          }}
        >
          View Details
          <span style={{ fontSize: '0.9em' }}>→</span>
        </Link>
      </div>
    </div>
  )
}
