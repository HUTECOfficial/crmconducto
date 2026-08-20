"use client"

import { useMemo } from "react"
import { GlassCard } from "@/components/glass-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { Calendar, Clock, FileText, Bell, Users, CheckCircle2 } from "lucide-react"
import { useSupabase } from "@/contexts/supabase-context"
import { useRouter } from "next/navigation"

export function ProximosEventos() {
  const { eventos, polizas, clientes, companias } = useSupabase()
  const router = useRouter()
  const hoy = new Date()

  const proximosEventos = useMemo(() => {
    const items: { id: string; titulo: string; descripcion: string; fecha: string; tipo: string; prioridad: string }[] = []

    // Eventos de Supabase (próximos 30 días, no completados)
    eventos
      .filter(e => !e.completado)
      .forEach(evento => {
        const fechaEvento = new Date(evento.fecha)
        const dias = Math.ceil((fechaEvento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
        if (dias >= -1 && dias <= 30) {
          items.push({
            id: evento.id,
            titulo: evento.titulo,
            descripcion: evento.descripcion || "",
            fecha: evento.fecha,
            tipo: evento.tipo,
            prioridad: evento.prioridad,
          })
        }
      })

    // Renovaciones de pólizas (próximos 30 días)
    polizas.forEach(poliza => {
      const vigenciaFin = new Date(poliza.vigenciaFin)
      const dias = Math.ceil((vigenciaFin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
      if (dias > 0 && dias <= 30) {
        const cliente = clientes.find(c => c.id === poliza.clienteId)
        const compania = companias.find(c => c.id === poliza.companiaId)
        items.push({
          id: `poliza-${poliza.id}`,
          titulo: `Renovación: ${poliza.numeroPoliza}`,
          descripcion: `${cliente?.nombre || "Cliente"} - ${compania?.nombre || "Compañía"} - $${poliza.prima.toLocaleString()}`,
          fecha: poliza.vigenciaFin,
          tipo: "renovacion",
          prioridad: dias <= 7 ? "alta" : dias <= 15 ? "media" : "baja",
        })
      }
    })

    // Ordenar por fecha y prioridad
    const prioridadOrden: Record<string, number> = { alta: 0, media: 1, baja: 2 }
    return items.sort((a, b) => {
      if (prioridadOrden[a.prioridad] !== prioridadOrden[b.prioridad]) {
        return prioridadOrden[a.prioridad] - prioridadOrden[b.prioridad]
      }
      return new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    }).slice(0, 8)
  }, [eventos, polizas, clientes, companias, hoy])

  const getIconoTipo = (tipo: string) => {
    switch (tipo) {
      case "renovacion": return <FileText className="w-4 h-4" />
      case "pago": return <Clock className="w-4 h-4" />
      case "cita": return <Users className="w-4 h-4" />
      case "recordatorio": return <Bell className="w-4 h-4" />
      default: return <Calendar className="w-4 h-4" />
    }
  }

  const getColorPrioridad = (prioridad: string) => {
    switch (prioridad) {
      case "alta": return "border-red-500 bg-red-50 dark:bg-red-950/20"
      case "media": return "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
      case "baja": return "border-green-500 bg-green-50 dark:bg-green-950/20"
      default: return "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
    }
  }

  const pendientes = proximosEventos.length

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-serif">Próximos Eventos</h2>
            <p className="text-sm text-muted-foreground">
              {pendientes} pendientes en los próximos 30 días
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/calendario")}
          className="gap-2"
        >
          <Calendar className="w-4 h-4" />
          Ver Calendario
        </Button>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {proximosEventos.map((evento, index) => (
            <motion.div
              key={evento.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 rounded-xl border-l-4 ${getColorPrioridad(evento.prioridad)}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getIconoTipo(evento.tipo)}
                    <h3 className="font-semibold text-sm">{evento.titulo}</h3>
                  </div>

                  {evento.descripcion && (
                    <p className="text-sm text-muted-foreground mb-2">{evento.descripcion}</p>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {new Date(evento.fecha).toLocaleDateString("es-MX", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        evento.prioridad === "alta" ? "border-red-500 text-red-600" :
                        evento.prioridad === "media" ? "border-yellow-500 text-yellow-600" :
                        "border-green-500 text-green-600"
                      }`}
                    >
                      {evento.prioridad === "alta" && "Alta"}
                      {evento.prioridad === "media" && "Media"}
                      {evento.prioridad === "baja" && "Baja"}
                    </Badge>
                    <Badge variant="outline" className="text-xs capitalize">
                      {evento.tipo.replace("-", " ")}
                    </Badge>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {proximosEventos.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No hay eventos próximos</p>
        </div>
      )}
    </GlassCard>
  )
}
