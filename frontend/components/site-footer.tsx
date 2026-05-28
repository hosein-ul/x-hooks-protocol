import Link from "next/link"
import { EXPLORER_BASE, HOOK_ADDRESSES } from "@/lib/constants"

export function SiteFooter() {
  return (
    <footer className="border-t border-(--rule) bg-(--surface-0)">
      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-12">
          {/* Colophon */}
          <div className="md:col-span-5">
            <div className="display text-3xl leading-none">X·Hooks</div>
            <p className="mt-3 max-w-sm text-sm text-(--muted)">
              Five production-grade Uniswap V4 hooks deployed on X Layer Mainnet.
              Built for the OKX Build-X Hackathon, 2025.
            </p>
          </div>

          {/* Navigation */}
          <div className="md:col-span-3">
            <div className="eyebrow mb-3">Site</div>
            <ul className="space-y-1.5 text-sm">
              <li><Link href="/" className="text-(--ink-2) hover:text-(--ink) link-underline">Index</Link></li>
              <li><Link href="/dashboard" className="text-(--ink-2) hover:text-(--ink) link-underline">Dashboard</Link></li>
              <li><Link href="/contracts" className="text-(--ink-2) hover:text-(--ink) link-underline">Contracts</Link></li>
            </ul>
          </div>

          {/* On-chain */}
          <div className="md:col-span-4">
            <div className="eyebrow mb-3">On-Chain</div>
            <ul className="space-y-1.5 text-sm">
              <li>
                <a
                  href={`${EXPLORER_BASE}${HOOK_ADDRESSES.Registry}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-(--ink-2) hover:text-(--ink) link-underline"
                >
                  HookRegistry on OKLink
                </a>
              </li>
              <li>
                <a
                  href="https://www.oklink.com/x-layer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-(--ink-2) hover:text-(--ink) link-underline"
                >
                  X Layer Explorer
                </a>
              </li>
              <li>
                <a
                  href="https://developers.uniswap.org/contracts/v4/overview"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-(--ink-2) hover:text-(--ink) link-underline"
                >
                  Uniswap V4 Documentation
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-(--rule) pt-5 text-xs text-(--muted) md:flex-row md:items-center">
          <div className="font-mono uppercase tracking-[0.18em]">
            © 2025 · X Layer Mainnet · Chain 196
          </div>
          <div className="font-mono uppercase tracking-[0.18em]">
            Solidity 0.8.26 · evm cancun · via_ir
          </div>
        </div>
      </div>
    </footer>
  )
}
