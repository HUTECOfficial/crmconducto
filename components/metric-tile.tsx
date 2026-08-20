"use client"

import { motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"
import { GlassCard } from "./glass-card"

interface MetricTileProps {
  title: string
  value: string | number
  change?: string
  icon: LucideIcon
  trend?: "up" | "down" | "neutral"
}

export function MetricTile({ title, value, change, icon: Icon, trend = "neutral" }: MetricTileProps) {
  const trendColors = {
    up: "text-green-500",
    down: "text-red-500",
    neutral: "text-muted-foreground",
  }

  return (
    <GlassCard hover className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
          <motion.p
            className="text-3xl font-bold font-serif"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
          >
            {value}
          </motion.p>
          {change && <p className={`text-sm mt-2 font-medium ${trendColors[trend]}`}>{change}</p>}
        </div>
        <div className="p-3 rounded-2xl bg-primary/10">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </GlassCard>
  )
}
