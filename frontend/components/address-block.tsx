"use client"

import { Check, Copy, ExternalLink } from "lucide-react"
import { useState } from "react"
import { cn, shortAddr } from "@/lib/utils"
import { EXPLORER_BASE } from "@/lib/constants"

type Props = {
  address: string
  truncate?: boolean
  className?: string
  showExplorer?: boolean
  label?: string
}

export function AddressBlock({
  address,
  truncate = true,
  className,
  showExplorer = true,
  label,
}: Props) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      {label && <span className="eyebrow">{label}</span>}
      <code className="mono text-[12px] text-(--ink-2)">
        {truncate ? shortAddr(address, 6, 4) : address}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy address"
        className="text-(--muted) transition-colors hover:text-(--ink)"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-(--gain)" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      {showExplorer && (
        <a
          href={`${EXPLORER_BASE}${address}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View on OKLink"
          className="text-(--muted) transition-colors hover:text-(--ink)"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  )
}
