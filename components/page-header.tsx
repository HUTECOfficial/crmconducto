"use client"

import type React from "react"
import { useEffect, useRef } from "react"

import { motion } from "framer-motion"
import { Search, Command, X } from "lucide-react"
import { Input } from "@/components/ui/input"

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  showSearch?: boolean
  /** Con `onSearchChange` el buscador filtra la página; ⌘K / Ctrl+K lo enfoca. */
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
}

export function PageHeader({ title, subtitle, action, showSearch = true, searchValue, onSearchChange, searchPlaceholder }: PageHeaderProps) {
  const buscadorRef = useRef<HTMLDivElement>(null)
  const input = () => buscadorRef.current?.querySelector("input")
  const buscadorActivo = !!onSearchChange

  useEffect(() => {
    if (!showSearch || !buscadorActivo) return
    const enfocar = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        input()?.focus()
        input()?.select()
      }
    }
    window.addEventListener("keydown", enfocar)
    return () => window.removeEventListener("keydown", enfocar)
  }, [showSearch, buscadorActivo])

  return (
    <motion.div
      className="mb-8"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className={`flex items-start justify-between ${showSearch ? "mb-6" : ""}`}>
        <div>
          <h1 className="text-4xl font-bold font-serif mb-2">{title}</h1>
          {subtitle && <p className="text-muted-foreground text-lg">{subtitle}</p>}
        </div>
        {action}
      </div>

      {showSearch && (
      <div ref={buscadorRef} className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder || "Buscar... (⌘K)"}
          className="pl-12 pr-12 h-12 rounded-2xl glass border-border/50"
          {...(buscadorActivo ? {
            value: searchValue ?? "",
            onChange: (event: React.ChangeEvent<HTMLInputElement>) => onSearchChange(event.target.value),
            onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => { if (event.key === "Escape") onSearchChange("") },
          } : {})}
        />
        {buscadorActivo && searchValue ? (
          <button
            type="button"
            aria-label="Limpiar búsqueda"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => { onSearchChange(""); input()?.focus() }}
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <kbd className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-muted rounded-lg border border-border">
            <Command className="w-3 h-3 inline mr-1" />K
          </kbd>
        )}
      </div>
      )}
    </motion.div>
  )
}
