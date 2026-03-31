"use client"

import { useState, useEffect } from "react"
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
import { ProtectedRoute } from "@/components/protected-route"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { Plus, Clock, CheckCircle2, Trash2, Play, Pause, RotateCcw, AlertCircle } from "lucide-react"

interface Tarea {
  id: string
  titulo: string
  descripcion?: string
  estado: 'pendiente' | 'en-progreso' | 'completada'
  prioridad: 'alta' | 'media' | 'baja'
  tiempoEstimado: number // en minutos
  tiempoTranscurrido: number // en minutos
  tiempoInicio?: number // timestamp
  fechaCreacion: string
  fechaCompletada?: string
  asignadoA?: string
}

const PRIORIDAD_COLORS = {
  alta: "bg-red-500/10 text-red-600 border-red-500/20",
  media: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  baja: "bg-green-500/10 text-green-600 border-green-500/20",
}

const ESTADO_COLORS = {
  pendiente: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  "en-progreso": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  completada: "bg-green-500/10 text-green-600 border-green-500/20",
}

export default function TareasPage() {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [modalNueva, setModalNueva] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState<"todas" | "pendiente" | "en-progreso" | "completada">("todas")
  const [tareasEnTiempo, setTareasEnTiempo] = useState<Record<string, number>>({})

  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    prioridad: "media" as const,
    tiempoEstimado: 30,
    asignadoA: "",
  })

  // Cargar tareas del localStorage
  useEffect(() => {
    const stored = localStorage.getItem("tareas")
    if (stored) {
      setTareas(JSON.parse(stored))
    }
  }, [])

  // Guardar tareas en localStorage
  useEffect(() => {
    localStorage.setItem("tareas", JSON.stringify(tareas))
  }, [tareas])

  // Timer para tareas en progreso
  useEffect(() => {
    const interval = setInterval(() => {
      setTareasEnTiempo(prev => {
        const updated = { ...prev }
        tareas.forEach(tarea => {
          if (tarea.estado === "en-progreso" && tarea.tiempoInicio) {
            const elapsed = Math.floor((Date.now() - tarea.tiempoInicio) / 1000 / 60)
            updated[tarea.id] = tarea.tiempoTranscurrido + elapsed
          }
        })
        return updated
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [tareas])

  const crearTarea = () => {
    if (!form.titulo.trim()) {
      toast.error("El título es obligatorio")
      return
    }

    const nuevaTarea: Tarea = {
      id: Date.now().toString(),
      titulo: form.titulo,
      descripcion: form.descripcion || undefined,
      estado: "pendiente",
      prioridad: form.prioridad,
      tiempoEstimado: form.tiempoEstimado,
      tiempoTranscurrido: 0,
      fechaCreacion: new Date().toISOString(),
      asignadoA: form.asignadoA || undefined,
    }

    setTareas([nuevaTarea, ...tareas])
    setForm({
      titulo: "",
      descripcion: "",
      prioridad: "media",
      tiempoEstimado: 30,
      asignadoA: "",
    })
    setModalNueva(false)
    toast.success("Tarea creada")
  }

  const iniciarTarea = (id: string) => {
    setTareas(tareas.map(t =>
      t.id === id
        ? { ...t, estado: "en-progreso", tiempoInicio: Date.now() }
        : t
    ))
  }

  const pausarTarea = (id: string) => {
    setTareas(tareas.map(t => {
      if (t.id === id && t.tiempoInicio) {
        const elapsed = Math.floor((Date.now() - t.tiempoInicio) / 1000 / 60)
        return {
          ...t,
          estado: "pendiente",
          tiempoTranscurrido: t.tiempoTranscurrido + elapsed,
          tiempoInicio: undefined,
        }
      }
      return t
    }))
  }

  const completarTarea = (id: string) => {
    setTareas(tareas.map(t => {
      if (t.id === id && t.tiempoInicio) {
        const elapsed = Math.floor((Date.now() - t.tiempoInicio) / 1000 / 60)
        return {
          ...t,
          estado: "completada",
          tiempoTranscurrido: t.tiempoTranscurrido + elapsed,
          tiempoInicio: undefined,
          fechaCompletada: new Date().toISOString(),
        }
      }
      return t
    }))
    toast.success("Tarea completada")
  }

  const eliminarTarea = (id: string) => {
    setTareas(tareas.filter(t => t.id !== id))
    toast.success("Tarea eliminada")
  }

  const resetearTiempo = (id: string) => {
    setTareas(tareas.map(t =>
      t.id === id
        ? { ...t, tiempoTranscurrido: 0, tiempoInicio: undefined, estado: "pendiente" }
        : t
    ))
  }

  const tareasFiltradas = tareas.filter(t =>
    filtroEstado === "todas" ? true : t.estado === filtroEstado
  )

  const formatearTiempo = (minutos: number) => {
    const horas = Math.floor(minutos / 60)
    const mins = minutos % 60
    if (horas > 0) return `${horas}h ${mins}m`
    return `${mins}m`
  }

  const calcularPorcentaje = (tarea: Tarea) => {
    const tiempoActual = tareasEnTiempo[tarea.id] || tarea.tiempoTranscurrido
    return Math.min(100, Math.round((tiempoActual / tarea.tiempoEstimado) * 100))
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="main-content-aligned">
          <PageHeader
            title="Seguimiento de Tareas"
            subtitle="Gestiona y mide el tiempo de tus tareas"
            action={
              <Button onClick={() => setModalNueva(true)} className="gap-2">
                <Plus className="w-5 h-5" />
                Nueva Tarea
              </Button>
            }
          />

          {/* Filtros */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {(["todas", "pendiente", "en-progreso", "completada"] as const).map(estado => (
              <Button
                key={estado}
                variant={filtroEstado === estado ? "default" : "outline"}
                size="sm"
                onClick={() => setFiltroEstado(estado)}
              >
                {estado === "todas" && "Todas"}
                {estado === "pendiente" && "Pendientes"}
                {estado === "en-progreso" && "En Progreso"}
                {estado === "completada" && "Completadas"}
              </Button>
            ))}
          </div>

          {/* Tareas */}
          <div className="space-y-3">
            {tareasFiltradas.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">No hay tareas en esta categoría</p>
              </GlassCard>
            ) : (
              tareasFiltradas.map((tarea, idx) => {
                const tiempoActual = tareasEnTiempo[tarea.id] || tarea.tiempoTranscurrido
                const porcentaje = calcularPorcentaje(tarea)
                const excedido = tiempoActual > tarea.tiempoEstimado

                return (
                  <motion.div
                    key={tarea.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <GlassCard className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{tarea.titulo}</h3>
                            <Badge variant="outline" className={PRIORIDAD_COLORS[tarea.prioridad]}>
                              {tarea.prioridad}
                            </Badge>
                            <Badge variant="outline" className={ESTADO_COLORS[tarea.estado]}>
                              {tarea.estado === "en-progreso" ? "En Progreso" : tarea.estado === "completada" ? "Completada" : "Pendiente"}
                            </Badge>
                          </div>
                          {tarea.descripcion && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{tarea.descripcion}</p>
                          )}
                        </div>
                      </div>

                      {/* Barra de progreso de tiempo */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Tiempo</span>
                          <span className={excedido ? "text-red-600 font-semibold" : "text-foreground"}>
                            {formatearTiempo(tiempoActual)} / {formatearTiempo(tarea.tiempoEstimado)}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              excedido ? "bg-red-500" : porcentaje > 75 ? "bg-yellow-500" : "bg-green-500"
                            }`}
                            style={{ width: `${Math.min(porcentaje, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Controles */}
                      <div className="flex gap-2 justify-between items-center">
                        <div className="flex gap-2">
                          {tarea.estado === "pendiente" && (
                            <Button
                              size="sm"
                              variant="default"
                              className="gap-1"
                              onClick={() => iniciarTarea(tarea.id)}
                            >
                              <Play className="w-3 h-3" />
                              Iniciar
                            </Button>
                          )}
                          {tarea.estado === "en-progreso" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                onClick={() => pausarTarea(tarea.id)}
                              >
                                <Pause className="w-3 h-3" />
                                Pausar
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                className="gap-1 bg-green-600 hover:bg-green-700"
                                onClick={() => completarTarea(tarea.id)}
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Completar
                              </Button>
                            </>
                          )}
                          {tarea.estado === "completada" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => resetearTiempo(tarea.id)}
                            >
                              <RotateCcw className="w-3 h-3" />
                              Reiniciar
                            </Button>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => eliminarTarea(tarea.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </GlassCard>
                  </motion.div>
                )
              })
            )}
          </div>

          {/* Modal Nueva Tarea */}
          <Dialog open={modalNueva} onOpenChange={setModalNueva}>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle>Nueva Tarea</DialogTitle>
                <DialogDescription>Crea una nueva tarea con tiempo estimado</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input
                    placeholder="Ej: Llamar a cliente"
                    value={form.titulo}
                    onChange={(e) => setForm(f => ({ ...f, titulo: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea
                    placeholder="Detalles de la tarea..."
                    rows={3}
                    value={form.descripcion}
                    onChange={(e) => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prioridad</Label>
                    <Select value={form.prioridad} onValueChange={(v: any) => setForm(f => ({ ...f, prioridad: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alta">🔴 Alta</SelectItem>
                        <SelectItem value="media">🟡 Media</SelectItem>
                        <SelectItem value="baja">🟢 Baja</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tiempo Estimado (min)</Label>
                    <Input
                      type="number"
                      min="5"
                      step="5"
                      value={form.tiempoEstimado}
                      onChange={(e) => setForm(f => ({ ...f, tiempoEstimado: parseInt(e.target.value) || 30 }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Asignado a</Label>
                  <Input
                    placeholder="Tu nombre o equipo"
                    value={form.asignadoA}
                    onChange={(e) => setForm(f => ({ ...f, asignadoA: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setModalNueva(false)}>
                  Cancelar
                </Button>
                <Button onClick={crearTarea}>
                  Crear Tarea
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </ProtectedRoute>
  )
}
