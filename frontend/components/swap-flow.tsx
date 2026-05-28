"use client"

import { HOOK_ORDER, getHookIdentity } from "@/lib/constants"

const PHASES = [
  { id: "user",    label: "User",            x: 80 },
  { id: "router",  label: "Router",          x: 230 },
  { id: "beforeS", label: "beforeSwap",      x: 410 },
  { id: "core",    label: "Core AMM",        x: 590 },
  { id: "afterS",  label: "afterSwap",       x: 770 },
  { id: "settle",  label: "Settle / Take",   x: 950 },
] as const

// Where each hook intercepts (x position) and on which row
const HOOK_INTERCEPTS: Record<string, number[]> = {
  OFAHook:  [410],
  BCSHook:  [410],
  PLTHook:  [770],
  SUBAHook: [410],
  CALHook:  [410],
}

export function SwapFlow() {
  const ROW_H = 56
  const TOP_PAD = 80
  const ROWS = HOOK_ORDER.length

  return (
    <div className="w-full overflow-x-auto rule-t rule-b bg-(--surface-1)">
      <svg
        viewBox={`0 0 1080 ${TOP_PAD + ROWS * ROW_H + 40}`}
        className="block w-full min-w-[900px]"
        role="img"
        aria-label="Swap lifecycle and hook intercept points"
      >
        {/* Vertical phase rules */}
        {PHASES.map((p) => (
          <g key={p.id}>
            <line
              x1={p.x}
              x2={p.x}
              y1={40}
              y2={TOP_PAD + ROWS * ROW_H + 10}
              stroke="var(--rule)"
              strokeDasharray="2 4"
            />
            <text
              x={p.x}
              y={26}
              textAnchor="middle"
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fill: "var(--muted)",
              }}
            >
              {p.label}
            </text>
          </g>
        ))}

        {/* Hook rails */}
        {HOOK_ORDER.map((hookName, i) => {
          const identity = getHookIdentity(hookName)!
          const y = TOP_PAD + i * ROW_H
          const intercepts = HOOK_INTERCEPTS[hookName] ?? []
          return (
            <g key={hookName}>
              {/* Rail */}
              <line
                x1={20}
                x2={1060}
                y1={y}
                y2={y}
                stroke="var(--rule)"
                strokeWidth={1}
              />
              {/* Label */}
              <text
                x={20}
                y={y - 8}
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.16em",
                  fill: "var(--ink-2)",
                  textTransform: "uppercase",
                }}
              >
                {identity.ordinal} {hookName.replace("Hook", "")} · {identity.type}
              </text>

              {/* Intercept markers */}
              {intercepts.map((cx) => (
                <g key={cx} transform={`translate(${cx} ${y})`}>
                  <circle r={5} fill="var(--signal)" />
                  <circle r={11} fill="none" stroke="var(--signal)" opacity={0.35} />
                </g>
              ))}
            </g>
          )
        })}

        {/* Arrow at right edge */}
        <g transform={`translate(1060 ${TOP_PAD + ROWS * ROW_H + 22})`}>
          <line x1={-1040} x2={-10} y1={0} y2={0} stroke="var(--ink)" strokeWidth={1.5} />
          <polygon points="-10,-5 0,0 -10,5" fill="var(--ink)" />
          <text
            x={-1040}
            y={18}
            className="mono"
            style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", fill: "var(--muted)" }}
          >
            Single-transaction execution
          </text>
        </g>
      </svg>
    </div>
  )
}
