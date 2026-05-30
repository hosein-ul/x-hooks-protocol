import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { getHookIdentity } from "@/lib/constants"
import { Badge } from "@/components/ui/badge"
import { AddressBlock } from "@/components/address-block"
import { cn } from "@/lib/utils"

type Props = {
  name: string
  address: string
  pools?: number | bigint
  interactions?: number | bigint
  className?: string
}

/**
 * Editorial table-row representation of a hook — used on landing taxonomy
 * and in the dashboard. Big numeral, small body. NO emojis.
 */
export function HookRow({ name, address, pools, interactions, className }: Props) {
  const identity = getHookIdentity(name)
  if (!identity) return null
  const { Icon, ordinal, shortname, type, headline, tagline } = identity

  return (
    <Link
      href={`/hooks/${name.toLowerCase()}`}
      className={cn(
        "group grid grid-cols-12 items-start gap-4 md:gap-6 border-t border-(--rule) px-4 py-5 md:px-6 md:py-7 transition-colors hover:bg-(--surface-1)",
        className,
      )}
    >
      {/* Ordinal */}
      <div className="col-span-1 display text-3xl text-(--muted) group-hover:text-(--ink)">
        {ordinal}
      </div>

      {/* Title + body */}
      <div className="col-span-12 md:col-span-6">
        <div className="flex items-center gap-3">
          <Icon className="h-4 w-4 text-(--signal)" strokeWidth={1.5} />
          <h3 className="display text-2xl md:text-3xl">
            {shortname}
            <span className="text-(--muted)"> — {name.replace("Hook", "")}</span>
          </h3>
        </div>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-(--ink-2)">
          {headline} {tagline}
        </p>
      </div>

      {/* Meta column */}
      <div className="col-span-6 md:col-span-3 flex flex-col gap-2">
        <Badge variant="outline" className="w-fit">{type}</Badge>
        <AddressBlock address={address} truncate />
        {pools != null && (
          <div className="font-mono text-[11px] text-(--muted)">
            <span className="text-(--ink-2)">{pools.toString()}</span> pool{Number(pools) === 1 ? "" : "s"}
            {interactions != null && (
              <>
                {" · "}
                <span className="text-(--ink-2)">{interactions.toString()}</span> interactions
              </>
            )}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="col-span-6 md:col-span-2 flex justify-end items-start">
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-(--muted) group-hover:text-(--ink)">
          Read
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </Link>
  )
}
