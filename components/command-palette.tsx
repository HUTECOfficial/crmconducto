"use client"

import { useDeferredValue, useEffect, useMemo, useState, type ComponentType } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useSupabase } from "@/contexts/supabase-context"
import { useAuth } from "@/contexts/auth-context"
import { ArrowRight, Building2, FileText, LayoutGrid, Search, User, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import { PANTALLAS } from "@/lib/bitacora"
import { coincideTerminos, normalizarBusqueda, terminosBusqueda } from "@/lib/busqueda"
import { etiquetaAtajoBusqueda } from "@/lib/atajo-busqueda"

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Resultado {
  clave: string
  grupo: string
  titulo: string
  subtitulo: string
  href: string
  icono: ComponentType<{ className?: string; style?: React.CSSProperties }>
  color?: string
}

/** Pantallas que sólo ve el administrador. */
const SOLO_ADMIN = new Set(["/bitacora"])

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const { clientes, polizas, companias, prospectos, clientesPorId, companiasPorId, textoBusquedaPoliza } = useSupabase()
  const { tienePermiso } = useAuth()
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [atajo, setAtajo] = useState("⌘K")
  const router = useRouter()
  const busqueda = useDeferredValue(query)

  useEffect(() => setAtajo(etiquetaAtajoBusqueda()), [])
  // Cada vez que se abre empieza vacío.
  useEffect(() => {
    if (open) setQuery("")
  }, [open])

  // Texto buscable de clientes y prospectos, armado una vez por carga de datos.
  const textoClientes = useMemo(() => clientes.map(c => ({
    cliente: c,
    texto: normalizarBusqueda([c.nombre, c.email, c.telefono, c.telefono?.replace(/\D/g, ""), c.rfc, c.empresa].filter(Boolean).join(" ")),
  })), [clientes])

  const resultados = useMemo((): Resultado[] => {
    const terminos = terminosBusqueda(busqueda)
    if (!terminos.length) return []
    const coincide = (texto: string) => coincideTerminos(texto, terminos)

    const pantallas: Resultado[] = Object.entries(PANTALLAS)
      .filter(([ruta, nombre]) => (!SOLO_ADMIN.has(ruta) || tienePermiso("bitacora")) && coincide(normalizarBusqueda(nombre)))
      .slice(0, 4)
      .map(([ruta, nombre]) => ({ clave: `p-${ruta}`, grupo: "Pantallas", titulo: nombre, subtitulo: "Ir a la pantalla", href: ruta, icono: LayoutGrid }))

    const polizasEncontradas: Resultado[] = []
    for (const poliza of polizas) {
      if (!coincide(textoBusquedaPoliza.get(poliza.id) || "")) continue
      const cliente = clientesPorId.get(poliza.clienteId)
      polizasEncontradas.push({
        clave: `pol-${poliza.id}`,
        grupo: "Pólizas",
        titulo: poliza.numeroPoliza,
        subtitulo: [poliza.nombreAsegurado || cliente?.nombre, companiasPorId.get(poliza.companiaId)?.nombre, poliza.estatus].filter(Boolean).join(" · "),
        href: `/polizas?poliza=${poliza.id}`,
        icono: FileText,
      })
      if (polizasEncontradas.length === 5) break
    }

    const clientesEncontrados: Resultado[] = textoClientes
      .filter(item => coincide(item.texto))
      .slice(0, 5)
      .map(({ cliente }) => ({
        clave: `cli-${cliente.id}`,
        grupo: "Clientes",
        titulo: cliente.nombre,
        subtitulo: [cliente.telefono, cliente.email].filter(Boolean).join(" · ") || "Cliente",
        href: `/clientes?cliente=${cliente.id}`,
        icono: User,
      }))

    const aseguradoras: Resultado[] = companias
      .filter(c => coincide(normalizarBusqueda(c.nombre)))
      .slice(0, 3)
      .map(c => ({ clave: `cia-${c.id}`, grupo: "Aseguradoras", titulo: c.nombre, subtitulo: "Ver sus pólizas", href: `/polizas?compania=${c.id}`, icono: Building2, color: c.color }))

    const prospectosEncontrados: Resultado[] = prospectos
      .filter(p => coincide(normalizarBusqueda([p.nombre, p.telefono, p.email, p.empresa].filter(Boolean).join(" "))))
      .slice(0, 3)
      .map(p => ({ clave: `pro-${p.id}`, grupo: "Prospectos", titulo: p.nombre, subtitulo: [p.telefono, p.estatus].filter(Boolean).join(" · "), href: "/prospeccion", icono: UserPlus }))

    return [...pantallas, ...polizasEncontradas, ...clientesEncontrados, ...aseguradoras, ...prospectosEncontrados]
  }, [busqueda, polizas, textoBusquedaPoliza, clientesPorId, companiasPorId, textoClientes, companias, prospectos, tienePermiso])

  useEffect(() => setSelectedIndex(0), [resultados])

  const abrir = (resultado: Resultado | undefined) => {
    if (!resultado) return
    onOpenChange(false)
    router.push(resultado.href)
  }

  const alPresionar = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && resultados.length) {
      event.preventDefault()
      setSelectedIndex(prev => (prev + 1) % resultados.length)
    } else if (event.key === "ArrowUp" && resultados.length) {
      event.preventDefault()
      setSelectedIndex(prev => (prev - 1 + resultados.length) % resultados.length)
    } else if (event.key === "Enter") {
      event.preventDefault()
      abrir(resultados[selectedIndex])
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-2xl p-0 gap-0">
        <DialogTitle className="sr-only">Búsqueda rápida</DialogTitle>
        <div className="flex items-center gap-3 p-4 border-b border-border/50">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={alPresionar}
            placeholder="Busca pólizas, clientes, aseguradoras, prospectos o pantallas…"
            className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            autoFocus
          />
        </div>

        <div className="max-h-[420px] overflow-y-auto p-2">
          {query.trim() === "" ? (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Escribe un número de póliza, un nombre, un teléfono o una pantalla.</p>
            </div>
          ) : resultados.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>No se encontraron resultados para "{query.trim()}"</p>
            </div>
          ) : (
            <div className="space-y-1">
              {resultados.map((resultado, index) => {
                const Icon = resultado.icono
                const nuevoGrupo = index === 0 || resultados[index - 1].grupo !== resultado.grupo
                const activo = index === selectedIndex
                return (
                  <div key={resultado.clave}>
                    {nuevoGrupo && <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{resultado.grupo}</p>}
                    <button
                      type="button"
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left",
                        activo ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                      )}
                      onMouseEnter={() => setSelectedIndex(index)}
                      onClick={() => abrir(resultado)}
                    >
                      <div className={cn("p-2 rounded-lg", activo ? "bg-primary-foreground/20" : "bg-muted")}>
                        <Icon className="w-4 h-4" style={resultado.color && !activo ? { color: resultado.color } : undefined} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{resultado.titulo}</p>
                        <p className={cn("text-sm truncate", activo ? "text-primary-foreground/70" : "text-muted-foreground")}>{resultado.subtitulo}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 flex-shrink-0" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>↑↓ Navegar</span>
            <span>↵ Abrir</span>
            <span>Esc Cerrar</span>
          </div>
          <span>{atajo} abre esta búsqueda en cualquier pantalla</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
