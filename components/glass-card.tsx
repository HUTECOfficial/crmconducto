"use client"

import type React from "react"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  strong?: boolean
}

export function GlassCard({ children, className, hover = false, strong = false }: GlassCardProps) {
  return (
    <motion.div
      className={cn(
        "rounded-3xl",
        strong ? "glass-strong" : "glass",
        hover && "transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl",
        className,
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  )
}
