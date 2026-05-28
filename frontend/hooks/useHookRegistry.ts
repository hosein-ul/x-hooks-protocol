'use client'

import { useReadContract, useReadContracts } from 'wagmi'
import { HOOK_REGISTRY_ADDRESS, HOOK_REGISTRY_ABI } from '@/lib/contracts'

export type HookInfo = {
  hookAddress: `0x${string}`
  hookType: number
  name: string
  description: string
  version: string
  deployer: `0x${string}`
  deployedAt: bigint
  isVerified: boolean
  isActive: boolean
  totalPoolsUsing: bigint
  totalInteractions: bigint
}

export function useAllHookInfos() {
  const { data: addresses, isLoading: loadingAddresses } = useReadContract({
    address: HOOK_REGISTRY_ADDRESS,
    abi: HOOK_REGISTRY_ABI,
    functionName: 'getAllHooks',
    query: { refetchInterval: 30_000 },
  })

  const hookAddresses = (addresses ?? []) as `0x${string}`[]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contracts = hookAddresses.map((addr) => ({
    address: HOOK_REGISTRY_ADDRESS,
    abi: HOOK_REGISTRY_ABI,
    functionName: 'getHookInfo' as const,
    args: [addr] as const,
  })) satisfies readonly { address: `0x${string}`; abi: typeof HOOK_REGISTRY_ABI; functionName: 'getHookInfo'; args: readonly [`0x${string}`] }[]

  const { data: hookInfoResults, isLoading: loadingInfos } = useReadContracts({
    contracts: contracts ?? [],
    query: {
      enabled: hookAddresses.length > 0,
      refetchInterval: 30_000,
    },
  })

  const infos: HookInfo[] = (hookInfoResults ?? [])
    .map((r) => r.result as HookInfo | undefined)
    .filter((x): x is HookInfo => x !== undefined)

  return {
    addresses: hookAddresses,
    infos,
    isLoading: loadingAddresses || loadingInfos,
  }
}

export function useRegistryStats() {
  const { data, isLoading } = useReadContracts({
    contracts: [
      {
        address: HOOK_REGISTRY_ADDRESS,
        abi: HOOK_REGISTRY_ABI,
        functionName: 'getHookCount',
      },
      {
        address: HOOK_REGISTRY_ADDRESS,
        abi: HOOK_REGISTRY_ABI,
        functionName: 'getPoolCount',
      },
    ],
    query: { refetchInterval: 30_000 },
  })

  return {
    hookCount: data?.[0]?.result as bigint | undefined,
    poolCount: data?.[1]?.result as bigint | undefined,
    isLoading,
  }
}

export function useHookInfo(address: `0x${string}`) {
  const { data, isLoading } = useReadContract({
    address: HOOK_REGISTRY_ADDRESS,
    abi: HOOK_REGISTRY_ABI,
    functionName: 'getHookInfo',
    args: [address],
    query: { refetchInterval: 30_000 },
  })

  return { info: data as HookInfo | undefined, isLoading }
}
