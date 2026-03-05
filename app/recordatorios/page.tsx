"use client"

import { useState, useMemo } from "react"
import { Sidebar } from "@/components/sidebar"
import { PageHeader } from "@/components/page-header"
import { GlassCard } from "@/components/glass-card"
import { NeoButton } from "@/components/neo-button"
import { useSupabase } from "@/contexts/supabase-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Plus, MessageSquare, User, Calendar, Clock, AlertCircle, RefreshCw, CheckCircle2, FileText, ChevronDown, ChevronUp } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { ProtectedRoute } from "@/components/protected-route"

interface RecordatorioAuto {
  id: string
  titulo: string
  descripcion: string
  fechaRecordatorio: string
  diasRestantes: number
  urgencia: "alta" | "media" | "baja"
  clienteNombre: string
  clienteTelefono: string
  numeroPoliza: string
  prima: number
  polizaId: string
  tipo: "renovacion" | "pago" | "vencimiento"
}

export default function RecordatoriosPage() {
  const { polizas, clientes, companias } = useSupabase()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [filtro, setFiltro] = useState<"todos" | "alta" | "media" | "baja">("todos")
  const [expandido, setExpandido] = useState<string | null>(null)

  // Auto-generar recordatorios desde pólizas con fecha límite de pago o próximas a vencer
  const recordatoriosAuto = useMemo((): RecordatorioAuto[] => {
    const hoy = new Date()
    const items: RecordatorioAuto[] = []

    polizas.forEach(poliza => {
      const cliente = clientes.find(c => c.id === poliza.clienteId)
      const compania = companias.find(c => c.id === poliza.companiaId)
      if (!cliente) return

      // Recordatorio por fecha límite de pago
      if (poliza.ultimoDiaPago) {
        const fechaPago = new Date(poliza.ultimoDiaPago)
        const dias = Math.ceil((fechaPago.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
        if (dias >= -3 && dias <= 15) {
          const urgencia: "alta" | "media" | "baja" = dias <= 0 ? "alta" : dias <= 5 ? "media" : "baja"
          items.push({
            id: `pago-${poliza.id}`,
            titulo: `Pago pendiente: ${poliza.numeroPoliza}`,
            descripcion: `${compania?.nombre || "—"} — $${poliza.prima.toLocaleString()} ${poliza.formaPago}`,
            fechaRecordatorio: poliza.ultimoDiaPago,
            diasRestantes: dias,
            urgencia,
            clienteNombre: poliza.nombreAsegurado || cliente.nombre,
            clienteTelefono: cliente.telefono,
            numeroPoliza: poliza.numeroPoliza,
            prima: poliza.prima,
            polizaId: poliza.id,
            tipo: "pago",
          })
        }
      }

      // Recordatorio por renovación próxima (60 días)
      const vigenciaFin = new Date(poliza.vigenciaFin)
      const diasVig = Math.ceil((vigenciaFin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
      if (diasVig >= 0 && diasVig <= 60 && (poliza.estatus === "activa" || poliza.estatus === "por-renovar")) {
        const urgencia: "alta" | "media" | "baja" = diasVig <= 7 ? "alta" : diasVig <= 30 ? "media" : "baja"
        items.push({
          id: `ren-${poliza.id}`,
          titulo: `Renovación próxima: ${poliza.numeroPoliza}`,
          descripcion: `${compania?.nombre || "—"} — Vence ${new Date(poliza.vigenciaFin).toLocaleDateString("es-MX")}`,
          fechaRecordatorio: poliza.vigenciaFin,
          diasRestantes: diasVig,
          urgencia,
          clienteNombre: poliza.nombreAsegurado || cliente.nombre,
          clienteTelefono: cliente.telefono,
          numeroPoliza: poliza.numeroPoliza,
          prima: poliza.prima,
          polizaId: poliza.id,
          tipo: "renovacion",
        })
      }

      // Pólizas en período de gracia
      if (poliza.estatus === "gracia") {
        items.push({
          id: `gracia-${poliza.id}`,
          titulo: `En gracia: ${poliza.numeroPoliza}`,
          descripcion: `${compania?.nombre || "—"} — Período de gracia activo`,
          fechaRecordatorio: poliza.vigenciaFin,
          diasRestantes: 0,
          urgencia: "alta",
          clienteNombre: poliza.nombreAsegurado || cliente.nombre,
          clienteTelefono: cliente.telefono,
          numeroPoliza: poliza.numeroPoliza,
          prima: poliza.prima,
          polizaId: poliza.id,
          tipo: "vencimiento",
        })
      }
    })

    return items.sort((a, b) => {
      const orden = { alta: 0, media: 1, baja: 2 }
      if (orden[a.urgencia] !== orden[b.urgencia]) return orden[a.urgencia] - orden[b.urgencia]
      return a.diasRestantes - b.diasRestantes
    })
  }, [polizas, clientes, companias])

  const recordatoriosFiltrados = filtro === "todos"
    ? recordatoriosAuto
    : recordatoriosAuto.filter(r => r.urgencia === filtro)

  const urgenciaConfig = {
    alta: { color: "bg-red-500/10 text-red-600 border-red-500/20", dot: "bg-red-500", icon: AlertCircle, label: "Urgente" },
    media: { color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", dot: "bg-yellow-500", icon: Clock, label: "Próximo" },
    baja: { color: "bg-green-500/10 text-green-600 border-green-500/20", dot: "bg-green-500", icon: CheckCircle2, label: "Normal" },
  }

  const tipoConfig = {
    pago: { icon: Clock, label: "Pago" },
    renovacion: { icon: RefreshCw, label: "Renovación" },
    vencimiento: { icon: AlertCircle, label: "Gracia" },
  }

  const abrirWhatsApp = (telefono: string, nombre: string, rec: RecordatorioAuto) => {
    const msg = rec.tipo === "pago"
      ? `Hola ${nombre}, te recordamos que tienes un pago pendiente de la póliza ${rec.numeroPoliza} por $${rec.prima.toLocaleString()}. Por favor comunícate con nosotros para coordinar el pago.`
      : `Hola ${nombre}, tu póliza ${rec.numeroPoliza} ${rec.diasRestantes <= 0 ? "venció" : `vence en ${rec.diasRestantes} días`}. Contáctanos para renovarla y mantener tu cobertura activa.`
    window.open(`https://wa.me/${telefono.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank")
  }

  const conteoAlta = recordatoriosAuto.filter(r => r.urgencia === "alta").length
  const conteoMedia = recordatoriosAuto.filter(r => r.urgencia === "media").length
  const conteoBaja = recordatoriosAuto.filter(r => r.urgencia === "baja").length

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="main-content-aligned">
          <PageHeader
            title="Recordatorios"
            subtitle="Alertas automáticas generadas desde tus pólizas"
            action={
              <NeoButton onClick={() => setIsFormOpen(true)} className="gap-2">
                <Plus className="w-5 h-5" />
                Recordatorio Manual
              </NeoButton>
            }
          />

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <GlassCard className="p-4 cursor-pointer" onClick={() => setFiltro(filtro === "alta" ? "todos" : "alta")}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-500/10"><AlertCircle className="w-5 h-5 text-red-600" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Urgentes</p>
                  <p className="text-2xl font-bold text-red-600">{conteoAlta}</p>
                </div>
              </div>
            </GlassCard>
            <GlassCard className="p-4 cursor-pointer" onClick={() => setFiltro(filtro === "media" ? "todos" : "media")}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-yellow-500/10"><Clock className="w-5 h-5 text-yellow-600" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Próximos</p>
                  <p className="text-2xl font-bold text-yellow-600">{conteoMedia}</p>
                </div>
              </div>
            </GlassCard>
            <GlassCard className="p-4 cursor-pointer" onClick={() => setFiltro(filtro === "baja" ? "todos" : "baja")}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-green-500/10"><CheckCircle2 className="w-5 h-5 text-green-600" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Normales</p>
                  <p className="text-2xl font-bold text-green-600">{conteoBaja}</p>
                </div>
              </div>
            </GlassCard>
          </div>

          {filtro !== "todos" && (
            <div className="mb-4 flex items-center gap-2">
              <Badge variant="secondary">Filtrando: {filtro}</Badge>
              <Button variant="ghost" size="sm" onClick={() => setFiltro("todos")} className="h-6 text-xs">✕ Limpiar</Button>
            </div>
          )}

          {/* Lista de recordatorios auto-generados */}
          <div className="space-y-3">
            {recordatoriosFiltrados.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500 opacity-50" />
                <p className="text-muted-foreground">No hay recordatorios pendientes</p>
                <p className="text-xs text-muted-foreground mt-1">Las alertas se generan automáticamente desde tus pólizas</p>
              </GlassCard>
            ) : (
              recordatoriosFiltrados.map((rec, index) => {
                const cfg = urgenciaConfig[rec.urgencia]
                const tipoCfg = tipoConfig[rec.tipo]
                const TipoIcon = tipoCfg.icon
                const isExpanded = expandido === rec.id

                return (
                  <motion.div key={rec.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
                    <GlassCard className={`overflow-hidden border-l-4 ${rec.urgencia === "alta" ? "border-red-500" : rec.urgencia === "media" ? "border-yellow-500" : "border-green-500"}`}>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`p-2 rounded-lg mt-0.5 shrink-0 ${rec.urgencia === "alta" ? "bg-red-500/10" : rec.urgencia === "media" ? "bg-yellow-500/10" : "bg-green-500/10"}`}>
                              <TipoIcon className={`w-4 h-4 ${rec.urgencia === "alta" ? "text-red-600" : rec.urgencia === "media" ? "text-yellow-600" : "text-green-600"}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <p className="font-semibold text-sm">{rec.titulo}</p>
                                <Badge variant="outline" className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                                <Badge variant="outline" className="text-xs">{tipoCfg.label}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{rec.descripcion}</p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><User className="w-3 h-3" />{rec.clienteNombre}</span>
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(rec.fechaRecordatorio).toLocaleDateString("es-MX")}</span>
                                <span className={`font-semibold ${rec.diasRestantes <= 0 ? "text-red-600" : rec.diasRestantes <= 7 ? "text-yellow-600" : "text-green-600"}`}>
                                  {rec.diasRestantes <= 0 ? `Vencido hace ${Math.abs(rec.diasRestantes)}d` : `${rec.diasRestantes} días restantes`}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button size="sm" variant="outline" className="h-8 gap-1 text-xs text-green-600 border-green-500/30 hover:bg-green-500/10"
                              onClick={() => abrirWhatsApp(rec.clienteTelefono, rec.clienteNombre, rec)}>
                              <MessageSquare className="w-3 h-3" />WhatsApp
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
                              onClick={() => setExpandido(isExpanded ? null : rec.id)}>
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>

                        {isExpanded && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                            className="mt-3 pt-3 border-t border-border/30">
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <p className="text-muted-foreground">Póliza</p>
                                <p className="font-mono font-semibold">{rec.numeroPoliza}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Prima</p>
                                <p className="font-semibold">${rec.prima.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Teléfono</p>
                                <p className="font-semibold">{rec.clienteTelefono}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Fecha límite</p>
                                <p className="font-semibold">{new Date(rec.fechaRecordatorio).toLocaleDateString("es-MX")}</p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </GlassCard>
                  </motion.div>
                )
              })
            )}
          </div>

          {/* Modal recordatorio manual */}
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className="glass-strong max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-serif text-xl">Recordatorio Manual</DialogTitle>
                <DialogDescription>Agrega una nota de seguimiento manual</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input placeholder="Título del recordatorio" />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea placeholder="Describe el recordatorio..." rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Fecha</Label>
                    <Input type="date" defaultValue={new Date().toISOString().split("T")[0]} />
                  </div>
                  <div className="space-y-2">
                    <Label>Prioridad</Label>
                    <Select defaultValue="media">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alta">🔴 Alta</SelectItem>
                        <SelectItem value="media">🟡 Media</SelectItem>
                        <SelectItem value="baja">🟢 Baja</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                  <Button onClick={() => { toast.success("Recordatorio guardado"); setIsFormOpen(false) }}>Guardar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </ProtectedRoute>
  )
}
