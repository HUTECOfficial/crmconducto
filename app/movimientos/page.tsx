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
import { Plus, Trash2, Edit2, Search } from "lucide-react"
import { ProtectedRoute } from "@/components/protected-route"
import { useSupabase } from "@/contexts/supabase-context"
import { toast } from "sonner"

type TipoMovimiento = "auto" | "gastos-medicos" | "vida" | "danos"
type TipoClasificacion = "indiv" | "colectivo"
type TipoOperacion = "cambios" | "altas" | "bajas"

interface Movimiento {
  id: string
  numeroFolio: string
  tipo: TipoMovimiento
  clasificacion: TipoClasificacion
  operacion: TipoOperacion
  fechaIngreso: string
  compania: string
  comentarios: string
  responsable: string
}

export default function MovimientosPage() {
  const { companias } = useSupabase()
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filtroTipo, setFiltroTipo] = useState<TipoMovimiento | "todos">("todos")
  const [filtroClasificacion, setFiltroClasificacion] = useState<TipoClasificacion | "todos">("todos")
  const [filtroOperacion, setFiltroOperacion] = useState<TipoOperacion | "todos">("todos")
  const [busqueda, setBusqueda] = useState("")

  const [form, setForm] = useState({
    numeroFolio: "",
    tipo: "auto" as TipoMovimiento,
    clasificacion: "indiv" as TipoClasificacion,
    operacion: "cambios" as TipoOperacion,
    fechaIngreso: new Date().toISOString().split("T")[0],
    compania: "",
    comentarios: "",
    responsable: "",
  })

  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter(movimiento => {
      const matchTipo = filtroTipo === "todos" || movimiento.tipo === filtroTipo
      const matchClasificacion = filtroClasificacion === "todos" || movimiento.clasificacion === filtroClasificacion
      const matchOperacion = filtroOperacion === "todos" || movimiento.operacion === filtroOperacion
      const matchBusqueda = movimiento.numeroFolio.toLowerCase().includes(busqueda.toLowerCase()) ||
                           movimiento.compania.toLowerCase().includes(busqueda.toLowerCase())
      return matchTipo && matchClasificacion && matchOperacion && matchBusqueda
    })
  }, [movimientos, filtroTipo, filtroClasificacion, filtroOperacion, busqueda])

  const handleSubmit = () => {
    if (!form.numeroFolio || !form.compania) {
      toast.error("Número de folio y compañía son obligatorios")
      return
    }

    if (editingId) {
      setMovimientos(prev => prev.map(m => m.id === editingId ? { ...form, id: editingId } : m))
      toast.success("Movimiento actualizado")
      setEditingId(null)
    } else {
      setMovimientos(prev => [...prev, { ...form, id: Date.now().toString() }])
      toast.success("Movimiento creado")
    }

    resetForm()
    setIsModalOpen(false)
  }

  const resetForm = () => {
    setForm({
      numeroFolio: "",
      tipo: "auto",
      clasificacion: "indiv",
      operacion: "cambios",
      fechaIngreso: new Date().toISOString().split("T")[0],
      compania: "",
      comentarios: "",
      responsable: "",
    })
  }

  const handleEdit = (movimiento: Movimiento) => {
    setForm(movimiento)
    setEditingId(movimiento.id)
    setIsModalOpen(true)
  }

  const handleDelete = (id: string) => {
    setMovimientos(prev => prev.filter(m => m.id !== id))
    toast.success("Movimiento eliminado")
  }

  const getTipoLabel = (tipo: TipoMovimiento) => {
    const labels = {
      auto: "Auto",
      "gastos-medicos": "Gastos Médicos",
      vida: "Vida",
      danos: "Daños"
    }
    return labels[tipo]
  }

  const getClasificacionLabel = (clasificacion: TipoClasificacion) => {
    return clasificacion === "indiv" ? "Individual" : "Colectivo"
  }

  const getOperacionLabel = (op: TipoOperacion) => {
    const labels = { cambios: "Cambios", altas: "Altas", bajas: "Bajas" }
    return labels[op]
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="main-content-aligned">
          <PageHeader
            title="Movimientos"
            subtitle="Gestión de Movimientos por Ramo"
            action={
              <Button onClick={() => { resetForm(); setIsModalOpen(true) }} className="gap-2">
                <Plus className="w-4 h-4" />
                Nuevo Movimiento
              </Button>
            }
          />

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <Label className="text-xs mb-2 block">Ramo</Label>
              <Select value={filtroTipo} onValueChange={(v: any) => setFiltroTipo(v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="gastos-medicos">Gastos Médicos</SelectItem>
                  <SelectItem value="vida">Vida</SelectItem>
                  <SelectItem value="danos">Daños</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs mb-2 block">Clasificación</Label>
              <Select value={filtroClasificacion} onValueChange={(v: any) => setFiltroClasificacion(v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="indiv">Individual</SelectItem>
                  <SelectItem value="colectivo">Colectivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs mb-2 block">Operación</Label>
              <Select value={filtroOperacion} onValueChange={(v: any) => setFiltroOperacion(v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="cambios">Cambios</SelectItem>
                  <SelectItem value="altas">Altas</SelectItem>
                  <SelectItem value="bajas">Bajas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs mb-2 block">Buscar</Label>
              <Input
                placeholder="Folio o compañía..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          {/* Lista de Movimientos */}
          <div className="space-y-3">
            {movimientosFiltrados.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No hay movimientos registrados</p>
              </GlassCard>
            ) : (
              movimientosFiltrados.map((movimiento, index) => (
                <motion.div
                  key={movimiento.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GlassCard className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-mono font-bold text-lg">{movimiento.numeroFolio}</h3>
                          <Badge variant="outline" className="text-xs">
                            {getTipoLabel(movimiento.tipo)}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {getClasificacionLabel(movimiento.clasificacion)}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {getOperacionLabel(movimiento.operacion)}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                          <div>
                            <span className="text-muted-foreground">Compañía:</span>
                            <p className="font-medium">{movimiento.compania}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Fecha Ingreso:</span>
                            <p className="font-medium">{new Date(movimiento.fechaIngreso).toLocaleDateString("es-MX")}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Responsable:</span>
                            <p className="font-medium">{movimiento.responsable || "-"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Comentarios:</span>
                            <p className="font-medium text-xs line-clamp-1">{movimiento.comentarios || "-"}</p>
                          </div>
                        </div>

                        {movimiento.comentarios && (
                          <p className="text-xs text-muted-foreground italic">{movimiento.comentarios}</p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(movimiento)}
                          className="gap-1"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(movimiento.id)}
                          className="gap-1 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))
            )}
          </div>

          {/* Modal */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Movimiento" : "Nuevo Movimiento"}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Número de Folio *</Label>
                    <Input
                      value={form.numeroFolio}
                      onChange={(e) => setForm({ ...form, numeroFolio: e.target.value })}
                      placeholder="MOV-2024-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Compañía *</Label>
                    <Select value={form.compania} onValueChange={(v) => setForm({ ...form, compania: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {companias.map(c => (
                          <SelectItem key={c.id} value={c.nombre}>
                            {c.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Ramo</Label>
                    <Select value={form.tipo} onValueChange={(v: any) => setForm({ ...form, tipo: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="gastos-medicos">Gastos Médicos</SelectItem>
                        <SelectItem value="vida">Vida</SelectItem>
                        <SelectItem value="danos">Daños</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Clasificación</Label>
                    <Select value={form.clasificacion} onValueChange={(v: any) => setForm({ ...form, clasificacion: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="indiv">Individual</SelectItem>
                        <SelectItem value="colectivo">Colectivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Operación</Label>
                    <Select value={form.operacion} onValueChange={(v: any) => setForm({ ...form, operacion: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cambios">Cambios</SelectItem>
                        <SelectItem value="altas">Altas</SelectItem>
                        <SelectItem value="bajas">Bajas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha de Ingreso</Label>
                    <Input
                      type="date"
                      value={form.fechaIngreso}
                      onChange={(e) => setForm({ ...form, fechaIngreso: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Responsable</Label>
                    <Input
                      value={form.responsable}
                      onChange={(e) => setForm({ ...form, responsable: e.target.value })}
                      placeholder="Nombre del responsable"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Comentarios</Label>
                  <Textarea
                    value={form.comentarios}
                    onChange={(e) => setForm({ ...form, comentarios: e.target.value })}
                    placeholder="Notas adicionales..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit}>
                  {editingId ? "Actualizar" : "Crear"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </ProtectedRoute>
  )
}
