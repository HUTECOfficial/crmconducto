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
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, CheckCircle2, AlertTriangle, FileText, Trash2, Bell, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { ProtectedRoute } from "@/components/protected-route"
import { toast } from "sonner"

// Colores de prioridad: Verde (baja), Amarillo (media), Rojo (alta)
const PRIORIDAD_COLORS = {
  alta: { 
    bg: "bg-red-100 dark:bg-red-950/40", 
    border: "border-l-4 border-red-500", 
    text: "text-red-700 dark:text-red-400", 
    dot: "bg-red-500",
    badge: "bg-red-500 text-white"
  },
  media: { 
    bg: "bg-yellow-100 dark:bg-yellow-950/40", 
    border: "border-l-4 border-yellow-500", 
    text: "text-yellow-700 dark:text-yellow-400", 
    dot: "bg-yellow-500",
    badge: "bg-yellow-500 text-black"
  },
  baja: { 
    bg: "bg-green-100 dark:bg-green-950/40", 
    border: "border-l-4 border-green-500", 
    text: "text-green-700 dark:text-green-400", 
    dot: "bg-green-500",
    badge: "bg-green-500 text-white"
  },
}

const TIPO_ICONS = {
  renovacion: <FileText className="w-4 h-4" />,
  pago: <Clock className="w-4 h-4" />,
  cita: <Users className="w-4 h-4" />,
  recordatorio: <Bell className="w-4 h-4" />,
  otro: <Calendar className="w-4 h-4" />,
}

interface EventoCalendario {
  id: string
  titulo: string
  descripcion?: string
  fecha: string
  hora?: string
  tipo: 'renovacion' | 'pago' | 'cita' | 'recordatorio' | 'otro'
  prioridad: 'alta' | 'media' | 'baja'
  polizaId?: string
  clienteId?: string
  completado: boolean
  origen: 'evento' | 'poliza' | 'recordatorio'
}

export default function CalendarioPage() {
  const { polizas, clientes, companias, eventos, agregarEvento, actualizarEvento, eliminarEvento, loadingEventos } = useSupabase()
  
  const [vistaActual, setVistaActual] = useState<"mes" | "lista">("mes")
  const [mesActual, setMesActual] = useState(new Date())
  const [modalNuevoEvento, setModalNuevoEvento] = useState(false)
  const [filtroPrioridad, setFiltroPrioridad] = useState<"todas" | "alta" | "media" | "baja">("todas")
  const [filtroTipo, setFiltroTipo] = useState<string>("todos")
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null)
  const [modalDia, setModalDia] = useState(false)
  
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

  // Generar eventos del calendario combinando eventos de Supabase + pólizas por vencer
  const eventosCalendario = useMemo(() => {
    const todosEventos: EventoCalendario[] = []
    const hoy = new Date()

    // 1. Eventos de Supabase
    eventos.forEach(evento => {
      todosEventos.push({
        ...evento,
        origen: 'evento'
      })
    })

    // 2. Renovaciones de pólizas (próximos 60 días)
    polizas.forEach(poliza => {
      const vigenciaFin = new Date(poliza.vigenciaFin)
      const diasParaVencer = Math.ceil((vigenciaFin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
      
      if (diasParaVencer > 0 && diasParaVencer <= 60) {
        const cliente = clientes.find(c => c.id === poliza.clienteId)
        const compania = companias.find(c => c.id === poliza.companiaId)
        
        let prioridad: 'alta' | 'media' | 'baja' = 'baja'
        if (diasParaVencer <= 7) prioridad = 'alta'
        else if (diasParaVencer <= 30) prioridad = 'media'
        
        todosEventos.push({
          id: `poliza-${poliza.id}`,
          titulo: `Renovación: ${poliza.numeroPoliza}`,
          descripcion: `${cliente?.nombre || 'Cliente'} - ${compania?.nombre || 'Compañía'} - $${poliza.prima.toLocaleString()}`,
          fecha: poliza.vigenciaFin,
          tipo: 'renovacion',
          prioridad,
          polizaId: poliza.id,
          clienteId: poliza.clienteId,
          completado: false,
          origen: 'poliza'
        })
      }

      // 3. Recordatorios de pólizas
      if (poliza.fechasRecordatorio) {
        const { fecha1, fecha2, fecha3 } = poliza.fechasRecordatorio
        const cliente = clientes.find(c => c.id === poliza.clienteId)
        
        if (fecha1) {
          todosEventos.push({
            id: `recordatorio-1-${poliza.id}`,
            titulo: `Recordatorio 1: ${poliza.numeroPoliza}`,
            descripcion: `Primer recordatorio - ${cliente?.nombre}`,
            fecha: fecha1,
            tipo: 'recordatorio',
            prioridad: 'baja',
            polizaId: poliza.id,
            completado: true,
            origen: 'recordatorio'
          })
        }
        if (fecha2) {
          todosEventos.push({
            id: `recordatorio-2-${poliza.id}`,
            titulo: `Recordatorio 2: ${poliza.numeroPoliza}`,
            descripcion: `Segundo recordatorio - ${cliente?.nombre}`,
            fecha: fecha2,
            tipo: 'recordatorio',
            prioridad: 'media',
            polizaId: poliza.id,
            completado: true,
            origen: 'recordatorio'
          })
        }
        if (fecha3) {
          todosEventos.push({
            id: `recordatorio-3-${poliza.id}`,
            titulo: `Recordatorio 3: ${poliza.numeroPoliza}`,
            descripcion: `Tercer recordatorio - ${cliente?.nombre}`,
            fecha: fecha3,
            tipo: 'recordatorio',
            prioridad: 'alta',
            polizaId: poliza.id,
            completado: true,
            origen: 'recordatorio'
          })
        }
      }
    })

    return todosEventos
  }, [eventos, polizas, clientes, companias])

  // Filtrar eventos
  const eventosFiltrados = useMemo(() => {
    return eventosCalendario.filter(evento => {
      if (filtroPrioridad !== "todas" && evento.prioridad !== filtroPrioridad) return false
      if (filtroTipo !== "todos" && evento.tipo !== filtroTipo) return false
      return true
    })
  }, [eventosCalendario, filtroPrioridad, filtroTipo])

  // Agrupar eventos por fecha
  const eventosPorFecha = useMemo(() => {
    return eventosFiltrados.reduce((acc, evento) => {
      const fecha = evento.fecha
      if (!acc[fecha]) acc[fecha] = []
      acc[fecha].push(evento)
      return acc
    }, {} as Record<string, EventoCalendario[]>)
  }, [eventosFiltrados])

  // Días del mes
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

  const handleCrearEvento = async () => {
    if (!nuevoEvento.titulo || !nuevoEvento.fecha) {
      toast.error("Título y fecha son obligatorios")
      return
    }

    await agregarEvento({
      titulo: nuevoEvento.titulo,
      descripcion: nuevoEvento.descripcion || undefined,
      fecha: nuevoEvento.fecha,
      hora: nuevoEvento.hora || undefined,
      tipo: nuevoEvento.tipo,
      prioridad: nuevoEvento.prioridad,
      polizaId: nuevoEvento.polizaId || undefined,
      clienteId: nuevoEvento.clienteId || undefined,
      completado: false,
    })

    setModalNuevoEvento(false)
    setNuevoEvento({
      titulo: "",
      descripcion: "",
      fecha: new Date().toISOString().split("T")[0],
      hora: "",
      tipo: "otro",
      prioridad: "media",
      polizaId: "",
      clienteId: "",
    })
  }

  const handleToggleCompletado = async (evento: EventoCalendario) => {
    if (evento.origen !== 'evento') return
    await actualizarEvento(evento.id, { completado: !evento.completado })
  }

  const handleEliminarEvento = async (id: string, origen: string) => {
    if (origen !== 'evento') {
      toast.error("Solo se pueden eliminar eventos creados manualmente")
      return
    }
    await eliminarEvento(id)
  }

  // Contadores para KPIs
  const contadores = useMemo(() => {
    const alta = eventosFiltrados.filter(e => e.prioridad === 'alta' && !e.completado).length
    const media = eventosFiltrados.filter(e => e.prioridad === 'media' && !e.completado).length
    const baja = eventosFiltrados.filter(e => e.prioridad === 'baja' && !e.completado).length
    return { alta, media, baja, total: alta + media + baja }
  }, [eventosFiltrados])

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="main-content-aligned">
          <PageHeader
            title="Calendario"
            subtitle="Gestiona tus eventos, renovaciones y recordatorios"
            action={
              <Button onClick={() => setModalNuevoEvento(true)} className="gap-2">
                <Plus className="w-5 h-5" />
                Nuevo Evento
              </Button>
            }
          />

          {/* KPIs de Prioridad */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <div>
                  <p className="text-sm text-muted-foreground">Alta Prioridad</p>
                  <p className="text-2xl font-bold text-red-600">{contadores.alta}</p>
                </div>
              </div>
            </GlassCard>
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                <div>
                  <p className="text-sm text-muted-foreground">Media Prioridad</p>
                  <p className="text-2xl font-bold text-yellow-600">{contadores.media}</p>
                </div>
              </div>
            </GlassCard>
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <div>
                  <p className="text-sm text-muted-foreground">Baja Prioridad</p>
                  <p className="text-2xl font-bold text-green-600">{contadores.baja}</p>
                </div>
              </div>
            </GlassCard>
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Pendientes</p>
                  <p className="text-2xl font-bold">{contadores.total}</p>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Controles */}
          <GlassCard className="p-4 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => cambiarMes(-1)}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <h2 className="text-xl font-bold font-serif min-w-[200px] text-center capitalize">
                  {mesActual.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
                </h2>
                <Button variant="outline" size="icon" onClick={() => cambiarMes(1)}>
                  <ChevronRight className="w-5 h-5" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setMesActual(new Date())}>
                  Hoy
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {/* Filtro de prioridad */}
                <Select value={filtroPrioridad} onValueChange={(v: any) => setFiltroPrioridad(v)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="alta">🔴 Alta</SelectItem>
                    <SelectItem value="media">🟡 Media</SelectItem>
                    <SelectItem value="baja">🟢 Baja</SelectItem>
                  </SelectContent>
                </Select>

                {/* Filtro de tipo */}
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="renovacion">Renovación</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="cita">Cita</SelectItem>
                    <SelectItem value="recordatorio">Recordatorio</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>

                {/* Vista */}
                <div className="flex gap-1">
                  <Button
                    variant={vistaActual === "mes" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setVistaActual("mes")}
                  >
                    Mes
                  </Button>
                  <Button
                    variant={vistaActual === "lista" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setVistaActual("lista")}
                  >
                    Lista
                  </Button>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Leyenda de colores */}
          <div className="flex items-center gap-6 mb-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>Alta (Urgente)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span>Media (Atención)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Baja (Normal)</span>
            </div>
          </div>

          {vistaActual === "mes" ? (
            <GlassCard className="p-6">
              {/* Encabezados de días */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((dia) => (
                  <div key={dia} className="text-center font-semibold text-sm text-muted-foreground p-2">
                    {dia}
                  </div>
                ))}
              </div>

              {/* Días del mes */}
              <div className="grid grid-cols-7 gap-2">
                {getDiasDelMes().map((dia, index) => {
                  const fechaStr = dia.fecha.toISOString().split("T")[0]
                  const eventosDia = eventosPorFecha[fechaStr] || []
                  const esHoy = dia.fecha.toDateString() === new Date().toDateString()
                  const tieneAltaPrioridad = eventosDia.some(e => e.prioridad === 'alta' && !e.completado)
                  const tieneMediaPrioridad = eventosDia.some(e => e.prioridad === 'media' && !e.completado)

                  return (
                    <motion.div
                      key={index}
                      className={cn(
                        "min-h-[100px] p-2 rounded-xl border transition-all cursor-pointer hover:shadow-md",
                        dia.esDelMes ? "bg-card border-border/50" : "bg-muted/20 border-transparent opacity-50",
                        esHoy && "ring-2 ring-primary",
                        tieneAltaPrioridad && dia.esDelMes && "border-red-300 dark:border-red-800",
                        tieneMediaPrioridad && !tieneAltaPrioridad && dia.esDelMes && "border-yellow-300 dark:border-yellow-800",
                      )}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.01 }}
                      onClick={() => {
                        setDiaSeleccionado(fechaStr)
                        setNuevoEvento(prev => ({ ...prev, fecha: fechaStr }))
                        setModalDia(true)
                      }}
                    >
                      <div className={cn(
                        "text-sm font-semibold mb-2",
                        esHoy && "text-primary"
                      )}>
                        {dia.fecha.getDate()}
                      </div>
                      <div className="space-y-1">
                        {eventosDia.slice(0, 3).map((evento) => {
                          const colors = PRIORIDAD_COLORS[evento.prioridad]
                          return (
                            <div
                              key={evento.id}
                              className={cn(
                                "text-xs p-1 rounded truncate flex items-center gap-1",
                                colors.bg,
                                colors.border,
                                evento.completado && "opacity-50 line-through"
                              )}
                            >
                              <div className={cn("w-2 h-2 rounded-full flex-shrink-0", colors.dot)}></div>
                              <span className="truncate">{evento.titulo}</span>
                            </div>
                          )
                        })}
                        {eventosDia.length > 3 && (
                          <div className="text-xs text-muted-foreground text-center">
                            +{eventosDia.length - 3} más
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </GlassCard>
          ) : (
            <GlassCard className="p-6">
              <div className="space-y-3">
                <AnimatePresence>
                  {eventosFiltrados
                    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
                    .map((evento, index) => {
                      const colors = PRIORIDAD_COLORS[evento.prioridad]
                      const cliente = clientes.find(c => c.id === evento.clienteId)
                      
                      return (
                        <motion.div
                          key={evento.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -100 }}
                          transition={{ delay: index * 0.02 }}
                          className={cn(
                            "p-4 rounded-xl flex items-start gap-4",
                            colors.bg,
                            colors.border,
                            evento.completado && "opacity-60"
                          )}
                        >
                          {evento.origen === 'evento' && (
                            <Checkbox
                              checked={evento.completado}
                              onCheckedChange={() => handleToggleCompletado(evento)}
                              className="mt-1"
                            />
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {TIPO_ICONS[evento.tipo]}
                              <h3 className={cn(
                                "font-semibold",
                                evento.completado && "line-through"
                              )}>
                                {evento.titulo}
                              </h3>
                              <Badge className={colors.badge}>
                                {evento.prioridad === 'alta' ? '🔴 Alta' : 
                                 evento.prioridad === 'media' ? '🟡 Media' : '🟢 Baja'}
                              </Badge>
                            </div>
                            
                            {evento.descripcion && (
                              <p className="text-sm text-muted-foreground mb-2">
                                {evento.descripcion}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>📅 {new Date(evento.fecha).toLocaleDateString('es-MX', { 
                                weekday: 'short', 
                                day: 'numeric', 
                                month: 'short' 
                              })}</span>
                              {evento.hora && <span>🕐 {evento.hora}</span>}
                              {cliente && <span>👤 {cliente.nombre}</span>}
                              <Badge variant="outline" className="text-xs capitalize">
                                {evento.tipo}
                              </Badge>
                            </div>
                          </div>

                          {evento.origen === 'evento' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEliminarEvento(evento.id, evento.origen)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </motion.div>
                      )
                    })}
                </AnimatePresence>

                {eventosFiltrados.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No hay eventos para mostrar</p>
                  </div>
                )}
              </div>
            </GlassCard>
          )}

          {/* Modal Día Seleccionado */}
          <Dialog open={modalDia} onOpenChange={setModalDia}>
            <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  {diaSeleccionado && new Date(diaSeleccionado + "T12:00:00").toLocaleDateString("es-MX", {
                    weekday: "long", day: "numeric", month: "long", year: "numeric"
                  })}
                </DialogTitle>
                <DialogDescription>
                  {(eventosPorFecha[diaSeleccionado || ""] || []).length} evento(s) programado(s)
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2">
                {(eventosPorFecha[diaSeleccionado || ""] || []).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No hay eventos para este día</p>
                  </div>
                ) : (
                  (eventosPorFecha[diaSeleccionado || ""] || []).map((evento) => {
                    const colors = PRIORIDAD_COLORS[evento.prioridad]
                    const cliente = clientes.find(c => c.id === evento.clienteId)
                    return (
                      <div
                        key={evento.id}
                        className={cn(
                          "p-3 rounded-xl flex items-start gap-3",
                          colors.bg,
                          colors.border,
                          evento.completado && "opacity-60"
                        )}
                      >
                        {evento.origen === "evento" && (
                          <Checkbox
                            checked={evento.completado}
                            onCheckedChange={() => handleToggleCompletado(evento)}
                            className="mt-0.5"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {TIPO_ICONS[evento.tipo]}
                            <span className={cn("font-semibold text-sm", evento.completado && "line-through")}>
                              {evento.titulo}
                            </span>
                            <Badge className={cn("text-xs", colors.badge)}>
                              {evento.prioridad === "alta" ? "🔴 Alta" : evento.prioridad === "media" ? "🟡 Media" : "🟢 Baja"}
                            </Badge>
                          </div>
                          {evento.descripcion && (
                            <p className="text-xs text-muted-foreground mt-1">{evento.descripcion}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {evento.hora && <span>🕐 {evento.hora}</span>}
                            {cliente && <span>👤 {cliente.nombre}</span>}
                            <Badge variant="outline" className="text-xs capitalize">{evento.tipo}</Badge>
                          </div>
                        </div>
                        {evento.origen === "evento" && (
                          <button
                            onClick={() => { handleEliminarEvento(evento.id, evento.origen); }}
                            className="text-muted-foreground hover:text-destructive transition-colors p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              <div className="flex justify-between pt-2 border-t border-border/20">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setModalDia(false); setModalNuevoEvento(true) }}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Agregar Evento
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setModalDia(false)}>
                  Cerrar
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Modal Nuevo Evento */}
          <Dialog open={modalNuevoEvento} onOpenChange={setModalNuevoEvento}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Nuevo Evento</DialogTitle>
                <DialogDescription>
                  Crea un nuevo evento en el calendario
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="titulo">Título *</Label>
                  <Input
                    id="titulo"
                    placeholder="Ej: Llamar a cliente, Renovación póliza..."
                    value={nuevoEvento.titulo}
                    onChange={(e) => setNuevoEvento({ ...nuevoEvento, titulo: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    placeholder="Detalles del evento..."
                    value={nuevoEvento.descripcion}
                    onChange={(e) => setNuevoEvento({ ...nuevoEvento, descripcion: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fecha">Fecha *</Label>
                    <Input
                      id="fecha"
                      type="date"
                      value={nuevoEvento.fecha}
                      onChange={(e) => setNuevoEvento({ ...nuevoEvento, fecha: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hora">Hora</Label>
                    <Input
                      id="hora"
                      type="time"
                      value={nuevoEvento.hora}
                      onChange={(e) => setNuevoEvento({ ...nuevoEvento, hora: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select 
                      value={nuevoEvento.tipo} 
                      onValueChange={(v: any) => setNuevoEvento({ ...nuevoEvento, tipo: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cita">Cita</SelectItem>
                        <SelectItem value="recordatorio">Recordatorio</SelectItem>
                        <SelectItem value="pago">Pago</SelectItem>
                        <SelectItem value="renovacion">Renovación</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Prioridad *</Label>
                    <Select 
                      value={nuevoEvento.prioridad} 
                      onValueChange={(v: any) => setNuevoEvento({ ...nuevoEvento, prioridad: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alta">🔴 Alta (Urgente)</SelectItem>
                        <SelectItem value="media">🟡 Media (Atención)</SelectItem>
                        <SelectItem value="baja">🟢 Baja (Normal)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Cliente (opcional)</Label>
                  <Select 
                    value={nuevoEvento.clienteId || "sin-cliente"} 
                    onValueChange={(v) => setNuevoEvento({ ...nuevoEvento, clienteId: v === "sin-cliente" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sin-cliente">Sin cliente</SelectItem>
                      {clientes.map(cliente => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setModalNuevoEvento(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCrearEvento}>
                  Crear Evento
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </ProtectedRoute>
  )
}
