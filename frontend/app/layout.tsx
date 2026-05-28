import type { Metadata } from "next"
import { DM_Sans, Fraunces, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/Providers"
import { ThemeProvider } from "@/components/theme-provider"

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
  style: ["normal", "italic"],
})

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
})

export const metadata: Metadata = {
  title: "X Hooks Protocol — Editorial",
  description:
    "Five production-grade Uniswap V4 hooks deployed on X Layer Mainnet — MEV protection, structured liquidity, batch auctions, bilateral settlement, and collateral-backed limit orders.",
  applicationName: "X Hooks Protocol",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${fraunces.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <body className="grain antialiased">
        <ThemeProvider>
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
