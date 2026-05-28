"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.16em] transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--ink)",
  {
    variants: {
      variant: {
        ink: "bg-(--ink) text-(--surface-0) hover:bg-(--ink-2)",
        outline: "border border-(--rule) text-(--ink) hover:border-(--ink) hover:bg-(--surface-1)",
        signal: "bg-(--signal) text-white hover:opacity-90",
        ghost: "text-(--ink) hover:bg-(--surface-1)",
        link: "text-(--ink) link-underline px-0",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-5",
        lg: "h-12 px-7 text-xs",
      },
    },
    defaultVariants: { variant: "ink", size: "md" },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
