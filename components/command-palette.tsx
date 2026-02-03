"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { clientes } from "@/data/clientes"
import { polizas } from "@/data/polizas"
import { companias } from "@/data/companias"
import { Search, FileText, User, Building2, ArrowRight } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()

  // Búsqueda fuzzy simple
  const resultados = [
    ...clientes
      .filter(
        (c) =>
          c.nombre.toLowerCase().includes(query.toLowerCase()) || c.email.toLowerCase().includes(query.toLowerCase()),
      )
      .slice(0, 3)
      .map((c) => ({
        tipo: "cliente" as const,
        id: c.id,
        titulo: c.nombre,
        subtitulo: c.email,
        icono: User,
        accion: () => {
          console.log("[v0] Navegando a cliente:", c.id)
          onOpenChange(false)
        },
      })),
    ...polizas
      .filter((p) => p.numeroPoliza.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 3)
      .map((p) => {
        const cliente = clientes.find((c) => c.id === p.clienteId)
        return {
          tipo: "poliza" as const,
          id: p.id,
          titulo: p.numeroPoliza,
          subtitulo: cliente?.nombre || "",
          icono: FileText,
          accion: () => {
            router.push("/polizas")
            onOpenChange(false)
          },
        }
      }),
    ...companias
      .filter((c) => c.nombre.toLowerCase().includes(query.toLowerCase()))
      .map((c) => ({
        tipo: "compania" as const,
        id: c.id,
        titulo: c.nombre,
        subtitulo: "Aseguradora",
        icono: Building2,
        color: c.color,
        accion: () => {
          router.push("/polizas")
          onOpenChange(false)
        },
      })),
  ].slice(0, 8)

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return

      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % resultados.length)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + resultados.length) % resultados.length)
      } else if (e.key === "Enter" && resultados[selectedIndex]) {
        e.preventDefault()
        resultados[selectedIndex].accion()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, selectedIndex, resultados, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-2xl p-0 gap-0">
        <div className="flex items-center gap-3 p-4 border-b border-border/50">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar clientes, pólizas, aseguradoras..."
            className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            autoFocus
          />
        </div>

        <div className="max-h-[400px] overflow-y-auto p-2">
          {query === "" ? (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Comienza a escribir para buscar...</p>
            </div>
          ) : resultados.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>No se encontraron resultados</p>
            </div>
          ) : (
            <div className="space-y-1">
              {resultados.map((resultado, index) => {
                const Icon = resultado.icono
                return (
                  <motion.button
                    key={`${resultado.tipo}-${resultado.id}`}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left",
                      index === selectedIndex ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                    )}
                    onClick={resultado.accion}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div
                      className={cn(
                        "p-2 rounded-lg",
                        index === selectedIndex ? "bg-primary-foreground/20" : "bg-muted",
                      )}
                    >
                      <Icon className="w-4 h-4" style={resultado.color ? { color: resultado.color } : {}} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{resultado.titulo}</p>
                      <p
                        className={cn(
                          "text-sm truncate",
                          index === selectedIndex ? "text-primary-foreground/70" : "text-muted-foreground",
                        )}
                      >
                        {resultado.subtitulo}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 flex-shrink-0" />
                  </motion.button>
                )
              })}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>↑↓ Navegar</span>
            <span>↵ Seleccionar</span>
            <span>Esc Cerrar</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
