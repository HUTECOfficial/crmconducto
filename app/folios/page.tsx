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

type TipoFolio = "devoluciones" | "aplicaciones"
type TipoMovimiento = "indiv" | "colectivo"
type TipoOperacion = "cambios" | "altas" | "bajas"

interface Folio {
  id: string
  numeroFolio: string
  tipo: TipoFolio
  movimiento: TipoMovimiento
  operacion: TipoOperacion
  fechaIngreso: string
  compania: string
  comentarios: string
  responsable: string
}

export default function FoliosPage() {
  const { companias } = useSupabase()
  const [folios, setFolios] = useState<Folio[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filtroTipo, setFiltroTipo] = useState<TipoFolio | "todos">("todos")
  const [filtroMovimiento, setFiltroMovimiento] = useState<TipoMovimiento | "todos">("todos")
  const [filtroOperacion, setFiltroOperacion] = useState<TipoOperacion | "todos">("todos")
  const [busqueda, setBusqueda] = useState("")

  const [form, setForm] = useState({
    numeroFolio: "",
    tipo: "devoluciones" as TipoFolio,
    movimiento: "indiv" as TipoMovimiento,
    operacion: "cambios" as TipoOperacion,
    fechaIngreso: new Date().toISOString().split("T")[0],
    compania: "",
    comentarios: "",
    responsable: "",
  })

  const foliosFiltrados = useMemo(() => {
    return folios.filter(folio => {
      const matchTipo = filtroTipo === "todos" || folio.tipo === filtroTipo
      const matchMovimiento = filtroMovimiento === "todos" || folio.movimiento === filtroMovimiento
      const matchOperacion = filtroOperacion === "todos" || folio.operacion === filtroOperacion
      const matchBusqueda = folio.numeroFolio.toLowerCase().includes(busqueda.toLowerCase()) ||
                           folio.compania.toLowerCase().includes(busqueda.toLowerCase())
      return matchTipo && matchMovimiento && matchOperacion && matchBusqueda
    })
  }, [folios, filtroTipo, filtroMovimiento, filtroOperacion, busqueda])

  const handleSubmit = () => {
    if (!form.numeroFolio || !form.compania) {
      toast.error("Número de folio y compañía son obligatorios")
      return
    }

    if (editingId) {
      setFolios(prev => prev.map(f => f.id === editingId ? { ...form, id: editingId } : f))
      toast.success("Folio actualizado")
      setEditingId(null)
    } else {
      setFolios(prev => [...prev, { ...form, id: Date.now().toString() }])
      toast.success("Folio creado")
    }

    resetForm()
    setIsModalOpen(false)
  }

  const resetForm = () => {
    setForm({
      numeroFolio: "",
      tipo: "devoluciones",
      movimiento: "indiv",
      operacion: "cambios",
      fechaIngreso: new Date().toISOString().split("T")[0],
      compania: "",
      comentarios: "",
      responsable: "",
    })
  }

  const handleEdit = (folio: Folio) => {
    setForm(folio)
    setEditingId(folio.id)
    setIsModalOpen(true)
  }

  const handleDelete = (id: string) => {
    setFolios(prev => prev.filter(f => f.id !== id))
    toast.success("Folio eliminado")
  }

  const getTipoLabel = (tipo: TipoFolio) => {
    return tipo === "devoluciones" ? "Devoluciones" : "Aplicaciones"
  }

  const getMovimientoLabel = (mov: TipoMovimiento) => {
    return mov === "indiv" ? "Individual" : "Colectivo"
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
            title="Folios"
            subtitle="Gestión de Cobranza - Devoluciones y Aplicaciones"
            action={
              <Button onClick={() => { resetForm(); setIsModalOpen(true) }} className="gap-2">
                <Plus className="w-4 h-4" />
                Nuevo Folio
              </Button>
            }
          />

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <Label className="text-xs mb-2 block">Tipo</Label>
              <Select value={filtroTipo} onValueChange={(v: any) => setFiltroTipo(v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="devoluciones">Devoluciones</SelectItem>
                  <SelectItem value="aplicaciones">Aplicaciones</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs mb-2 block">Movimiento</Label>
              <Select value={filtroMovimiento} onValueChange={(v: any) => setFiltroMovimiento(v)}>
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

          {/* Lista de Folios */}
          <div className="space-y-3">
            {foliosFiltrados.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No hay folios registrados</p>
              </GlassCard>
            ) : (
              foliosFiltrados.map((folio, index) => (
                <motion.div
                  key={folio.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GlassCard className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-mono font-bold text-lg">{folio.numeroFolio}</h3>
                          <Badge variant="outline" className="text-xs">
                            {getTipoLabel(folio.tipo)}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {getMovimientoLabel(folio.movimiento)}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {getOperacionLabel(folio.operacion)}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                          <div>
                            <span className="text-muted-foreground">Compañía:</span>
                            <p className="font-medium">{folio.compania}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Fecha Ingreso:</span>
                            <p className="font-medium">{new Date(folio.fechaIngreso).toLocaleDateString("es-MX")}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Responsable:</span>
                            <p className="font-medium">{folio.responsable || "-"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Comentarios:</span>
                            <p className="font-medium text-xs line-clamp-1">{folio.comentarios || "-"}</p>
                          </div>
                        </div>

                        {folio.comentarios && (
                          <p className="text-xs text-muted-foreground italic">{folio.comentarios}</p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(folio)}
                          className="gap-1"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(folio.id)}
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
                <DialogTitle>{editingId ? "Editar Folio" : "Nuevo Folio"}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Número de Folio *</Label>
                    <Input
                      value={form.numeroFolio}
                      onChange={(e) => setForm({ ...form, numeroFolio: e.target.value })}
                      placeholder="FOL-2024-001"
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
                    <Label>Tipo</Label>
                    <Select value={form.tipo} onValueChange={(v: any) => setForm({ ...form, tipo: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="devoluciones">Devoluciones</SelectItem>
                        <SelectItem value="aplicaciones">Aplicaciones</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Movimiento</Label>
                    <Select value={form.movimiento} onValueChange={(v: any) => setForm({ ...form, movimiento: v })}>
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
