"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = mounted && resolvedTheme === "dark"

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "inline-flex h-8 w-14 items-center rounded-full border bg-(--surface-1) p-1 transition-colors",
        "hover:bg-(--surface-2)",
        className,
      )}
      style={{ borderColor: "var(--rule)" }}
    >
      <span
        className="flex h-6 w-6 items-center justify-center rounded-full bg-(--surface-0) text-(--ink) transition-transform duration-300"
        style={{
          transform: isDark ? "translateX(0)" : "translateX(24px)",
        }}
      >
        {isDark ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
      </span>
    </button>
  )
}
