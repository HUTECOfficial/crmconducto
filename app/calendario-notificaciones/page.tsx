"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { PageHeader } from "@/components/page-header"
import { GlassCard } from "@/components/glass-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ProtectedRoute } from "@/components/protected-route"
import { Calendar, Bell, AlertCircle, CheckCircle2, Clock } from "lucide-react"
import { motion } from "framer-motion"
import { useSupabase } from "@/contexts/supabase-context"
import { toast } from "sonner"

type TipoNotificacion = "verde" | "amarillo" | "magenta"

interface Notificacion {
  id: string
  tipo: TipoNotificacion
  titulo: string
  descripcion: string
  fecha: string
  polizaId?: string
  prioridad: "alta" | "media" | "baja"
}

export default function CalendarioNotificacionesPage() {
  const { polizas, clientes, companias } = useSupabase()
  const [filtroTipo, setFiltroTipo] = useState<TipoNotificacion | "todas">("todas")
  const [notificacionesLeidas, setNotificacionesLeidas] = useState<Set<string>>(new Set())

  // Generar notificaciones basadas en pólizas
  const generarNotificaciones = (): Notificacion[] => {
    const notificaciones: Notificacion[] = []
    const hoy = new Date()

    polizas.forEach(poliza => {
      const cliente = clientes.find(c => c.id === poliza.clienteId)
      const compania = companias.find(c => c.id === poliza.companiaId)
      const vigenciaFin = new Date(poliza.vigenciaFin)
      const diasParaVencer = Math.ceil((vigenciaFin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))

      // VERDE - Pólizas próximas a renovar (30-60 días)
      if (diasParaVencer > 30 && diasParaVencer <= 60) {
        notificaciones.push({
          id: `verde-${poliza.id}`,
          tipo: "verde",
          titulo: `Renovación próxima: ${poliza.numeroPoliza}`,
          descripcion: `${cliente?.nombre} - ${compania?.nombre} - Vence en ${diasParaVencer} días`,
          fecha: poliza.vigenciaFin,
          polizaId: poliza.id,
          prioridad: "baja"
        })
      }

      // AMARILLO - Pólizas por vencer (15-30 días)
      if (diasParaVencer > 15 && diasParaVencer <= 30) {
        notificaciones.push({
          id: `amarillo-${poliza.id}`,
          tipo: "amarillo",
          titulo: `Atención: ${poliza.numeroPoliza}`,
          descripcion: `${cliente?.nombre} - ${compania?.nombre} - Vence en ${diasParaVencer} días`,
          fecha: poliza.vigenciaFin,
          polizaId: poliza.id,
          prioridad: "media"
        })
      }

      // MAGENTA - Pólizas urgentes (0-15 días) o vencidas
      if (diasParaVencer <= 15) {
        notificaciones.push({
          id: `magenta-${poliza.id}`,
          tipo: "magenta",
          titulo: `URGENTE: ${poliza.numeroPoliza}`,
          descripcion: `${cliente?.nombre} - ${compania?.nombre} - ${diasParaVencer > 0 ? `Vence en ${diasParaVencer} días` : 'VENCIDA'}`,
          fecha: poliza.vigenciaFin,
          polizaId: poliza.id,
          prioridad: "alta"
        })
      }

      // Notificaciones de pago pendiente
      const primaPendiente = poliza.primaEmitida - poliza.primaCobrada
      if (primaPendiente > 0 && poliza.estatus === "activa") {
        notificaciones.push({
          id: `pago-${poliza.id}`,
          tipo: "amarillo",
          titulo: `Pago pendiente: ${poliza.numeroPoliza}`,
          descripcion: `${cliente?.nombre} - Pendiente: $${primaPendiente.toLocaleString()}`,
          fecha: poliza.ultimoDiaPago || poliza.vigenciaFin,
          polizaId: poliza.id,
          prioridad: "media"
        })
      }

      // Notificaciones de marca por actualización
      if (poliza.marcaActualizacion) {
        notificaciones.push({
          id: `actualizacion-${poliza.id}`,
          tipo: "magenta",
          titulo: `Actualización requerida: ${poliza.numeroPoliza}`,
          descripcion: `${cliente?.nombre} - ${compania?.nombre} - Requiere actualización`,
          fecha: new Date().toISOString().split("T")[0],
          polizaId: poliza.id,
          prioridad: "alta"
        })
      }
    })

    return notificaciones.sort((a, b) => {
      const prioridadOrden = { alta: 0, media: 1, baja: 2 }
      return prioridadOrden[a.prioridad] - prioridadOrden[b.prioridad]
    })
  }

  const notificaciones = generarNotificaciones()
  const notificacionesFiltradas = filtroTipo === "todas" 
    ? notificaciones.filter(n => !notificacionesLeidas.has(n.id))
    : notificaciones.filter(n => n.tipo === filtroTipo && !notificacionesLeidas.has(n.id))

  const marcarComoLeida = (id: string) => {
    setNotificacionesLeidas(prev => new Set([...prev, id]))
    toast.success("Notificación marcada como leída")
  }

  const marcarTodasComoLeidas = () => {
    const ids = notificaciones.map(n => n.id)
    setNotificacionesLeidas(prev => new Set([...prev, ...ids]))
    toast.success("Todas las notificaciones marcadas como leídas")
  }

  const contadores = {
    verde: notificaciones.filter(n => n.tipo === "verde").length,
    amarillo: notificaciones.filter(n => n.tipo === "amarillo").length,
    magenta: notificaciones.filter(n => n.tipo === "magenta").length,
  }

  const getColorClasses = (tipo: TipoNotificacion) => {
    switch (tipo) {
      case "verde":
        return {
          bg: "bg-green-100 dark:bg-green-950/30",
          border: "border-green-300 dark:border-green-800",
          text: "text-green-700 dark:text-green-400",
          badge: "bg-green-500/10 text-green-600 border-green-500/20"
        }
      case "amarillo":
        return {
          bg: "bg-yellow-100 dark:bg-yellow-950/30",
          border: "border-yellow-300 dark:border-yellow-800",
          text: "text-yellow-700 dark:text-yellow-400",
          badge: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
        }
      case "magenta":
        return {
          bg: "bg-fuchsia-100 dark:bg-fuchsia-950/30",
          border: "border-fuchsia-300 dark:border-fuchsia-800",
          text: "text-fuchsia-700 dark:text-fuchsia-400",
          badge: "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20"
        }
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="main-content-aligned">
          <PageHeader
            title="Calendario de Notificaciones"
            subtitle="Sistema de alertas V-A-M (Verde-Amarillo-Magenta)"
          />

          {/* KPIs de Notificaciones */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
              <GlassCard className="p-5 border-l-4 border-green-500">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-xl bg-green-500/10">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">VERDE - PRÓXIMAS</p>
                </div>
                <p className="text-2xl font-bold text-green-600">{contadores.verde}</p>
                <p className="text-xs text-muted-foreground mt-1">30-60 días</p>
              </GlassCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <GlassCard className="p-5 border-l-4 border-yellow-500">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-xl bg-yellow-500/10">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">AMARILLO - ATENCIÓN</p>
                </div>
                <p className="text-2xl font-bold text-yellow-600">{contadores.amarillo}</p>
                <p className="text-xs text-muted-foreground mt-1">15-30 días</p>
              </GlassCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <GlassCard className="p-5 border-l-4 border-fuchsia-500">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-xl bg-fuchsia-500/10">
                    <AlertCircle className="w-5 h-5 text-fuchsia-600" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">MAGENTA - URGENTE</p>
                </div>
                <p className="text-2xl font-bold text-fuchsia-600">{contadores.magenta}</p>
                <p className="text-xs text-muted-foreground mt-1">0-15 días o vencidas</p>
              </GlassCard>
            </motion.div>
          </div>

          {/* Filtros */}
          <div className="flex gap-2 mb-6 flex-wrap items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => setFiltroTipo("todas")}
                variant={filtroTipo === "todas" ? "default" : "outline"}
                size="sm"
              >
                Todas ({notificaciones.length - notificacionesLeidas.size})
              </Button>
              <Button
                onClick={() => setFiltroTipo("verde")}
                variant={filtroTipo === "verde" ? "default" : "outline"}
                size="sm"
                className={filtroTipo === "verde" ? "bg-green-600 hover:bg-green-700" : ""}
              >
                Verde ({contadores.verde})
              </Button>
              <Button
                onClick={() => setFiltroTipo("amarillo")}
                variant={filtroTipo === "amarillo" ? "default" : "outline"}
                size="sm"
                className={filtroTipo === "amarillo" ? "bg-yellow-600 hover:bg-yellow-700" : ""}
              >
                Amarillo ({contadores.amarillo})
              </Button>
              <Button
                onClick={() => setFiltroTipo("magenta")}
                variant={filtroTipo === "magenta" ? "default" : "outline"}
                size="sm"
                className={filtroTipo === "magenta" ? "bg-fuchsia-600 hover:bg-fuchsia-700" : ""}
              >
                Magenta ({contadores.magenta})
              </Button>
            </div>
            {notificaciones.length > 0 && notificacionesLeidas.size < notificaciones.length && (
              <Button
                onClick={marcarTodasComoLeidas}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Marcar todas leídas
              </Button>
            )}
          </div>

          {/* Lista de Notificaciones */}
          <div className="space-y-3">
            {notificacionesFiltradas.map((notificacion, index) => {
              const colors = getColorClasses(notificacion.tipo)
              return (
                <motion.div
                  key={notificacion.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <GlassCard className={`p-4 border-l-4 ${colors.bg} ${colors.border}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className={colors.badge}>
                            {notificacion.tipo.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {notificacion.prioridad === "alta" && "⚠️ Alta"}
                            {notificacion.prioridad === "media" && "⚡ Media"}
                            {notificacion.prioridad === "baja" && "ℹ️ Baja"}
                          </Badge>
                        </div>
                        <h3 className={`font-semibold mb-1 ${colors.text}`}>
                          {notificacion.titulo}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {notificacion.descripcion}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          📅 {new Date(notificacion.fecha).toLocaleDateString('es-MX', { 
                            day: '2-digit', 
                            month: 'long', 
                            year: 'numeric' 
                          })}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => marcarComoLeida(notificacion.id)}
                          title="Marcar como leída"
                          className="hover:bg-green-500/10 hover:text-green-600 transition-colors"
                        >
                          <Bell className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )
            })}
          </div>

          {notificacionesFiltradas.length === 0 && (
            <GlassCard className="p-8 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                {notificacionesLeidas.size > 0 && notificaciones.length > 0
                  ? "Todas las notificaciones han sido marcadas como leídas"
                  : "No hay notificaciones en esta categoría"}
              </p>
              {notificacionesLeidas.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNotificacionesLeidas(new Set())}
                  className="mt-4"
                >
                  Mostrar notificaciones leídas
                </Button>
              )}
            </GlassCard>
          )}

          {/* Leyenda */}
          <div className="mt-8 p-4 glass rounded-2xl">
            <h4 className="font-semibold mb-3">Leyenda del Sistema V-A-M</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 bg-green-500 rounded-full mt-1"></div>
                <div>
                  <p className="font-medium text-green-600">Verde</p>
                  <p className="text-xs text-muted-foreground">Renovaciones próximas (30-60 días)</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 bg-yellow-500 rounded-full mt-1"></div>
                <div>
                  <p className="font-medium text-yellow-600">Amarillo</p>
                  <p className="text-xs text-muted-foreground">Atención requerida (15-30 días)</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 bg-fuchsia-500 rounded-full mt-1"></div>
                <div>
                  <p className="font-medium text-fuchsia-600">Magenta</p>
                  <p className="text-xs text-muted-foreground">Urgente (0-15 días o vencidas)</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
