import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { defineChain } from 'viem'

export const xLayer = defineChain({
  id: 196,
  name: 'X Layer',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.xlayer.tech'] } },
  blockExplorers: { default: { name: 'OKLink', url: 'https://www.oklink.com/x-layer' } },
})

export const wagmiConfig = getDefaultConfig({
  appName: 'X Hooks Protocol',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_ID ?? 'demo',
  chains: [xLayer],
  ssr: true,
})
