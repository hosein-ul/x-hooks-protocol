"use client"

import { useEffect, useState } from "react"
import { WagmiProvider } from "wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit"
import { useTheme } from "next-themes"
import { wagmiConfig } from "@/lib/wagmi"
import "@rainbow-me/rainbowkit/styles.css"

function ChainProviders({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isDark = !mounted || resolvedTheme === "dark"

  return (
    <RainbowKitProvider
      theme={
        isDark
          ? darkTheme({ accentColor: "#e26222", borderRadius: "none" })
          : lightTheme({ accentColor: "#c14a17", borderRadius: "none" })
      }
      modalSize="compact"
    >
      {children}
    </RainbowKitProvider>
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ChainProviders>{children}</ChainProviders>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
