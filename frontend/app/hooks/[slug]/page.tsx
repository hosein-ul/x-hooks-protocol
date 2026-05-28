import { notFound } from "next/navigation"
import { HookDetailClient } from "./HookDetailClient"
import { HOOK_ADDRESSES, HOOK_ORDER } from "@/lib/constants"

export default async function HookDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const key = slug.toLowerCase()

  const matchByName = HOOK_ORDER.find((n) => n.toLowerCase() === key)
  const address: `0x${string}` | undefined = matchByName
    ? HOOK_ADDRESSES[matchByName]
    : slug.startsWith("0x") && slug.length === 42
      ? (slug as `0x${string}`)
      : undefined

  if (!address) notFound()

  return <HookDetailClient address={address} hint={matchByName} />
}

export function generateStaticParams() {
  return HOOK_ORDER.map((name) => ({ slug: name.toLowerCase() }))
}
