export const HOOK_REGISTRY_ADDRESS =
  (process.env.NEXT_PUBLIC_HOOK_REGISTRY as `0x${string}`) ??
  '0x0000000000000000000000000000000000000000'

export const HOOK_REGISTRY_ABI = [
  {
    type: 'function',
    name: 'getAllHooks',
    inputs: [],
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getHookCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPoolCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getHookInfo',
    inputs: [{ name: 'hookAddress', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'hookAddress', type: 'address' },
          { name: 'hookType', type: 'uint8' },
          { name: 'name', type: 'string' },
          { name: 'description', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'deployer', type: 'address' },
          { name: 'deployedAt', type: 'uint256' },
          { name: 'isVerified', type: 'bool' },
          { name: 'isActive', type: 'bool' },
          { name: 'totalPoolsUsing', type: 'uint256' },
          { name: 'totalInteractions', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
] as const
