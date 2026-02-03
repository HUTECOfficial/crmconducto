"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { PageHeader } from "@/components/page-header"
import { GlassCard } from "@/components/glass-card"
import { NeoButton } from "@/components/neo-button"
import { recordatorios } from "@/data/recordatorios"
import { polizas } from "@/data/polizas"
import { clientes } from "@/data/clientes"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { Plus, MessageSquare, Mail, Smartphone, User, Calendar, Clock } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

export default function RecordatoriosPage() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<string>("")
  const [modoManual, setModoManual] = useState(false)

  const tipoIcons = {
    proceso: User,
    cobranza: Calendar,
    "alerta-rapida": Clock,
  }

  const canalIcons = {
    whatsapp: MessageSquare,
    email: Mail,
    sms: Smartphone,
    manual: User,
  }

  const estatusColors = {
    pendiente: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    enviado: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    completado: "bg-green-500/10 text-green-500 border-green-500/20",
  }

  const plantillas = [
    { id: "renovacion-15d", nombre: "Renovación 15 días", tipo: "alerta-rapida", dias: 15 },
    { id: "renovacion-7d", nombre: "Renovación 7 días", tipo: "alerta-rapida", dias: 7 },
    { id: "renovacion-3d", nombre: "Renovación 3 días", tipo: "alerta-rapida", dias: 3 },
    { id: "cobranza-mensual", nombre: "Cobranza mensual", tipo: "cobranza", dias: 7 },
    { id: "seguimiento-prospecto", nombre: "Seguimiento prospecto", tipo: "proceso", dias: 3 },
  ]

  const abrirWhatsApp = (telefono: string, mensaje: string) => {
    const url = `https://wa.me/${telefono.replace(/\D/g, "")}?text=${encodeURIComponent(mensaje)}`
    window.open(url, "_blank")
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 p-8">
        <PageHeader
          title="Recordatorios"
          subtitle="Automatiza tu comunicación con clientes"
          action={
            <NeoButton onClick={() => setIsFormOpen(true)} className="gap-2">
              <Plus className="w-5 h-5" />
              Nuevo Recordatorio
            </NeoButton>
          }
        />

        {/* Plantillas rápidas */}
        <GlassCard className="p-6 mb-6">
          <h3 className="font-bold font-serif text-lg mb-4">Plantillas Rápidas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {plantillas.map((plantilla) => (
              <motion.button
                key={plantilla.id}
                className="p-4 rounded-2xl bg-muted/50 hover:bg-muted transition-colors text-left"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setPlantillaSeleccionada(plantilla.id)
                  setIsFormOpen(true)
                }}
              >
                <p className="font-semibold text-sm mb-1">{plantilla.nombre}</p>
                <p className="text-xs text-muted-foreground">{plantilla.dias} días antes</p>
              </motion.button>
            ))}
          </div>
        </GlassCard>

        {/* Lista de recordatorios */}
        <div className="space-y-4">
          {recordatorios.map((recordatorio, index) => {
            const TipoIcon = tipoIcons[recordatorio.tipo]
            const CanalIcon = canalIcons[recordatorio.canal]
            const poliza = recordatorio.polizaId ? polizas.find((p) => p.id === recordatorio.polizaId) : null
            const cliente = recordatorio.clienteId ? clientes.find((c) => c.id === recordatorio.clienteId) : null

            return (
              <motion.div
                key={recordatorio.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <GlassCard className="p-6 hover:shadow-xl transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-3 rounded-2xl bg-primary/10">
                        <TipoIcon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg mb-1">{recordatorio.titulo}</h4>
                        <p className="text-muted-foreground mb-3">{recordatorio.descripcion}</p>

                        <div className="flex items-center gap-4 text-sm">
                          {cliente && (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span>{cliente.nombre}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>{new Date(recordatorio.fechaRecordatorio).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span>{recordatorio.diasAnticipacion} días antes</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <Badge className={estatusColors[recordatorio.estatus]} variant="outline">
                        {recordatorio.estatus}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <CanalIcon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground capitalize">{recordatorio.canal}</span>
                      </div>
                    </div>
                  </div>

                  {recordatorio.canal === "whatsapp" && recordatorio.estatus === "pendiente" && cliente && (
                    <NeoButton
                      size="sm"
                      onClick={() =>
                        abrirWhatsApp(
                          cliente.telefono,
                          `Hola ${cliente.nombre}, te recordamos que ${recordatorio.descripcion}`,
                        )
                      }
                      className="gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Abrir WhatsApp
                    </NeoButton>
                  )}
                </GlassCard>
              </motion.div>
            )
          })}
        </div>

        {/* Modal de nuevo recordatorio */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="glass-strong max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">Nuevo Recordatorio</DialogTitle>
              <DialogDescription>Configura un recordatorio automático o manual</DialogDescription>
            </DialogHeader>

            <form className="space-y-6 mt-4">
              <div className="space-y-2">
                <Label>Plantilla</Label>
                <Select value={plantillaSeleccionada} onValueChange={setPlantillaSeleccionada}>
                  <SelectTrigger className="glass">
                    <SelectValue placeholder="Selecciona una plantilla" />
                  </SelectTrigger>
                  <SelectContent>
                    {plantillas.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Título</Label>
                <Input placeholder="Título del recordatorio" className="glass" />
              </div>

              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea placeholder="Describe el recordatorio..." rows={3} className="glass" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Días de anticipación</Label>
                  <Select>
                    <SelectTrigger className="glass">
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 días</SelectItem>
                      <SelectItem value="7">7 días</SelectItem>
                      <SelectItem value="15">15 días</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Canal</Label>
                  <Select>
                    <SelectTrigger className="glass">
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/50">
                <div>
                  <p className="font-semibold">Modo manual</p>
                  <p className="text-sm text-muted-foreground">Desactivar envío automático</p>
                </div>
                <Switch checked={modoManual} onCheckedChange={setModoManual} />
              </div>

              <div className="flex gap-3 pt-4">
                <NeoButton type="submit" className="flex-1">
                  Crear Recordatorio
                </NeoButton>
                <NeoButton type="button" variant="ghost" onClick={() => setIsFormOpen(false)} className="flex-1">
                  Cancelar
                </NeoButton>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
