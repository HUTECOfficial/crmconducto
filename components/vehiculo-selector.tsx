"use client"

import { useState, useRef, useEffect } from "react"
import { Search, Car, X, Loader2, CheckCircle2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useSupabase } from "@/contexts/supabase-context"
import type { VehiculoAxa } from "@/contexts/supabase-context"

interface VehiculoSelectorProps {
  onSelect: (vehiculo: VehiculoAxa) => void
  selected?: VehiculoAxa | null
}

export function VehiculoSelector({ onSelect, selected }: VehiculoSelectorProps) {
  const { buscarVehiculos } = useSupabase()
  const [query, setQuery] = useState("")
  const [resultados, setResultados] = useState<VehiculoAxa[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [selectedVeh, setSelectedVeh] = useState<VehiculoAxa | null>(selected || null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selected) setSelectedVeh(selected)
  }, [selected])

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (query.trim().length >= 2 && !selectedVeh) {
        setLoading(true)
        const res = await buscarVehiculos(query.trim())
        setResultados(res)
        setShowResults(true)
        setLoading(false)
      } else {
        setResultados([])
        setShowResults(false)
      }
    }, 350)

    return () => clearTimeout(handler)
  }, [query, selectedVeh, buscarVehiculos])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSelect = (v: VehiculoAxa) => {
    setSelectedVeh(v)
    setQuery("")
    setShowResults(false)
    setResultados([])
    onSelect(v)
  }

  const handleClear = () => {
    setSelectedVeh(null)
    onSelect(null as any)
  }

  if (selectedVeh) {
    return (
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Vehículo Seleccionado</Label>
        <div className="flex items-center gap-3 p-3 rounded-lg border border-green-500/30 bg-green-50/50 dark:bg-green-950/20">
          <Car className="w-5 h-5 text-green-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedVeh.marcaDescripcion}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {selectedVeh.amis && (
                <Badge variant="secondary" className="text-xs">AMIS: {selectedVeh.amis}</Badge>
              )}
              {selectedVeh.claveCot && (
                <Badge variant="secondary" className="text-xs">Clave: {selectedVeh.claveCot}</Badge>
              )}
              {selectedVeh.modelos && (
                <Badge variant="secondary" className="text-xs">Modelos: {selectedVeh.modelos}</Badge>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2" ref={containerRef}>
      <Label className="text-xs font-semibold flex items-center gap-1">
        <Car className="w-3 h-3" /> Buscar Vehículo
      </Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Marca, modelo, AMIS o clave..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => resultados.length > 0 && setShowResults(true)}
          className="pl-9"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {showResults && resultados.length > 0 && (
        <div className="border rounded-lg bg-background/95 backdrop-blur shadow-lg z-50 max-h-64 overflow-y-auto">
          {resultados.map(v => (
            <button
              key={v.id}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors text-sm border-b border-border/30 last:border-0"
              onClick={() => handleSelect(v)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{v.marcaDescripcion}</p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {v.amis && <span className="text-xs text-muted-foreground">AMIS: {v.amis}</span>}
                    {v.modelos && <span className="text-xs text-muted-foreground">· {v.modelos}</span>}
                  </div>
                </div>
                {v.claveCot && (
                  <Badge variant="outline" className="text-xs shrink-0">{v.claveCot}</Badge>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {showResults && !loading && resultados.length === 0 && query.length >= 2 && (
        <p className="text-xs text-muted-foreground px-2">No se encontraron vehículos para "{query}"</p>
      )}

      {query.length > 0 && query.length < 2 && !loading && (
        <p className="text-xs text-muted-foreground px-2">Escribe al menos 2 caracteres...</p>
      )}
    </div>
  )
}
