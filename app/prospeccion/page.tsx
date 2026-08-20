"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { PageHeader } from "@/components/page-header"
import { NeoButton } from "@/components/neo-button"
import { KanbanBoard } from "@/components/kanban-board"
import { ProspectoForm } from "@/components/prospecto-form"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Plus, 
  Users, 
  TrendingUp, 
  FileText, 
  DollarSign,
  BarChart3,
  Target,
  Download,
  Search
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ProtectedRoute } from "@/components/protected-route"
import { motion } from "framer-motion"
import { useSupabase } from "@/contexts/supabase-context"


const ETAPA_LABELS: Record<string, string> = {
  nuevo: "Lead",
  contactado: "Contactado",
  "en-seguimiento": "Cotizando",
  convertido: "Enviado/Emitido",
  perdido: "Perdido",
}

const PRIORIDAD_COLORS: Record<string, string> = {
  alta: "bg-red-500/10 text-red-600 border-red-500/20",
  media: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  baja: "bg-green-500/10 text-green-600 border-green-500/20",
}

export default function ProspeccionPage() {
  const { prospectos } = useSupabase()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("kanban")
  const [busqueda, setBusqueda] = useState("")

  const prospectosTotal = prospectos.length
  const prospectosAlta = prospectos.filter(p => p.prioridad === "alta").length
  const prospectosConvertidos = prospectos.filter(p => p.estatus === "convertido").length
  const tasaConversion = prospectosTotal > 0 ? ((prospectosConvertidos / prospectosTotal) * 100).toFixed(1) : "0"

  const prospectosFiltrados = prospectos.filter(p => {
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return (
      p.nombre.toLowerCase().includes(q) ||
      (p.email || "").toLowerCase().includes(q) ||
      (p.empresa || "").toLowerCase().includes(q) ||
      (p.telefono || "").toLowerCase().includes(q)
    )
  })

  const exportarExcel = () => {
    const headers = ["Nombre", "Email", "Teléfono", "Empresa", "Etapa", "Interés", "Prioridad", "Responsable", "Fecha Contacto", "Comentarios"]
    const rows = prospectos.map(p => [
      p.nombre,
      p.email,
      p.telefono,
      p.empresa || "",
      ETAPA_LABELS[p.estatus] || p.estatus,
      p.interes,
      p.prioridad,
      p.asignadoA || "",
      p.fechaContacto,
      (p.notas || "").replace(/\n/g, " | "),
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `prospectos_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="main-content-aligned">
          <PageHeader
            title="Prospección"
            subtitle="Gestiona tu embudo de ventas y convierte leads en clientes"
            action={
              <NeoButton onClick={() => setIsFormOpen(true)} className="gap-2">
                <Plus className="w-5 h-5" />
                Nuevo Prospecto
              </NeoButton>
            }
          />

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10"><Users className="w-5 h-5 text-blue-600" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Prospectos</p>
                  <p className="text-2xl font-bold">{prospectosTotal}</p>
                </div>
              </div>
            </GlassCard>
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-500/10"><Target className="w-5 h-5 text-red-600" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Prioridad Alta</p>
                  <p className="text-2xl font-bold text-red-600">{prospectosAlta}</p>
                </div>
              </div>
            </GlassCard>
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-green-500/10"><TrendingUp className="w-5 h-5 text-green-600" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Convertidos</p>
                  <p className="text-2xl font-bold text-green-600">{prospectosConvertidos}</p>
                </div>
              </div>
            </GlassCard>
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10"><BarChart3 className="w-5 h-5 text-purple-600" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Tasa Conversión</p>
                  <p className="text-2xl font-bold text-purple-600">{tasaConversion}%</p>
                </div>
              </div>
            </GlassCard>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="kanban" className="gap-2">
                <Target className="w-4 h-4" />
                Embudo Kanban
              </TabsTrigger>
              <TabsTrigger value="tabla" className="gap-2">
                <FileText className="w-4 h-4" />
                Todos los Prospectos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="kanban">
              <KanbanBoard />
            </TabsContent>

            <TabsContent value="tabla">
              <GlassCard className="overflow-hidden">
                <div className="p-4 flex items-center justify-between gap-4 border-b border-border/30">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre, email, empresa..."
                      value={busqueda}
                      onChange={e => setBusqueda(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={exportarExcel} className="gap-2">
                    <Download className="w-4 h-4" />
                    Exportar Excel
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase">
                        <th className="p-3 text-left">Nombre</th>
                        <th className="p-3 text-left">Empresa</th>
                        <th className="p-3 text-left">Teléfono</th>
                        <th className="p-3 text-left">Email</th>
                        <th className="p-3 text-left">Etapa</th>
                        <th className="p-3 text-left">Interés</th>
                        <th className="p-3 text-left">Prioridad</th>
                        <th className="p-3 text-left">Responsable</th>
                        <th className="p-3 text-left">Fecha</th>
                        <th className="p-3 text-left">Comentarios</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prospectosFiltrados.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-8 text-center text-muted-foreground">
                            {busqueda ? "No se encontraron resultados" : "No hay prospectos registrados"}
                          </td>
                        </tr>
                      ) : (
                        prospectosFiltrados.map((p, i) => (
                          <motion.tr
                            key={p.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.02 }}
                            className="border-b border-border/20 hover:bg-muted/30 transition-colors"
                          >
                            <td className="p-3 font-medium">{p.nombre}</td>
                            <td className="p-3 text-muted-foreground">{p.empresa || "-"}</td>
                            <td className="p-3">{p.telefono}</td>
                            <td className="p-3 text-xs text-muted-foreground truncate max-w-[150px]">{p.email}</td>
                            <td className="p-3">
                              <Badge variant="secondary" className="text-xs">
                                {ETAPA_LABELS[p.estatus] || p.estatus}
                              </Badge>
                            </td>
                            <td className="p-3 capitalize">{p.interes}</td>
                            <td className="p-3">
                              <Badge variant="outline" className={`text-xs ${PRIORIDAD_COLORS[p.prioridad]}`}>
                                {p.prioridad}
                              </Badge>
                            </td>
                            <td className="p-3 text-muted-foreground text-xs">{p.asignadoA || "-"}</td>
                            <td className="p-3 text-xs text-muted-foreground">
                              {p.fechaContacto ? new Date(p.fechaContacto).toLocaleDateString("es-MX") : "-"}
                            </td>
                            <td className="p-3 max-w-[200px]">
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {p.notas ? p.notas.split("\n").pop() : "-"}
                              </p>
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="p-3 border-t border-border/20 text-xs text-muted-foreground">
                  {prospectosFiltrados.length} de {prospectosTotal} prospectos
                </div>
              </GlassCard>
            </TabsContent>
          </Tabs>

          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto backdrop-blur-3xl bg-background/40 border-2 border-primary/20 shadow-2xl">
              <DialogHeader className="pb-6 border-b border-border/20">
                <DialogTitle className="font-serif text-3xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Nuevo Prospecto
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-base">
                  Agrega un nuevo prospecto al embudo de ventas
                </DialogDescription>
              </DialogHeader>
              <div className="mt-6">
                <ProspectoForm onClose={() => setIsFormOpen(false)} />
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </ProtectedRoute>
  )
}
