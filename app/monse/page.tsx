"use client"

import { useState, useMemo } from "react"
import { Sidebar } from "@/components/sidebar"
import { PageHeader } from "@/components/page-header"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSupabase } from "@/contexts/supabase-context"
import { motion } from "framer-motion"
import { ProtectedRoute } from "@/components/protected-route"
import {
  TrendingUp,
  Users,
  FileText,
  DollarSign,
  Target,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Phone,
  Mail,
} from "lucide-react"

export default function MonsePage() {
  const { clientes, polizas, prospectos, eventos } = useSupabase()

  // Filtrar datos de Monse
  const clientesMonse = useMemo(() => clientes.filter(c => c.notas?.includes("Monse") || false), [clientes])
  const polizasMonse = useMemo(() => polizas.filter(p => {
    const cliente = clientes.find(c => c.id === p.clienteId)
    return cliente && (cliente.notas?.includes("Monse") || false)
  }), [polizas, clientes])
  const prospectosMonse = useMemo(() => prospectos.filter(p => p.asignadoA === "Monse"), [prospectos])
  const eventosMonse = useMemo(() => eventos.filter(e => {
    const cliente = clientes.find(c => c.id === e.clienteId)
    return cliente && (cliente.notas?.includes("Monse") || false)
  }), [eventos, clientes])

  // Métricas
  const polizasActivas = polizasMonse.filter(p => p.estatus === "activa").length
  const polizasVencidas = polizasMonse.filter(p => p.estatus === "vencida").length
  const polizasPorRenovar = polizasMonse.filter(p => p.estatus === "por-renovar").length
  const prospectosConvertidos = prospectosMonse.filter(p => p.estatus === "convertido").length
  const tasaConversion = prospectosMonse.length > 0 
    ? ((prospectosConvertidos / prospectosMonse.length) * 100).toFixed(1)
    : "0"

  const primaTotal = polizasMonse.reduce((sum, p) => sum + p.primaEmitida, 0)
  const primaCobrada = polizasMonse.reduce((sum, p) => sum + p.primaCobrada, 0)
  const efectividadCobranza = primaTotal > 0 
    ? ((primaCobrada / primaTotal) * 100).toFixed(1)
    : "0"

  const eventosProximos = eventosMonse
    .filter(e => new Date(e.fecha) >= new Date())
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    .slice(0, 5)

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="main-content-aligned">
          <PageHeader
            title="Panel de Monse"
            subtitle="Seguimiento personalizado de clientes, pólizas y prospectos"
          />

          {/* KPIs Principales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/10">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Clientes</p>
                    <p className="text-2xl font-bold">{clientesMonse.length}</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-green-500/10">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pólizas Activas</p>
                    <p className="text-2xl font-bold text-green-600">{polizasActivas}</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-500/10">
                    <Target className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Prospectos</p>
                    <p className="text-2xl font-bold text-purple-600">{prospectosMonse.length}</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-orange-500/10">
                    <DollarSign className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Prima Total</p>
                    <p className="text-2xl font-bold text-orange-600">${(primaTotal / 1000).toFixed(0)}k</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </div>

          {/* Métricas de Desempeño */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <GlassCard className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Tasa de Conversión</p>
                    <p className="text-3xl font-bold text-purple-600">{tasaConversion}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-500/10">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {prospectosConvertidos} de {prospectosMonse.length} prospectos convertidos
                </p>
              </GlassCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <GlassCard className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Efectividad de Cobranza</p>
                    <p className="text-3xl font-bold text-green-600">{efectividadCobranza}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-green-500/10">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  ${(primaCobrada / 1000).toFixed(0)}k de ${(primaTotal / 1000).toFixed(0)}k cobrados
                </p>
              </GlassCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <GlassCard className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Pólizas Pendientes</p>
                    <p className="text-3xl font-bold text-red-600">{polizasVencidas + polizasPorRenovar}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-red-500/10">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {polizasVencidas} vencidas, {polizasPorRenovar} por renovar
                </p>
              </GlassCard>
            </motion.div>
          </div>

          {/* Próximos Eventos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Próximos Eventos
                </h3>
                <div className="space-y-3">
                  {eventosProximos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin eventos próximos</p>
                  ) : (
                    eventosProximos.map((evento) => (
                      <div key={evento.id} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div className="flex items-start justify-between mb-1">
                          <p className="font-medium text-sm">{evento.titulo}</p>
                          <Badge variant="outline" className="text-xs">
                            {evento.tipo}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(evento.fecha).toLocaleDateString("es-MX")}
                          {evento.hora && ` a las ${evento.hora}`}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </GlassCard>
            </motion.div>

            {/* Clientes Recientes */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Clientes
                </h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {clientesMonse.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin clientes asignados</p>
                  ) : (
                    clientesMonse.slice(0, 8).map((cliente) => (
                      <div key={cliente.id} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                        <p className="font-medium text-sm">{cliente.nombre}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          {cliente.email && (
                            <a href={`mailto:${cliente.email}`} className="flex items-center gap-1 hover:text-foreground">
                              <Mail className="w-3 h-3" />
                              {cliente.email.split("@")[0]}
                            </a>
                          )}
                          {cliente.telefono && (
                            <a href={`tel:${cliente.telefono}`} className="flex items-center gap-1 hover:text-foreground">
                              <Phone className="w-3 h-3" />
                              {cliente.telefono}
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
