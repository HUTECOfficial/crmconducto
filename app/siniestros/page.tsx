"use client"

import { useState, useMemo } from "react"
import { Sidebar } from "@/components/sidebar"
import { PageHeader } from "@/components/page-header"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { motion } from "framer-motion"
import { Plus, Trash2, Edit2, Search, Loader2, CheckCircle2, Clock } from "lucide-react"
import { ProtectedRoute } from "@/components/protected-route"
import { useSupabase } from "@/contexts/supabase-context"
import type { SiniestroRegistro } from "@/contexts/supabase-context"

type TipoSiniestro = "membresia" | "programacion" | "autos" | "vida"
type TipoMovimiento = "indiv" | "colectivo"

export default function SiniestrosPage() {
  const { companias, siniestrosRegistro, loadingSiniestros, agregarSiniestro, actualizarSiniestro, eliminarSiniestro, darVistoBueno } = useSupabase()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filtroTipo, setFiltroTipo] = useState<TipoSiniestro | "todos">("todos")
  const [filtroMovimiento, setFiltroMovimiento] = useState<TipoMovimiento | "todos">("todos")
  const [filtroVistoBueno, setFiltroVistoBueno] = useState<"todos" | "pendiente" | "aprobado">("todos")
  const [busqueda, setBusqueda] = useState("")
  const [saving, setSaving] = useState(false)
  const [dandoVB, setDandoVB] = useState<string | null>(null)

  const [form, setForm] = useState({
    numeroFolio: "",
    tipo: "membresia" as TipoSiniestro,
    movimiento: "indiv" as TipoMovimiento,
    fechaIngreso: new Date().toISOString().split("T")[0],
    compania: "",
    comentarios: "",
    responsable: "",
    vistoBueno: false,
    fechaVistoBueno: "",
  })

  const siniestrosFiltrados = useMemo(() => {
    return siniestrosRegistro.filter(s => {
      const matchTipo = filtroTipo === "todos" || s.tipo === filtroTipo
      const matchMov = filtroMovimiento === "todos" || s.movimiento === filtroMovimiento
      const matchVB =
        filtroVistoBueno === "todos" ||
        (filtroVistoBueno === "aprobado" && s.vistoBueno) ||
        (filtroVistoBueno === "pendiente" && !s.vistoBueno)
      const matchBusqueda =
        s.numeroFolio.toLowerCase().includes(busqueda.toLowerCase()) ||
        s.compania.toLowerCase().includes(busqueda.toLowerCase())
      return matchTipo && matchMov && matchVB && matchBusqueda
    })
  }, [siniestrosRegistro, filtroTipo, filtroMovimiento, filtroVistoBueno, busqueda])

  const handleSubmit = async () => {
    if (!form.numeroFolio || !form.compania) {
      alert("Número de folio y compañía son obligatorios")
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await actualizarSiniestro(editingId, {
          numeroFolio: form.numeroFolio,
          tipo: form.tipo,
          movimiento: form.movimiento,
          fechaIngreso: form.fechaIngreso,
          compania: form.compania,
          comentarios: form.comentarios || undefined,
          responsable: form.responsable || undefined,
        })
        setEditingId(null)
      } else {
        await agregarSiniestro({
          numeroFolio: form.numeroFolio,
          tipo: form.tipo,
          movimiento: form.movimiento,
          fechaIngreso: form.fechaIngreso,
          compania: form.compania,
          comentarios: form.comentarios || undefined,
          responsable: form.responsable || undefined,
          vistoBueno: false,
        })
      }
      resetForm()
      setIsModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setForm({
      numeroFolio: "",
      tipo: "membresia",
      movimiento: "indiv",
      fechaIngreso: new Date().toISOString().split("T")[0],
      compania: "",
      comentarios: "",
      responsable: "",
      vistoBueno: false,
      fechaVistoBueno: "",
    })
  }

  const handleEdit = (s: SiniestroRegistro) => {
    setForm({
      numeroFolio: s.numeroFolio,
      tipo: s.tipo,
      movimiento: s.movimiento,
      fechaIngreso: s.fechaIngreso,
      compania: s.compania,
      comentarios: s.comentarios || "",
      responsable: s.responsable || "",
      vistoBueno: s.vistoBueno,
      fechaVistoBueno: s.fechaVistoBueno || "",
    })
    setEditingId(s.id)
    setIsModalOpen(true)
  }

  const handleVistoBueno = async (id: string) => {
    setDandoVB(id)
    try {
      await darVistoBueno(id)
    } finally {
      setDandoVB(null)
    }
  }

  const getTipoLabel = (tipo: TipoSiniestro) => {
    const labels = {
      membresia: "Membresía",
      programacion: "Programación",
      autos: "Siniestros Autos",
      vida: "Siniestros Vida",
    }
    return labels[tipo]
  }

  const pendientes = siniestrosRegistro.filter(s => !s.vistoBueno).length
  const aprobados = siniestrosRegistro.filter(s => s.vistoBueno).length

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="main-content-aligned">
          <PageHeader
            title="Siniestros"
            subtitle="Gestión de Membresía, Programación y Siniestros"
            action={
              <Button onClick={() => { resetForm(); setIsModalOpen(true) }} className="gap-2">
                <Plus className="w-4 h-4" />
                Nuevo Siniestro
              </Button>
            }
          />

          {/* Resumen */}
          {siniestrosRegistro.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <button
                onClick={() => setFiltroVistoBueno("todos")}
                className={`p-4 rounded-lg border text-left transition-all bg-muted/30 hover:bg-muted/50 ${filtroVistoBueno === "todos" ? "ring-2 ring-primary" : ""}`}
              >
                <p className="text-xs text-muted-foreground mb-1">Total</p>
                <p className="text-2xl font-bold">{siniestrosRegistro.length}</p>
              </button>
              <button
                onClick={() => setFiltroVistoBueno("pendiente")}
                className={`p-4 rounded-lg border text-left transition-all bg-yellow-500/5 border-yellow-500/20 hover:bg-yellow-500/10 ${filtroVistoBueno === "pendiente" ? "ring-2 ring-yellow-500" : ""}`}
              >
                <p className="text-xs text-yellow-600 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" />Pendientes VB</p>
                <p className="text-2xl font-bold text-yellow-600">{pendientes}</p>
              </button>
              <button
                onClick={() => setFiltroVistoBueno("aprobado")}
                className={`p-4 rounded-lg border text-left transition-all bg-green-500/5 border-green-500/20 hover:bg-green-500/10 ${filtroVistoBueno === "aprobado" ? "ring-2 ring-green-500" : ""}`}
              >
                <p className="text-xs text-green-600 mb-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Visto Bueno</p>
                <p className="text-2xl font-bold text-green-600">{aprobados}</p>
              </button>
            </div>
          )}

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <Label className="text-xs mb-2 block">Tipo</Label>
              <Select value={filtroTipo} onValueChange={(v: any) => setFiltroTipo(v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="membresia">Membresía</SelectItem>
                  <SelectItem value="programacion">Programación</SelectItem>
                  <SelectItem value="autos">Siniestros Autos</SelectItem>
                  <SelectItem value="vida">Siniestros Vida</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-2 block">Movimiento</Label>
              <Select value={filtroMovimiento} onValueChange={(v: any) => setFiltroMovimiento(v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="indiv">Individual</SelectItem>
                  <SelectItem value="colectivo">Colectivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-2 block">Estatus VB</Label>
              <Select value={filtroVistoBueno} onValueChange={(v: any) => setFiltroVistoBueno(v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendiente">Pendiente VB</SelectItem>
                  <SelectItem value="aprobado">Con Visto Bueno</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-2 block">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Folio o compañía..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="h-9 pl-9"
                />
              </div>
            </div>
          </div>

          {/* Lista */}
          <div className="space-y-3">
            {loadingSiniestros ? (
              <GlassCard className="p-12 text-center">
                <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin opacity-50" />
                <p className="text-muted-foreground text-sm">Cargando siniestros...</p>
              </GlassCard>
            ) : siniestrosFiltrados.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-muted-foreground">No hay siniestros registrados</p>
                <Button variant="outline" className="mt-4" onClick={() => { resetForm(); setIsModalOpen(true) }}>
                  <Plus className="w-4 h-4 mr-2" /> Registrar siniestro
                </Button>
              </GlassCard>
            ) : (
              siniestrosFiltrados.map((siniestro, index) => (
                <motion.div
                  key={siniestro.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <GlassCard className={`p-4 ${siniestro.vistoBueno ? "border-green-500/30" : ""}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center flex-wrap gap-2 mb-2">
                          <h3 className="font-mono font-bold text-lg">{siniestro.numeroFolio}</h3>
                          <Badge variant="outline" className="text-xs">{getTipoLabel(siniestro.tipo)}</Badge>
                          <Badge variant="secondary" className="text-xs">
                            {siniestro.movimiento === "indiv" ? "Individual" : "Colectivo"}
                          </Badge>
                          {siniestro.vistoBueno ? (
                            <Badge className="text-xs bg-green-500/10 text-green-600 border-green-500/30 border gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Visto Bueno
                              {siniestro.fechaVistoBueno && (
                                <span className="opacity-70">
                                  · {new Date(siniestro.fechaVistoBueno).toLocaleDateString("es-MX")}
                                </span>
                              )}
                            </Badge>
                          ) : (
                            <Badge className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/30 border gap-1">
                              <Clock className="w-3 h-3" /> Pendiente VB
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground text-xs">Compañía</span>
                            <p className="font-medium">{siniestro.compania}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Fecha Ingreso</span>
                            <p className="font-medium">{new Date(siniestro.fechaIngreso).toLocaleDateString("es-MX")}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Responsable</span>
                            <p className="font-medium">{siniestro.responsable || "—"}</p>
                          </div>
                          {siniestro.comentarios && (
                            <div>
                              <span className="text-muted-foreground text-xs">Comentarios</span>
                              <p className="font-medium text-xs line-clamp-1">{siniestro.comentarios}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        {!siniestro.vistoBueno && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs text-green-600 border-green-500/40 hover:bg-green-500/10 gap-1"
                            disabled={dandoVB === siniestro.id}
                            onClick={() => handleVistoBueno(siniestro.id)}
                          >
                            {dandoVB === siniestro.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <CheckCircle2 className="w-3 h-3" />
                            }
                            Visto Bueno
                          </Button>
                        )}
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(siniestro)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => eliminarSiniestro(siniestro.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))
            )}
          </div>

          {/* Modal */}
          <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) { resetForm(); setEditingId(null) } }}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Siniestro" : "Nuevo Siniestro"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Número de Folio *</Label>
                    <Input value={form.numeroFolio} onChange={(e) => setForm({ ...form, numeroFolio: e.target.value })} placeholder="SIN-2024-001" />
                  </div>
                  <div className="space-y-2">
                    <Label>Compañía *</Label>
                    <Select value={form.compania} onValueChange={(v) => setForm({ ...form, compania: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                      <SelectContent>
                        {companias.map(c => (
                          <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={form.tipo} onValueChange={(v: any) => setForm({ ...form, tipo: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="membresia">Membresía</SelectItem>
                        <SelectItem value="programacion">Programación</SelectItem>
                        <SelectItem value="autos">Siniestros Autos</SelectItem>
                        <SelectItem value="vida">Siniestros Vida</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Movimiento</Label>
                    <Select value={form.movimiento} onValueChange={(v: any) => setForm({ ...form, movimiento: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="indiv">Individual</SelectItem>
                        <SelectItem value="colectivo">Colectivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha de Ingreso</Label>
                    <Input type="date" value={form.fechaIngreso} onChange={(e) => setForm({ ...form, fechaIngreso: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Responsable</Label>
                    <Input value={form.responsable} onChange={(e) => setForm({ ...form, responsable: e.target.value })} placeholder="Nombre del responsable" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Comentarios</Label>
                  <Textarea value={form.comentarios} onChange={(e) => setForm({ ...form, comentarios: e.target.value })} placeholder="Notas adicionales..." rows={3} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setIsModalOpen(false); resetForm(); setEditingId(null) }}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? "Actualizar" : "Registrar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </ProtectedRoute>
  )
}
