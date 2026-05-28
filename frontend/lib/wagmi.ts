import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { defineChain, http, fallback } from 'viem'

export const xLayer = defineChain({
  id: 196,
  name: 'X Layer',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        '/api/rpc',
        'https://rpc.xlayer.tech',
        'https://xlayerrpc.okx.com',
        'https://x-layer.drpc.org',
      ],
    },
  },
  blockExplorers: { default: { name: 'OKLink', url: 'https://www.oklink.com/x-layer' } },
})

export const wagmiConfig = getDefaultConfig({
  appName: 'X Hooks Protocol',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_ID ?? 'demo',
  chains: [xLayer],
  transports: {
    [xLayer.id]: fallback([
      http('/api/rpc'),
      http('https://rpc.xlayer.tech'),
      http('https://xlayerrpc.okx.com'),
      http('https://x-layer.drpc.org'),
    ]),
  },
  ssr: true,
})
