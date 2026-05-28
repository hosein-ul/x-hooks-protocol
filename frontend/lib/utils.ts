import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function shortAddr(addr: string, head = 6, tail = 4): string {
  if (!addr) return ""
  return `${addr.slice(0, head + 2)}…${addr.slice(-tail)}`
}

export function fmtNumber(n: number | bigint | undefined): string {
  if (n == null) return "—"
  const x = typeof n === "bigint" ? Number(n) : n
  if (x === 0) return "0"
  if (x < 1_000) return x.toString()
  return x.toLocaleString("en-US")
}
