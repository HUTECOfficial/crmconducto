"use client"

import type React from "react"
import { useRef } from "react"

import { motion } from "framer-motion"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  /** Se ignora sin `onSearchChange`: nunca se muestra un buscador que no filtre nada. */
  showSearch?: boolean
  /**
   * Con `onSearchChange` el encabezado muestra el buscador de la página. Una página tiene un
   * solo buscador: si ya tiene el suyo, no pases estas props. ⌘K / Ctrl+K es el buscador rápido global.
   */
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
}

export function PageHeader({ title, subtitle, action, showSearch = true, searchValue, onSearchChange, searchPlaceholder }: PageHeaderProps) {
  const buscadorRef = useRef<HTMLDivElement>(null)
  const conBuscador = showSearch && !!onSearchChange

  return (
    <motion.div
      className="mb-8"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className={`flex items-start justify-between ${conBuscador ? "mb-6" : ""}`}>
        <div>
          <h1 className="text-4xl font-bold font-serif mb-2">{title}</h1>
          {subtitle && <p className="text-muted-foreground text-lg">{subtitle}</p>}
        </div>
        {action}
      </div>

      {conBuscador && (
        <div ref={buscadorRef} className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder || "Buscar…"}
            className="pl-12 pr-12 h-12 rounded-2xl glass border-border/50"
            value={searchValue ?? ""}
            onChange={event => onSearchChange(event.target.value)}
            onKeyDown={event => { if (event.key === "Escape") onSearchChange("") }}
          />
          {searchValue && (
            <button
              type="button"
              aria-label="Limpiar búsqueda"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => { onSearchChange(""); buscadorRef.current?.querySelector("input")?.focus() }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}
