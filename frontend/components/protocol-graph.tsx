"use client"

import { motion } from "framer-motion"

const HOOKS = [
  { id: "OFA", label: "OFA", angle: -90 },
  { id: "BCS", label: "BCS", angle: -18 },
  { id: "PLT", label: "PLT", angle: 54 },
  { id: "SUBA", label: "SUBA", angle: 126 },
  { id: "CAL", label: "CAL", angle: 198 },
]

const R = 78     // orbit radius
const CX = 120   // svg center x
const CY = 120   // svg center y

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

export function ProtocolGraph() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[200px] select-none">
      <svg
        viewBox="0 0 240 240"
        className="w-full max-w-[240px] overflow-visible"
        aria-hidden
      >
        {/* Orbit ring */}
        <motion.circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke="var(--rule)"
          strokeWidth="1"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{ originX: `${CX}px`, originY: `${CY}px` }}
        />

        {/* Spoke lines */}
        {HOOKS.map((h, i) => {
          const pos = polar(CX, CY, R, h.angle)
          return (
            <motion.line
              key={h.id}
              x1={CX}
              y1={CY}
              x2={pos.x}
              y2={pos.y}
              stroke="var(--rule)"
              strokeWidth="1"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.08, ease: "easeOut" }}
            />
          )
        })}

        {/* Pulse particles traveling along spokes */}
        {HOOKS.map((h, i) => {
          const pos = polar(CX, CY, R, h.angle)
          return (
            <motion.circle
              key={`pulse-${h.id}`}
              r={2}
              fill="var(--signal)"
              initial={{ opacity: 0 }}
              animate={{
                cx: [CX, pos.x, CX],
                cy: [CY, pos.y, CY],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                delay: i * 0.44,
                ease: "easeInOut",
                times: [0, 0.45, 0.55, 1],
              }}
            />
          )
        })}

        {/* Center node — Pool Manager */}
        <motion.circle
          cx={CX}
          cy={CY}
          r={22}
          fill="var(--surface-0)"
          stroke="var(--ink)"
          strokeWidth="1"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          style={{ originX: `${CX}px`, originY: `${CY}px` }}
        />
        {/* Breathing glow on center */}
        <motion.circle
          cx={CX}
          cy={CY}
          r={22}
          fill="none"
          stroke="var(--signal)"
          strokeWidth="1"
          animate={{ r: [22, 30, 22], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <text
          x={CX}
          y={CY - 3}
          textAnchor="middle"
          fontSize="7"
          fontFamily="var(--font-mono, monospace)"
          fill="var(--ink)"
          letterSpacing="0.08em"
          style={{ textTransform: "uppercase" }}
        >
          POOL
        </text>
        <text
          x={CX}
          y={CY + 7}
          textAnchor="middle"
          fontSize="7"
          fontFamily="var(--font-mono, monospace)"
          fill="var(--ink)"
          letterSpacing="0.08em"
          style={{ textTransform: "uppercase" }}
        >
          MGR
        </text>

        {/* Hook nodes */}
        {HOOKS.map((h, i) => {
          const pos = polar(CX, CY, R, h.angle)
          return (
            <motion.g
              key={h.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.35 + i * 0.09 }}
              style={{ originX: `${pos.x}px`, originY: `${pos.y}px` }}
            >
              <circle
                cx={pos.x}
                cy={pos.y}
                r={14}
                fill="var(--surface-1)"
                stroke="var(--rule)"
                strokeWidth="1"
              />
              <text
                x={pos.x}
                y={pos.y + 3.5}
                textAnchor="middle"
                fontSize="7.5"
                fontFamily="var(--font-mono, monospace)"
                fill="var(--signal)"
                fontWeight="600"
                letterSpacing="0.05em"
              >
                {h.label}
              </text>
            </motion.g>
          )
        })}
      </svg>

      <motion.p
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-(--muted) mt-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
      >
        5 hooks · 1 pool manager
      </motion.p>
    </div>
  )
}
