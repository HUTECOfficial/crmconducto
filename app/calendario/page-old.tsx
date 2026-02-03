"use client"

import { useState, useMemo } from "react"
import { Sidebar } from "@/components/sidebar"
import { PageHeader } from "@/components/page-header"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { useSupabase } from "@/contexts/supabase-context"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, CheckCircle2, AlertTriangle, XCircle, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ProtectedRoute } from "@/components/protected-route"
import { toast } from "sonner"

// Colores de prioridad
const PRIORIDAD_COLORS = {
  alta: { bg: "bg-red-100 dark:bg-red-950/40", border: "border-red-500", text: "text-red-700 dark:text-red-400", dot: "bg-red-500" },
  media: { bg: "bg-yellow-100 dark:bg-yellow-950/40", border: "border-yellow-500", text: "text-yellow-700 dark:text-yellow-400", dot: "bg-yellow-500" },
  baja: { bg: "bg-green-100 dark:bg-green-950/40", border: "border-green-500", text: "text-green-700 dark:text-green-400", dot: "bg-green-500" },
}

export default function CalendarioPage() {
  const { polizas, clientes, companias, eventos, agregarEvento, actualizarEvento, eliminarEvento, loadingEventos } = useSupabase()
  
  const [vistaActual, setVistaActual] = useState<"mes" | "lista">("mes")
  const [mesActual, setMesActual] = useState(new Date())
  const [modalNuevoEvento, setModalNuevoEvento] = useState(false)
  const [filtroPrioridad, setFiltroPrioridad] = useState<"todas" | "alta" | "media" | "baja">("todas")
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "renovacion" | "pago" | "cita" | "recordatorio" | "otro">("todos")
  
  // Estado del formulario
  const [nuevoEvento, setNuevoEvento] = useState({
    titulo: "",
    descripcion: "",
    fecha: new Date().toISOString().split("T")[0],
    hora: "",
    tipo: "otro" as "renovacion" | "pago" | "cita" | "recordatorio" | "otro",
    prioridad: "media" as "alta" | "media" | "baja",
    polizaId: "",
    clienteId: "",
  })

  // Combinar pagos y actividades para el calendario
  const eventosCalendario = [
    // Pagos como eventos
    ...pagos.map(pago => {
      const poliza = polizas.find(p => p.id === pago.polizaId)
      const cliente = clientes.find(c => c.id === poliza?.clienteId)
      const compania = companias.find(c => c.id === poliza?.companiaId)
      
      return {
        id: `pago-${pago.id}`,
        tipo: 'pago' as const,
        fecha: pago.fechaVencimiento,
        titulo: `Pago - ${cliente?.nombre}`,
        descripcion: `$${pago.monto.toLocaleString()} - ${compania?.nombre}`,
        color: compania?.color || '#6366f1',
        estatus: pago.estatus,
        urgente: getDiasRestantes(pago.fechaVencimiento) <= 7
      }
    }),
    // Actividades como eventos
    ...actividades.slice(0, 15).map((actividad, index) => {
      // Generar fechas distribuidas en el mes actual
      const fechaBase = new Date()
      fechaBase.setDate(Math.floor(Math.random() * 28) + 1)
      
      return {
        id: `actividad-${actividad.id}`,
        tipo: 'actividad' as const,
        fecha: fechaBase.toISOString().split('T')[0],
        titulo: actividad.tipo,
        descripcion: actividad.descripcion,
        color: actividad.tipo === 'llamada' ? '#10b981' : 
               actividad.tipo === 'reunion' ? '#f59e0b' : 
               actividad.tipo === 'email' ? '#3b82f6' : '#8b5cf6',
        estatus: 'programado',
        urgente: false
      }
    })
  ]

  // Agrupar eventos por fecha
  const eventosPorFecha = eventosCalendario.reduce(
    (acc, evento) => {
      const fecha = evento.fecha
      if (!acc[fecha]) acc[fecha] = []
      acc[fecha].push(evento)
      return acc
    },
    {} as Record<string, typeof eventosCalendario>,
  )

  const getDiasDelMes = () => {
    const year = mesActual.getFullYear()
    const month = mesActual.getMonth()
    const primerDia = new Date(year, month, 1)
    const ultimoDia = new Date(year, month + 1, 0)
    const dias = []

    // Días del mes anterior para completar la primera semana
    const primerDiaSemana = primerDia.getDay()
    for (let i = primerDiaSemana - 1; i >= 0; i--) {
      const dia = new Date(year, month, -i)
      dias.push({ fecha: dia, esDelMes: false })
    }

    // Días del mes actual
    for (let i = 1; i <= ultimoDia.getDate(); i++) {
      dias.push({ fecha: new Date(year, month, i), esDelMes: true })
    }

    return dias
  }

  const cambiarMes = (direccion: number) => {
    setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + direccion, 1))
  }

  function getDiasRestantes(fechaVencimiento: string) {
    const hoy = new Date()
    const vencimiento = new Date(fechaVencimiento)
    const diff = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const getIconoTipo = (tipo: string) => {
    switch (tipo) {
      case 'pago':
        return <FileText className="w-3 h-3" />
      case 'actividad':
        return <Clock className="w-3 h-3" />
      default:
        return <Calendar className="w-3 h-3" />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="main-content-aligned">
        <PageHeader
          title="Calendario General"
          subtitle="Vista integral de pagos, actividades y eventos"
          action={
            <NeoButton className="gap-2">
              <Plus className="w-5 h-5" />
              Nuevo Evento
            </NeoButton>
          }
        />

        {/* Controles de vista */}
        <GlassCard className="p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <NeoButton variant="ghost" size="sm" onClick={() => cambiarMes(-1)}>
                <ChevronLeft className="w-5 h-5" />
              </NeoButton>
              <h2 className="text-xl font-bold font-serif min-w-[200px] text-center">
                {mesActual.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
              </h2>
              <NeoButton variant="ghost" size="sm" onClick={() => cambiarMes(1)}>
                <ChevronRight className="w-5 h-5" />
              </NeoButton>
            </div>

            <div className="flex gap-2">
              <NeoButton
                variant={vistaActual === "mes" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setVistaActual("mes")}
              >
                Mes
              </NeoButton>
              <NeoButton
                variant={vistaActual === "lista" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setVistaActual("lista")}
              >
                Lista
              </NeoButton>
            </div>
          </div>
        </GlassCard>

        {vistaActual === "mes" ? (
          <GlassCard className="p-6">
            <div className="grid grid-cols-7 gap-2 mb-4">
              {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((dia) => (
                <div key={dia} className="text-center font-semibold text-sm text-muted-foreground p-2">
                  {dia}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {getDiasDelMes().map((dia, index) => {
                const fechaStr = dia.fecha.toISOString().split("T")[0]
                const eventosDia = eventosPorFecha[fechaStr] || []
                const esHoy = dia.fecha.toDateString() === new Date().toDateString()

                return (
                  <motion.div
                    key={index}
                    className={cn(
                      "min-h-[120px] p-2 rounded-xl border transition-colors",
                      dia.esDelMes ? "bg-card border-border/50" : "bg-muted/20 border-transparent",
                      esHoy && "ring-2 ring-primary",
                    )}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.01 }}
                  >
                    <div className="text-sm font-semibold mb-2">{dia.fecha.getDate()}</div>
                    <div className="space-y-1">
                      {eventosDia.slice(0, 3).map((evento) => (
                        <div
                          key={evento.id}
                          className="text-xs p-1.5 rounded-lg truncate flex items-center gap-1"
                          style={{ 
                            backgroundColor: `${evento.color}15`,
                            borderLeft: `3px solid ${evento.color}`,
                            color: evento.color
                          }}
                        >
                          {getIconoTipo(evento.tipo)}
                          <span className="truncate">{evento.titulo}</span>
                          {evento.urgente && (
                            <Badge variant="destructive" className="text-[10px] px-1 py-0 ml-auto">
                              !
                            </Badge>
                          )}
                        </div>
                      ))}
                      {eventosDia.length > 3 && (
                        <div className="text-xs text-muted-foreground">+{eventosDia.length - 3} más</div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-4 font-semibold">Fecha</th>
                    <th className="text-left p-4 font-semibold">Tipo</th>
                    <th className="text-left p-4 font-semibold">Evento</th>
                    <th className="text-left p-4 font-semibold">Descripción</th>
                    <th className="text-left p-4 font-semibold">Estatus</th>
                  </tr>
                </thead>
                <tbody>
                  {eventosCalendario
                    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
                    .map((evento, index) => (
                    <motion.tr
                      key={evento.id}
                      className="border-b border-border/30 hover:bg-muted/50 transition-colors"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                    >
                      <td className="p-4">
                        <p className="font-medium">{new Date(evento.fecha).toLocaleDateString()}</p>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" style={{ borderColor: evento.color, color: evento.color }}>
                          {evento.tipo}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <p className="font-medium">{evento.titulo}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-muted-foreground">{evento.descripcion}</p>
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={
                            evento.estatus === "pagado" || evento.estatus === "completado"
                              ? "default"
                              : evento.estatus === "vencido"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {evento.estatus}
                        </Badge>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}
      </main>
    </div>
  )
}
