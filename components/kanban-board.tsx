"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { GlassCard } from "./glass-card"
import { useProspectos } from "@/contexts/prospectos-context"
import { etapas } from "@/data/etapas"
import { Badge } from "@/components/ui/badge"
import { Mail, Phone, Building2, Tag } from "lucide-react"
import type { Prospecto } from "@/data/prospectos"

export function KanbanBoard() {
  const { prospectos, moverProspecto } = useProspectos()
  const [draggedProspecto, setDraggedProspecto] = useState<Prospecto | null>(null)

  const handleDragStart = (prospecto: Prospecto) => {
    setDraggedProspecto(prospecto)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (etapaId: string) => {
    if (!draggedProspecto) return

    moverProspecto(draggedProspecto.id, etapaId as Prospecto["etapa"])
    setDraggedProspecto(null)
  }

  const getEtapaColor = (etapaId: string) => {
    const etapa = etapas.find(e => e.id === etapaId)
    return etapa?.color || '#6366f1'
  }

  const prioridadColors = {
    alta: "bg-red-500/10 text-red-500 border-red-500/20",
    media: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    baja: "bg-green-500/10 text-green-500 border-green-500/20",
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {etapas.map((etapa) => {
        const prospectosEtapa = prospectos.filter((p) => p.etapa === etapa.id)

        return (
          <div key={etapa.id} className="flex-shrink-0 w-80">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: etapa.color }} />
                <h3 className="font-bold font-serif">{etapa.nombre}</h3>
              </div>
              <Badge variant="secondary">{prospectosEtapa.length}</Badge>
            </div>

            <div
              className="space-y-3 min-h-[500px] p-3 rounded-2xl bg-muted/20"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(etapa.id)}
            >
              {prospectosEtapa.map((prospecto, index) => (
                <motion.div
                  key={prospecto.id}
                  draggable
                  onDragStart={() => handleDragStart(prospecto)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    backgroundColor: `${getEtapaColor(prospecto.etapa)}15`,
                    borderColor: `${getEtapaColor(prospecto.etapa)}40`
                  }}
                  transition={{ 
                    delay: index * 0.05,
                    backgroundColor: { duration: 0.8, ease: "easeInOut" },
                    borderColor: { duration: 0.8, ease: "easeInOut" }
                  }}
                  className="cursor-move relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${getEtapaColor(prospecto.etapa)}08, ${getEtapaColor(prospecto.etapa)}20)`,
                    border: `1px solid ${getEtapaColor(prospecto.etapa)}30`,
                    borderRadius: '16px',
                    backdropFilter: 'blur(12px)',
                    boxShadow: `0 8px 32px ${getEtapaColor(prospecto.etapa)}20`
                  }}
                >
                  <motion.div
                    className="absolute inset-0 opacity-20"
                    animate={{
                      background: `linear-gradient(45deg, transparent 30%, ${getEtapaColor(prospecto.etapa)}40 50%, transparent 70%)`
                    }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                  />
                  <div className="relative p-4 hover:shadow-xl transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-semibold text-sm">{prospecto.nombre}</h4>
                      <Badge className={prioridadColors[prospecto.prioridad]} variant="outline">
                        {prospecto.prioridad}
                      </Badge>
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{prospecto.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        <span>{prospecto.telefono}</span>
                      </div>
                      {prospecto.empresa && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Building2 className="w-3 h-3" />
                          <span className="truncate">{prospecto.empresa}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        {prospecto.interes}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{prospecto.responsable}</span>
                    </div>

                    {prospecto.tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-3 flex-wrap">
                        <Tag className="w-3 h-3 text-muted-foreground" />
                        {prospecto.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
