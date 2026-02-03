"use client"

import { useState } from "react"
import { GlassCard } from "@/components/glass-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, Clock, AlertCircle, Calendar, Bell, Trash2 } from "lucide-react"
import { polizas } from "@/data/polizas"
import { clientes } from "@/data/clientes"
import { companias } from "@/data/companias"

interface Actividad {
  id: string
  tipo: "renovacion" | "pago-pendiente" | "actualizacion" | "notificacion"
  titulo: string
  descripcion: string
  fecha: string
  prioridad: "alta" | "media" | "baja"
  completada: boolean
  polizaId?: string
}

export function ActividadesRealizar() {
  const [actividades, setActividades] = useState<Actividad[]>(() => {
    const acts: Actividad[] = []
    const hoy = new Date()

    // Generar actividades desde pólizas
    polizas.forEach(poliza => {
      const cliente = clientes.find(c => c.id === poliza.clienteId)
      const compania = companias.find(c => c.id === poliza.companiaId)
      const vigenciaFin = new Date(poliza.vigenciaFin)
      const diasParaVencer = Math.ceil((vigenciaFin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))

      // Renovaciones próximas
      if (diasParaVencer > 0 && diasParaVencer <= 30) {
        acts.push({
          id: `renovacion-${poliza.id}`,
          tipo: "renovacion",
          titulo: `Renovar póliza ${poliza.numeroPoliza}`,
          descripcion: `${cliente?.nombre} - ${compania?.nombre} - Vence en ${diasParaVencer} días`,
          fecha: poliza.vigenciaFin,
          prioridad: diasParaVencer <= 7 ? "alta" : diasParaVencer <= 15 ? "media" : "baja",
          completada: false,
          polizaId: poliza.id
        })
      }

      // Pagos pendientes
      const primaPendiente = poliza.primaEmitida - poliza.primaCobrada
      if (primaPendiente > 0 && poliza.estatus === "activa") {
        acts.push({
          id: `pago-${poliza.id}`,
          tipo: "pago-pendiente",
          titulo: `Cobrar póliza ${poliza.numeroPoliza}`,
          descripcion: `${cliente?.nombre} - Pendiente: $${primaPendiente.toLocaleString()}`,
          fecha: poliza.ultimoDiaPago || poliza.vigenciaFin,
          prioridad: "media",
          completada: false,
          polizaId: poliza.id
        })
      }

      // Actualizaciones requeridas
      if (poliza.marcaActualizacion) {
        acts.push({
          id: `actualizacion-${poliza.id}`,
          tipo: "actualizacion",
          titulo: `Actualizar póliza ${poliza.numeroPoliza}`,
          descripcion: `${cliente?.nombre} - ${compania?.nombre} - Requiere actualización`,
          fecha: new Date().toISOString().split("T")[0],
          prioridad: "alta",
          completada: false,
          polizaId: poliza.id
        })
      }

      // Recordatorios programados
      if (poliza.fechasRecordatorio) {
        const { fecha1, fecha2, fecha3 } = poliza.fechasRecordatorio
        if (fecha1 && new Date(fecha1) <= hoy) {
          acts.push({
            id: `recordatorio-1-${poliza.id}`,
            tipo: "notificacion",
            titulo: `Seguimiento 1: ${poliza.numeroPoliza}`,
            descripcion: `${cliente?.nombre} - Primer recordatorio programado`,
            fecha: fecha1,
            prioridad: "baja",
            completada: false,
            polizaId: poliza.id
          })
        }
        if (fecha2 && new Date(fecha2) <= hoy) {
          acts.push({
            id: `recordatorio-2-${poliza.id}`,
            tipo: "notificacion",
            titulo: `Seguimiento 2: ${poliza.numeroPoliza}`,
            descripcion: `${cliente?.nombre} - Segundo recordatorio programado`,
            fecha: fecha2,
            prioridad: "media",
            completada: false,
            polizaId: poliza.id
          })
        }
        if (fecha3 && new Date(fecha3) <= hoy) {
          acts.push({
            id: `recordatorio-3-${poliza.id}`,
            tipo: "notificacion",
            titulo: `Seguimiento 3: ${poliza.numeroPoliza}`,
            descripcion: `${cliente?.nombre} - Tercer recordatorio programado`,
            fecha: fecha3,
            prioridad: "alta",
            completada: false,
            polizaId: poliza.id
          })
        }
      }
    })

    // Ordenar por prioridad y fecha
    return acts.sort((a, b) => {
      const prioridadOrden = { alta: 0, media: 1, baja: 2 }
      if (prioridadOrden[a.prioridad] !== prioridadOrden[b.prioridad]) {
        return prioridadOrden[a.prioridad] - prioridadOrden[b.prioridad]
      }
      return new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    })
  })

  const [filtro, setFiltro] = useState<"todas" | "pendientes" | "completadas">("pendientes")

  const actividadesFiltradas = actividades.filter(act => {
    if (filtro === "pendientes") return !act.completada
    if (filtro === "completadas") return act.completada
    return true
  })

  const toggleCompletada = (id: string) => {
    setActividades(actividades.map(act => 
      act.id === id ? { ...act, completada: !act.completada } : act
    ))
  }

  const eliminarActividad = (id: string) => {
    setActividades(actividades.filter(act => act.id !== id))
  }

  const getIconoTipo = (tipo: Actividad["tipo"]) => {
    switch (tipo) {
      case "renovacion":
        return <Calendar className="w-4 h-4" />
      case "pago-pendiente":
        return <AlertCircle className="w-4 h-4" />
      case "actualizacion":
        return <Clock className="w-4 h-4" />
      case "notificacion":
        return <Bell className="w-4 h-4" />
    }
  }

  const getColorPrioridad = (prioridad: Actividad["prioridad"]) => {
    switch (prioridad) {
      case "alta":
        return "border-red-500 bg-red-50 dark:bg-red-950/20"
      case "media":
        return "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
      case "baja":
        return "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
    }
  }

  const pendientes = actividades.filter(a => !a.completada).length
  const completadas = actividades.filter(a => a.completada).length

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <CheckCircle2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-serif">Actividades a Realizar</h2>
            <p className="text-sm text-muted-foreground">
              {pendientes} pendientes • {completadas} completadas
            </p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={filtro === "pendientes" ? "default" : "outline"}
          size="sm"
          onClick={() => setFiltro("pendientes")}
        >
          Pendientes ({pendientes})
        </Button>
        <Button
          variant={filtro === "completadas" ? "default" : "outline"}
          size="sm"
          onClick={() => setFiltro("completadas")}
        >
          Completadas ({completadas})
        </Button>
        <Button
          variant={filtro === "todas" ? "default" : "outline"}
          size="sm"
          onClick={() => setFiltro("todas")}
        >
          Todas ({actividades.length})
        </Button>
      </div>

      {/* Lista de actividades */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {actividadesFiltradas.map((actividad, index) => (
            <motion.div
              key={actividad.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 rounded-xl border-l-4 ${getColorPrioridad(actividad.prioridad)} ${
                actividad.completada ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={actividad.completada}
                  onCheckedChange={() => toggleCompletada(actividad.id)}
                  className="mt-1"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getIconoTipo(actividad.tipo)}
                    <h3 className={`font-semibold text-sm ${actividad.completada ? "line-through" : ""}`}>
                      {actividad.titulo}
                    </h3>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2">
                    {actividad.descripcion}
                  </p>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {new Date(actividad.fecha).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        actividad.prioridad === "alta" ? "border-red-500 text-red-600" :
                        actividad.prioridad === "media" ? "border-yellow-500 text-yellow-600" :
                        "border-blue-500 text-blue-600"
                      }`}
                    >
                      {actividad.prioridad === "alta" && "⚠️ Alta"}
                      {actividad.prioridad === "media" && "⚡ Media"}
                      {actividad.prioridad === "baja" && "ℹ️ Baja"}
                    </Badge>
                    <Badge variant="outline" className="text-xs capitalize">
                      {actividad.tipo.replace("-", " ")}
                    </Badge>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => eliminarActividad(actividad.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {actividadesFiltradas.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>
            {filtro === "pendientes" && "¡Excelente! No hay actividades pendientes"}
            {filtro === "completadas" && "No hay actividades completadas"}
            {filtro === "todas" && "No hay actividades registradas"}
          </p>
        </div>
      )}
    </GlassCard>
  )
}
