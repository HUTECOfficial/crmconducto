"use client"

import React, { createContext, useContext, ReactNode } from "react"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { prospectos as initialProspectos } from "@/data/prospectos"
import type { Prospecto } from "@/data/prospectos"

interface ProspectosContextType {
  prospectos: Prospecto[]
  agregarProspecto: (prospecto: Omit<Prospecto, "id" | "fechaCreacion">) => void
  actualizarProspecto: (id: string, data: Partial<Prospecto>) => void
  eliminarProspecto: (id: string) => void
  moverProspecto: (id: string, nuevaEtapa: Prospecto["etapa"]) => void
}

const ProspectosContext = createContext<ProspectosContextType | undefined>(undefined)

export function ProspectosProvider({ children }: { children: ReactNode }) {
  const [prospectos, setProspectos] = useLocalStorage<Prospecto[]>("crm-prospectos", initialProspectos)

  const agregarProspecto = (data: Omit<Prospecto, "id" | "fechaCreacion">) => {
    const nuevoProspecto: Prospecto = {
      ...data,
      id: Date.now().toString(),
      fechaCreacion: new Date().toISOString(),
    }
    setProspectos([...prospectos, nuevoProspecto])
  }

  const actualizarProspecto = (id: string, data: Partial<Prospecto>) => {
    setProspectos(prospectos.map(p => 
      p.id === id ? { ...p, ...data } : p
    ))
  }

  const eliminarProspecto = (id: string) => {
    setProspectos(prospectos.filter(p => p.id !== id))
  }

  const moverProspecto = (id: string, nuevaEtapa: Prospecto["etapa"]) => {
    actualizarProspecto(id, { etapa: nuevaEtapa })
  }

  return (
    <ProspectosContext.Provider
      value={{
        prospectos,
        agregarProspecto,
        actualizarProspecto,
        eliminarProspecto,
        moverProspecto,
      }}
    >
      {children}
    </ProspectosContext.Provider>
  )
}

export function useProspectos() {
  const context = useContext(ProspectosContext)
  if (context === undefined) {
    throw new Error("useProspectos debe usarse dentro de ProspectosProvider")
  }
  return context
}
