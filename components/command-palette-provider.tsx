"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { CommandPalette } from "./command-palette"
import { EVENTO_ABRIR_BUSQUEDA } from "@/lib/atajo-busqueda"

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // ⌘K en Mac, Ctrl + K en Windows/Linux: siempre el buscador rápido global.
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    const abrir = () => setOpen(true)
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener(EVENTO_ABRIR_BUSQUEDA, abrir)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener(EVENTO_ABRIR_BUSQUEDA, abrir)
    }
  }, [])

  return (
    <>
      {children}
      <CommandPalette open={open} onOpenChange={setOpen} />
    </>
  )
}
