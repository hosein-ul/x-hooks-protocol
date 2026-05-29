import { NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { HOOK_REGISTRY_ABI } from '@/lib/contracts'

const REGISTRY = (process.env.NEXT_PUBLIC_HOOK_REGISTRY ?? '0x0000000000000000000000000000000000000000') as `0x${string}`

const RPC_URLS = [
  'https://rpc.xlayer.tech',
  'https://xlayerrpc.okx.com',
  'https://x-layer.drpc.org',
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

export const revalidate = 30 // cache for 30 s on Netlify CDN

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

    return NextResponse.json({
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
    })
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 502 })
  }
}
