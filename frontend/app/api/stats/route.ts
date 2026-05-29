import { NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { HOOK_REGISTRY_ABI, HOOK_REGISTRY_ADDRESS } from '@/lib/contracts'

// Single source of truth — already falls back to the real on-chain address
// when NEXT_PUBLIC_HOOK_REGISTRY isn't present in the runtime environment.
const REGISTRY = HOOK_REGISTRY_ADDRESS

const RPC_URLS = [
  'https://rpc.xlayer.tech',
  'https://xlayerrpc.okx.com',
  'https://xlayer.drpc.org',
]

async function getWorkingClient() {
  for (const url of RPC_URLS) {
    try {
      const client = createPublicClient({
        transport: http(url, { timeout: 8_000 }),
      })
      // quick liveness check
      await client.getBlockNumber()
      return client
    } catch {
      // try next
    }
  }
  return null
}

// Force request-time rendering. Without this, `revalidate` would opt the
// route into build-time prerendering — and if the build host can't reach
// the X Layer RPC, the error response gets frozen into a static file and
// the dashboard shows zeros forever. Dynamic = runs server-side per request
// (a Netlify Function with full network access), CDN-cached 30 s via headers.
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const client = await getWorkingClient()
    if (!client) throw new Error('no reachable RPC')

    const [addresses, hookCount, poolCount] = await Promise.all([
      client.readContract({ address: REGISTRY, abi: HOOK_REGISTRY_ABI, functionName: 'getAllHooks' }),
      client.readContract({ address: REGISTRY, abi: HOOK_REGISTRY_ABI, functionName: 'getHookCount' }),
      client.readContract({ address: REGISTRY, abi: HOOK_REGISTRY_ABI, functionName: 'getPoolCount' }),
    ])

    const hookInfos = await Promise.all(
      (addresses as `0x${string}`[]).map((addr) =>
        client.readContract({ address: REGISTRY, abi: HOOK_REGISTRY_ABI, functionName: 'getHookInfo', args: [addr] })
      )
    )

    const totalInteractions = (hookInfos as any[]).reduce(
      (s: number, h: any) => s + Number(h.totalInteractions),
      0
    )

    return NextResponse.json(
      {
        hookCount: Number(hookCount),
        poolCount: Number(poolCount),
        totalInteractions,
        hooks: (hookInfos as any[]).map((h: any) => ({
          hookAddress: h.hookAddress,
          hookType: h.hookType,
          name: h.name,
          description: h.description,
          version: h.version,
          deployer: h.deployer,
          deployedAt: Number(h.deployedAt),
          isVerified: h.isVerified,
          isActive: h.isActive,
          totalPoolsUsing: Number(h.totalPoolsUsing),
          totalInteractions: Number(h.totalInteractions),
        })),
      },
      {
        headers: {
          // CDN-cache the good response 30 s; serve stale up to 5 min while
          // a fresh one is fetched in the background.
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300',
        },
      }
    )
  } catch (err: any) {
    // Never cache an error — the next request retries immediately.
    return NextResponse.json(
      { error: String(err?.message ?? err) },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
