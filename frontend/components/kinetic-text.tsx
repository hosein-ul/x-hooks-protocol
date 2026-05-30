"use client"

import { motion, type Variants } from "framer-motion"
import type { ReactNode } from "react"

const charV: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: i * 0.025 },
  }),
}

const wordV: Variants = {
  hidden: { opacity: 0, y: 28, skewY: 3 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    skewY: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: i * 0.06 },
  }),
}

/**
 * Per-character stagger animation. Use for short headings where each letter
 * should reveal individually.
 */
export function KineticChars({
  text,
  className,
  baseDelay = 0,
}: {
  text: string
  className?: string
  baseDelay?: number
}) {
  return (
    <span className={className} aria-label={text}>
      {text.split("").map((char, i) => (
        <motion.span
          key={i}
          custom={baseDelay + i}
          variants={charV}
          className="inline-block"
          style={{ whiteSpace: char === " " ? "pre" : undefined }}
        >
          {char === " " ? " " : char}
        </motion.span>
      ))}
    </span>
  )
}

/**
 * Per-word reveal with subtle skew. Use for body paragraphs or sub-headings.
 */
export function KineticWords({
  text,
  className,
  baseDelay = 0,
}: {
  text: string
  className?: string
  baseDelay?: number
}) {
  return (
    <span className={className} aria-label={text}>
      {text.split(" ").map((word, i) => (
        <motion.span
          key={i}
          custom={baseDelay + i}
          variants={wordV}
          className="inline-block mr-[0.25em]"
        >
          {word}
        </motion.span>
      ))}
    </span>
  )
}

/**
 * Container that drives the stagger animation. Wrap KineticChars / KineticWords
 * with this and it'll auto-start on mount.
 */
export function KineticContainer({
  children,
  staggerChildren = 0.03,
  delayChildren = 0,
  className,
  onView = false,
}: {
  children: ReactNode
  staggerChildren?: number
  delayChildren?: number
  className?: string
  onView?: boolean
}) {
  const animProps = onView
    ? {
        whileInView: "visible" as const,
        viewport: { once: true, margin: "-60px" },
      }
    : { animate: "visible" as const }

  return (
    <motion.div
      className={className}
      initial="hidden"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren, delayChildren } },
      }}
      {...animProps}
    >
      {children}
    </motion.div>
  )
}
