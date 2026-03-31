"use client"

import type React from "react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mail, Phone, Building2, Trash2, Edit2, MessageSquare, X, Check, Calendar, UserCheck, UserX } from "lucide-react"
import { useSupabase, type Prospecto } from "@/contexts/supabase-context"
import { toast } from "sonner"

const etapas = [
  { id: "lead", nombre: "Lead", orden: 1, color: "#94a3b8" },
  { id: "contactado", nombre: "Contactado", orden: 2, color: "#60a5fa" },
  { id: "cotizando", nombre: "Cotizando", orden: 3, color: "#fbbf24" },
  { id: "enviado", nombre: "Enviado", orden: 4, color: "#a78bfa" },
  { id: "aprobado", nombre: "Aprobado", orden: 5, color: "#22c55e" },
  { id: "rechazado", nombre: "Rechazado", orden: 6, color: "#ef4444" },
]

export function KanbanBoard() {
  const { prospectos, actualizarProspecto, eliminarProspecto, agregarEvento, agregarCliente } = useSupabase()
  const [convirtiendo, setConvirtiendo] = useState(false)

  // Modal confirmar conversión a cliente
  const [modalAprobar, setModalAprobar] = useState(false)
  const [prospectoAprobar, setProspectoAprobar] = useState<Prospecto | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [comentarioTemp, setComentarioTemp] = useState("")
  const [confirmarBorrar, setConfirmarBorrar] = useState<string | null>(null)

  // Modal de edición completa
  const [modalEditar, setModalEditar] = useState(false)
  const [prospectoEditar, setProspectoEditar] = useState<Prospecto | null>(null)
  const [formEdit, setFormEdit] = useState({ notas: "", prioridad: "", interes: "", responsable: "" })

  // Modal de asignar evento
  const [modalEvento, setModalEvento] = useState(false)
  const [prospectoEvento, setProspectoEvento] = useState<Prospecto | null>(null)
  const [formEvento, setFormEvento] = useState({ titulo: "", fecha: "", hora: "", descripcion: "", tipo: "cita" as const, prioridad: "media" as const })

  const getEtapaColor = (etapaId: string) => {
    const etapa = etapas.find(e => e.id === etapaId)
    return etapa?.color || '#6366f1'
  }

  const prioridadColors: Record<string, string> = {
    alta: "bg-red-500/10 text-red-500 border-red-500/20",
    media: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    baja: "bg-green-500/10 text-green-500 border-green-500/20",
  }

  const handleDragStart = (id: string) => setDraggedId(id)
  const handleDragOver = (e: React.DragEvent) => e.preventDefault()
  // Mapeo etapa.id → estatus Supabase
  const etapaToEstatus: Record<string, string> = {
    lead: "nuevo",
    contactado: "contactado",
    cotizando: "en-seguimiento",
    enviado: "convertido",
    aprobado: "aprobado",
    rechazado: "rechazado",
  }

  const handleDrop = async (etapaId: string) => {
    if (!draggedId) return
    const prospecto = prospectos.find(p => p.id === draggedId)
    if (!prospecto) { setDraggedId(null); return }

    if (etapaId === "aprobado") {
      // Abrir modal de confirmación para convertir a cliente
      setProspectoAprobar(prospecto)
      setModalAprobar(true)
      setDraggedId(null)
      return
    }

    const nuevoEstatus = etapaToEstatus[etapaId]
    if (nuevoEstatus && prospecto.estatus !== nuevoEstatus) {
      await actualizarProspecto(draggedId, { estatus: nuevoEstatus as any })
    }
    setDraggedId(null)
  }

  const convertirACliente = async () => {
    if (!prospectoAprobar) return
    setConvirtiendo(true)
    try {
      await agregarCliente({
        nombre: prospectoAprobar.nombre,
        email: prospectoAprobar.email || "",
        telefono: prospectoAprobar.telefono,
        empresa: prospectoAprobar.empresa,
        fechaRegistro: new Date().toISOString().split("T")[0],
        estatus: "activo",
        notas: prospectoAprobar.notas
          ? `Convertido desde prospecto.\n${prospectoAprobar.notas}`
          : "Convertido desde prospecto.",
      })
      await eliminarProspecto(prospectoAprobar.id)
      toast.success(`✅ ${prospectoAprobar.nombre} ahora es un cliente activo`)
      setModalAprobar(false)
      setProspectoAprobar(null)
    } catch (err) {
      toast.error("Error al convertir a cliente")
    } finally {
      setConvirtiendo(false)
    }
  }

  const guardarComentario = async (prospecto: Prospecto) => {
    if (!comentarioTemp.trim()) return
    const fecha = new Date().toLocaleDateString('es-MX')
    const notasActuales = prospecto.notas || ""
    const nuevasNotas = notasActuales
      ? `${notasActuales}\n[${fecha}] ${comentarioTemp}`
      : `[${fecha}] ${comentarioTemp}`
    await actualizarProspecto(prospecto.id, { notas: nuevasNotas })
    setEditandoId(null)
    setComentarioTemp("")
  }

  const abrirEdicion = (prospecto: Prospecto) => {
    setProspectoEditar(prospecto)
    setFormEdit({
      notas: prospecto.notas || "",
      prioridad: prospecto.prioridad,
      interes: prospecto.interes,
      responsable: prospecto.asignadoA || "",
    })
    setModalEditar(true)
  }

  const guardarEdicion = async () => {
    if (!prospectoEditar) return
    await actualizarProspecto(prospectoEditar.id, {
      notas: formEdit.notas,
      prioridad: formEdit.prioridad as Prospecto["prioridad"],
      interes: formEdit.interes,
      asignadoA: formEdit.responsable,
    })
    setModalEditar(false)
    setProspectoEditar(null)
  }

  const abrirEvento = (prospecto: Prospecto) => {
    setProspectoEvento(prospecto)
    setFormEvento({ titulo: `Cita con ${prospecto.nombre}`, fecha: "", hora: "", descripcion: "", tipo: "cita", prioridad: "media" })
    setModalEvento(true)
  }

  const guardarEvento = async () => {
    if (!prospectoEvento || !formEvento.fecha || !formEvento.titulo) {
      toast.error("Título y fecha son obligatorios")
      return
    }
    await agregarEvento({
      titulo: formEvento.titulo,
      descripcion: formEvento.descripcion || undefined,
      fecha: formEvento.fecha,
      hora: formEvento.hora || undefined,
      tipo: formEvento.tipo,
      prioridad: formEvento.prioridad,
      completado: false,
    })
    setModalEvento(false)
    setProspectoEvento(null)
    toast.success("Evento creado y visible en el Calendario")
  }

  // Mapear estatus de Supabase a etapas locales
  const getProspectosByEtapa = (etapaId: string) => {
    return prospectos.filter(p => {
      if (etapaId === "lead") return p.estatus === "nuevo"
      if (etapaId === "contactado") return p.estatus === "contactado"
      if (etapaId === "cotizando") return p.estatus === "en-seguimiento"
      if (etapaId === "enviado") return p.estatus === "convertido"
      if (etapaId === "aprobado") return p.estatus === "aprobado"
      if (etapaId === "rechazado") return p.estatus === "rechazado"
      return false
    })
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {etapas.map((etapa) => {
          const prospectosEtapa = getProspectosByEtapa(etapa.id)

          return (
            <div key={etapa.id} className="flex-shrink-0 w-72">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: etapa.color }} />
                  <h3 className="font-bold font-serif text-sm">{etapa.nombre}</h3>
                </div>
                <Badge variant="secondary">{prospectosEtapa.length}</Badge>
              </div>

              <div
                className="space-y-3 min-h-[500px] p-3 rounded-2xl bg-muted/20 transition-colors"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(etapa.id)}
              >
                <AnimatePresence>
                  {prospectosEtapa.map((prospecto, index) => (
                    <motion.div
                      key={prospecto.id}
                      draggable
                      onDragStart={() => handleDragStart(prospecto.id)}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.04 }}
                      className="relative overflow-hidden cursor-move"
                      style={{
                        background: `linear-gradient(135deg, ${getEtapaColor(etapa.id)}08, ${getEtapaColor(etapa.id)}20)`,
                        border: `1px solid ${getEtapaColor(etapa.id)}30`,
                        borderRadius: '14px',
                        backdropFilter: 'blur(12px)',
                        boxShadow: `0 4px 16px ${getEtapaColor(etapa.id)}15`,
                      }}
                    >
                      <div className="p-3">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-2 gap-1">
                          <h4 className="font-semibold text-sm leading-tight flex-1">{prospecto.nombre}</h4>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              className="p-1 rounded hover:bg-white/20 transition-colors"
                              onClick={() => abrirEdicion(prospecto)}
                              title="Editar / comentarios"
                            >
                              <Edit2 className="w-3 h-3 text-muted-foreground" />
                            </button>
                            <button
                              className="p-1 rounded hover:bg-white/20 transition-colors"
                              onClick={() => abrirEvento(prospecto)}
                              title="Asignar actividad"
                            >
                              <Calendar className="w-3 h-3 text-blue-500" />
                            </button>
                            <button
                              className="p-1 rounded hover:bg-red-500/20 transition-colors"
                              onClick={() => setConfirmarBorrar(prospecto.id)}
                              title="Eliminar prospecto"
                            >
                              <Trash2 className="w-3 h-3 text-red-400" />
                            </button>
                          </div>
                        </div>

                        <Badge className={`${prioridadColors[prospecto.prioridad]} text-xs mb-2`} variant="outline">
                          {prospecto.prioridad}
                        </Badge>

                        {/* Datos */}
                        <div className="space-y-1 mb-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{prospecto.email}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3 flex-shrink-0" />
                            <span>{prospecto.telefono}</span>
                          </div>
                          {prospecto.empresa && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Building2 className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{prospecto.empresa}</span>
                            </div>
                          )}
                        </div>

                        {/* Interés */}
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="secondary" className="text-xs">{prospecto.interes}</Badge>
                          {prospecto.asignadoA && (
                            <span className="text-xs text-muted-foreground truncate ml-1">{prospecto.asignadoA}</span>
                          )}
                        </div>

                        {/* Comentario rápido */}
                        {editandoId === prospecto.id ? (
                          <div className="flex items-center gap-1 mt-2">
                            <Textarea
                              value={comentarioTemp}
                              onChange={e => setComentarioTemp(e.target.value)}
                              className="text-xs min-h-[50px] p-2"
                              placeholder="Agregar comentario..."
                            />
                            <div className="flex flex-col gap-1">
                              <button onClick={() => guardarComentario(prospecto)} className="p-1 rounded bg-green-500/20 hover:bg-green-500/40">
                                <Check className="w-3 h-3 text-green-600" />
                              </button>
                              <button onClick={() => setEditandoId(null)} className="p-1 rounded bg-red-500/20 hover:bg-red-500/40">
                                <X className="w-3 h-3 text-red-500" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2">
                            {prospecto.notas && (
                              <div className="bg-muted/40 rounded p-2 mb-2 max-h-[80px] overflow-y-auto">
                                <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                                  {prospecto.notas}
                                </p>
                              </div>
                            )}
                            <button
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                              onClick={() => { setEditandoId(prospecto.id); setComentarioTemp("") }}
                            >
                              <MessageSquare className="w-3 h-3" />
                              {prospecto.notas ? "Agregar comentario" : "Comentar"}
                            </button>
                          </div>
                        )}

                        {/* Botones Aprobar / Rechazar en columna "enviado" */}
                        {etapa.id === "enviado" && (
                          <div className="mt-2 flex gap-1">
                            <button
                              className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-xs font-medium bg-green-500/15 hover:bg-green-500/30 text-green-600 border border-green-500/20 transition-colors"
                              onClick={() => { setProspectoAprobar(prospecto); setModalAprobar(true) }}
                              title="Aprobar → crear cliente"
                            >
                              <UserCheck className="w-3 h-3" />
                              Aprobar
                            </button>
                            <button
                              className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-xs font-medium bg-red-500/15 hover:bg-red-500/30 text-red-500 border border-red-500/20 transition-colors"
                              onClick={() => actualizarProspecto(prospecto.id, { estatus: "rechazado" })}
                              title="Rechazar"
                            >
                              <UserX className="w-3 h-3" />
                              Rechazar
                            </button>
                          </div>
                        )}

                        {/* Confirmar borrar */}
                        {confirmarBorrar === prospecto.id && (
                          <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20">
                            <p className="text-xs text-red-500 mb-2">¿Eliminar este prospecto?</p>
                            <div className="flex gap-2">
                              <Button size="sm" variant="destructive" className="h-6 text-xs flex-1"
                                onClick={async () => { await eliminarProspecto(prospecto.id); setConfirmarBorrar(null) }}>
                                Eliminar
                              </Button>
                              <Button size="sm" variant="outline" className="h-6 text-xs flex-1"
                                onClick={() => setConfirmarBorrar(null)}>
                                No
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal Edición Completa */}
      <Dialog open={modalEditar} onOpenChange={setModalEditar}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Editar Prospecto: {prospectoEditar?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Prioridad</Label>
                <Select value={formEdit.prioridad} onValueChange={v => setFormEdit(f => ({ ...f, prioridad: v }))}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">🔴 Alta</SelectItem>
                    <SelectItem value="media">🟡 Media</SelectItem>
                    <SelectItem value="baja">🟢 Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Interés</Label>
                <Select value={formEdit.interes} onValueChange={v => setFormEdit(f => ({ ...f, interes: v }))}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="autos">Autos</SelectItem>
                    <SelectItem value="vida">Vida</SelectItem>
                    <SelectItem value="gastos-medicos">Gastos Médicos</SelectItem>
                    <SelectItem value="empresa">Empresa</SelectItem>
                    <SelectItem value="hogar">Hogar</SelectItem>
                    <SelectItem value="flotilla">Flotilla</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Responsable</Label>
              <Input value={formEdit.responsable} onChange={e => setFormEdit(f => ({ ...f, responsable: e.target.value }))} className="h-8" />
            </div>
            <div>
              <Label className="text-xs">Comentarios / Notas (historial completo)</Label>
              <Textarea
                value={formEdit.notas}
                onChange={e => setFormEdit(f => ({ ...f, notas: e.target.value }))}
                className="min-h-[120px] text-sm"
                placeholder="Historial de comentarios..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalEditar(false)}>Cancelar</Button>
            <Button onClick={guardarEdicion}>Guardar Cambios</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Aprobar → Nuevo Cliente */}
      <Dialog open={modalAprobar} onOpenChange={(open) => { if (!open && !convirtiendo) { setModalAprobar(false); setProspectoAprobar(null) } }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <UserCheck className="w-5 h-5" />
              Convertir a Cliente
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
              <p className="font-semibold text-sm">{prospectoAprobar?.nombre}</p>
              <p className="text-xs text-muted-foreground">{prospectoAprobar?.email}</p>
              <p className="text-xs text-muted-foreground">{prospectoAprobar?.telefono}</p>
              {prospectoAprobar?.empresa && (
                <p className="text-xs text-muted-foreground">{prospectoAprobar.empresa}</p>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Este prospecto será registrado como <strong>cliente activo</strong> y desaparecerá del embudo de ventas. Sus datos y notas se conservarán.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
              onClick={convertirACliente}
              disabled={convirtiendo}
            >
              <UserCheck className="w-4 h-4" />
              {convirtiendo ? "Creando cliente..." : "Confirmar — Crear Cliente"}
            </Button>
            <Button
              variant="outline"
              onClick={() => { setModalAprobar(false); setProspectoAprobar(null) }}
              disabled={convirtiendo}
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Asignar Evento */}
      <Dialog open={modalEvento} onOpenChange={setModalEvento}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Asignar Actividad a: {prospectoEvento?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Título *</Label>
              <Input value={formEvento.titulo} onChange={e => setFormEvento(f => ({ ...f, titulo: e.target.value }))} className="h-8" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Fecha *</Label>
                <Input type="date" value={formEvento.fecha} onChange={e => setFormEvento(f => ({ ...f, fecha: e.target.value }))} className="h-8" />
              </div>
              <div>
                <Label className="text-xs">Hora</Label>
                <Input type="time" value={formEvento.hora} onChange={e => setFormEvento(f => ({ ...f, hora: e.target.value }))} className="h-8" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={formEvento.tipo} onValueChange={(v: any) => setFormEvento(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cita">Cita</SelectItem>
                    <SelectItem value="recordatorio">Recordatorio</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Prioridad</Label>
                <Select value={formEvento.prioridad} onValueChange={(v: any) => setFormEvento(f => ({ ...f, prioridad: v }))}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">🔴 Alta</SelectItem>
                    <SelectItem value="media">🟡 Media</SelectItem>
                    <SelectItem value="baja">🟢 Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Descripción</Label>
              <Textarea value={formEvento.descripcion} onChange={e => setFormEvento(f => ({ ...f, descripcion: e.target.value }))} className="min-h-[60px] text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalEvento(false)}>Cancelar</Button>
            <Button onClick={guardarEvento}>Crear Actividad</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
