"use client"

import React, { createContext, useContext, ReactNode } from "react"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { polizas as initialPolizas } from "@/data/polizas"
import type { Poliza } from "@/data/polizas"

interface PolizasContextType {
  polizas: Poliza[]
  agregarPoliza: (poliza: Omit<Poliza, "id">) => void
  actualizarPoliza: (id: string, data: Partial<Poliza>) => void
  eliminarPoliza: (id: string) => void
}

const PolizasContext = createContext<PolizasContextType | undefined>(undefined)

export function PolizasProvider({ children }: { children: ReactNode }) {
  const [polizas, setPolizas] = useLocalStorage<Poliza[]>("crm-polizas", initialPolizas)

  const agregarPoliza = (data: Omit<Poliza, "id">) => {
    const nuevaPoliza: Poliza = {
      ...data,
      id: Date.now().toString(),
    }
    setPolizas([...polizas, nuevaPoliza])
  }

  const actualizarPoliza = (id: string, data: Partial<Poliza>) => {
    setPolizas(polizas.map(p => 
      p.id === id ? { ...p, ...data } : p
    ))
  }

  const eliminarPoliza = (id: string) => {
    setPolizas(polizas.filter(p => p.id !== id))
  }

  return (
    <PolizasContext.Provider
      value={{
        polizas,
        agregarPoliza,
        actualizarPoliza,
        eliminarPoliza,
      }}
    >
      {children}
    </PolizasContext.Provider>
  )
}

export function usePolizas() {
  const context = useContext(PolizasContext)
  if (context === undefined) {
    throw new Error("usePolizas debe usarse dentro de PolizasProvider")
  }
  return context
}
