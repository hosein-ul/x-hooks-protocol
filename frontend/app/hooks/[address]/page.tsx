import { HookDetailClient } from './HookDetailClient'

export default async function HookDetailPage({
  params,
}: {
  params: Promise<{ address: string }>
}) {
  const { address } = await params
  return <HookDetailClient address={address as `0x${string}`} />
}
