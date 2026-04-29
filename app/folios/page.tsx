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
import { Plus, Trash2, Edit2, Search, Loader2 } from "lucide-react"
import { ProtectedRoute } from "@/components/protected-route"
import { useSupabase } from "@/contexts/supabase-context"
import type { FolioRegistro } from "@/contexts/supabase-context"

const CATEGORIAS_FOLIOS: Record<string, string[]> = {
  "Cobranza": ["Devoluciones", "Aplicaciones", "Conciliaciones", "Cartera Vencida"],
  "Movimientos": ["Altas", "Bajas", "Cambios de Datos", "Endosos", "Rehabilitaciones"],
  "Emisión": ["Nuevas Emisiones", "Renovaciones", "Reexpediciones"],
  "Cancelaciones": ["Por Falta de Pago", "Por Solicitud del Cliente", "Por Vencimiento", "Anulaciones"],
  "Trámites": ["Consultas", "Aclaraciones", "Trámites Especiales", "Reclamaciones"],
  "Siniestros": ["Reportes", "Liquidaciones", "Seguimiento"],
}

type TipoMovimiento = "indiv" | "colectivo"

export default function FoliosPage() {
  const { companias, foliosRegistro, loadingFolios, agregarFolio, actualizarFolio, eliminarFolio } = useSupabase()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas")
  const [filtroMovimiento, setFiltroMovimiento] = useState<TipoMovimiento | "todos">("todos")
  const [busqueda, setBusqueda] = useState("")
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    numeroFolio: "",
    categoria: "",
    subcategoria: "",
    movimiento: "indiv" as TipoMovimiento,
    fechaIngreso: new Date().toISOString().split("T")[0],
    compania: "",
    comentarios: "",
    responsable: "",
  })

  const subcategoriasDisponibles = form.categoria ? (CATEGORIAS_FOLIOS[form.categoria] || []) : []

  const foliosFiltrados = useMemo(() => {
    return foliosRegistro.filter(folio => {
      const matchCat = filtroCategoria === "todas" || folio.categoria === filtroCategoria
      const matchMov = filtroMovimiento === "todos" || folio.movimiento === filtroMovimiento
      const matchBusqueda =
        folio.numeroFolio.toLowerCase().includes(busqueda.toLowerCase()) ||
        folio.compania.toLowerCase().includes(busqueda.toLowerCase()) ||
        folio.categoria.toLowerCase().includes(busqueda.toLowerCase()) ||
        folio.subcategoria.toLowerCase().includes(busqueda.toLowerCase())
      return matchCat && matchMov && matchBusqueda
    })
  }, [foliosRegistro, filtroCategoria, filtroMovimiento, busqueda])

  const handleSubmit = async () => {
    if (!form.numeroFolio || !form.compania || !form.categoria || !form.subcategoria) {
      alert("Número de folio, compañía, categoría y subcategoría son obligatorios")
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await actualizarFolio(editingId, form)
        setEditingId(null)
      } else {
        await agregarFolio(form)
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
      categoria: "",
      subcategoria: "",
      movimiento: "indiv",
      fechaIngreso: new Date().toISOString().split("T")[0],
      compania: "",
      comentarios: "",
      responsable: "",
    })
  }

  const handleEdit = (folio: FolioRegistro) => {
    setForm({
      numeroFolio: folio.numeroFolio,
      categoria: folio.categoria,
      subcategoria: folio.subcategoria,
      movimiento: folio.movimiento,
      fechaIngreso: folio.fechaIngreso,
      compania: folio.compania,
      comentarios: folio.comentarios || "",
      responsable: folio.responsable || "",
    })
    setEditingId(folio.id)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    await eliminarFolio(id)
  }

  const getCategoriaColor = (categoria: string) => {
    const colors: Record<string, string> = {
      "Cobranza": "bg-blue-500/10 text-blue-600 border-blue-500/20",
      "Movimientos": "bg-green-500/10 text-green-600 border-green-500/20",
      "Emisión": "bg-purple-500/10 text-purple-600 border-purple-500/20",
      "Cancelaciones": "bg-red-500/10 text-red-600 border-red-500/20",
      "Trámites": "bg-orange-500/10 text-orange-600 border-orange-500/20",
      "Siniestros": "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
    }
    return colors[categoria] || "bg-gray-500/10 text-gray-600 border-gray-500/20"
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="main-content-aligned">
          <PageHeader
            title="Folios"
            subtitle="Gestión y Registro de Folios"
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
              <Label className="text-xs mb-2 block">Categoría</Label>
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {Object.keys(CATEGORIAS_FOLIOS).map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
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
            <div className="md:col-span-2">
              <Label className="text-xs mb-2 block">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Folio, compañía, categoría..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="h-9 pl-9"
                />
              </div>
            </div>
          </div>

          {/* Resumen por categoría */}
          {!loadingFolios && foliosRegistro.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              {Object.keys(CATEGORIAS_FOLIOS).map(cat => {
                const count = foliosRegistro.filter(f => f.categoria === cat).length
                if (count === 0) return null
                return (
                  <button
                    key={cat}
                    onClick={() => setFiltroCategoria(filtroCategoria === cat ? "todas" : cat)}
                    className={`p-3 rounded-lg border text-left transition-all hover:scale-105 ${getCategoriaColor(cat)} ${filtroCategoria === cat ? "ring-2 ring-offset-1 ring-primary" : ""}`}
                  >
                    <p className="text-xs font-medium">{cat}</p>
                    <p className="text-xl font-bold">{count}</p>
                  </button>
                )
              })}
            </div>
          )}

          {/* Lista */}
          <div className="space-y-3">
            {loadingFolios ? (
              <GlassCard className="p-12 text-center">
                <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin opacity-50" />
                <p className="text-muted-foreground text-sm">Cargando folios...</p>
              </GlassCard>
            ) : foliosFiltrados.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-muted-foreground">No hay folios registrados</p>
                <Button variant="outline" className="mt-4" onClick={() => { resetForm(); setIsModalOpen(true) }}>
                  <Plus className="w-4 h-4 mr-2" /> Crear primer folio
                </Button>
              </GlassCard>
            ) : (
              foliosFiltrados.map((folio, index) => (
                <motion.div
                  key={folio.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <GlassCard className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center flex-wrap gap-2 mb-2">
                          <h3 className="font-mono font-bold text-lg">{folio.numeroFolio}</h3>
                          <Badge className={`text-xs border ${getCategoriaColor(folio.categoria)}`} variant="outline">
                            {folio.categoria}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">{folio.subcategoria}</Badge>
                          <Badge variant="outline" className="text-xs">
                            {folio.movimiento === "indiv" ? "Individual" : "Colectivo"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground text-xs">Compañía</span>
                            <p className="font-medium">{folio.compania}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Fecha Ingreso</span>
                            <p className="font-medium">{new Date(folio.fechaIngreso).toLocaleDateString("es-MX")}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Responsable</span>
                            <p className="font-medium">{folio.responsable || "—"}</p>
                          </div>
                          {folio.comentarios && (
                            <div>
                              <span className="text-muted-foreground text-xs">Comentarios</span>
                              <p className="font-medium text-xs line-clamp-1">{folio.comentarios}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(folio)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(folio.id)} className="text-destructive hover:text-destructive">
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
          <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) { resetForm(); setEditingId(null) } }}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Folio" : "Nuevo Folio"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Número de Folio *</Label>
                    <Input value={form.numeroFolio} onChange={(e) => setForm({ ...form, numeroFolio: e.target.value })} placeholder="FOL-2024-001" />
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
                    <Label>Categoría *</Label>
                    <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v, subcategoria: "" })}>
                      <SelectTrigger><SelectValue placeholder="Selecciona categoría" /></SelectTrigger>
                      <SelectContent>
                        {Object.keys(CATEGORIAS_FOLIOS).map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Subcategoría *</Label>
                    <Select value={form.subcategoria} onValueChange={(v) => setForm({ ...form, subcategoria: v })} disabled={!form.categoria}>
                      <SelectTrigger>
                        <SelectValue placeholder={form.categoria ? "Selecciona subcategoría" : "Primero elige categoría"} />
                      </SelectTrigger>
                      <SelectContent>
                        {subcategoriasDisponibles.map(sub => (
                          <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                  <div className="space-y-2">
                    <Label>Fecha de Ingreso</Label>
                    <Input type="date" value={form.fechaIngreso} onChange={(e) => setForm({ ...form, fechaIngreso: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Responsable</Label>
                  <Input value={form.responsable} onChange={(e) => setForm({ ...form, responsable: e.target.value })} placeholder="Nombre del responsable" />
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
