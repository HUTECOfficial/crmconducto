"use client"

import type React from "react"

import { motion } from "framer-motion"
import { Search, Command } from "lucide-react"
import { Input } from "@/components/ui/input"

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <motion.div
      className="mb-8"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold font-serif mb-2">{title}</h1>
          {subtitle && <p className="text-muted-foreground text-lg">{subtitle}</p>}
        </div>
        {action}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input placeholder="Buscar... (⌘K)" className="pl-12 pr-12 h-12 rounded-2xl glass border-border/50" />
        <kbd className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-muted rounded-lg border border-border">
          <Command className="w-3 h-3 inline mr-1" />K
        </kbd>
      </div>
    </motion.div>
  )
}
