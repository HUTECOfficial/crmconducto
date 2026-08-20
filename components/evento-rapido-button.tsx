"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSupabase } from "@/contexts/supabase-context"
import { Calendar, Clock } from "lucide-react"
import { toast } from "sonner"

interface EventoRapidoButtonProps {
  clienteId?: string
  polizaId?: string
  clienteNombre?: string
  polizaNumero?: string
}

export function EventoRapidoButton({ clienteId, polizaId, clienteNombre, polizaNumero }: EventoRapidoButtonProps) {
  const { agregarEvento } = useSupabase()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    fecha: new Date().toISOString().split("T")[0],
    hora: "09:00",
    tipo: "cita" as const,
    prioridad: "media" as const,
  })

  const handleSubmit = async () => {
    if (!form.titulo.trim()) {
      toast.error("El título es obligatorio")
      return
    }

    setLoading(true)
    try {
      await agregarEvento({
        titulo: form.titulo,
        descripcion: form.descripcion || undefined,
        fecha: form.fecha,
        hora: form.hora,
        tipo: form.tipo,
        prioridad: form.prioridad,
        clienteId: clienteId || undefined,
        polizaId: polizaId || undefined,
        completado: false,
      })
      toast.success("Evento creado exitosamente")
      setOpen(false)
      setForm({
        titulo: "",
        descripcion: "",
        fecha: new Date().toISOString().split("T")[0],
        hora: "09:00",
        tipo: "cita",
        prioridad: "media",
      })
    } catch (err) {
      toast.error("Error al crear evento")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <Calendar className="w-4 h-4" />
        Agendar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Crear Evento</DialogTitle>
            <DialogDescription>
              {clienteNombre && <p>Cliente: {clienteNombre}</p>}
              {polizaNumero && <p>Póliza: {polizaNumero}</p>}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                placeholder="Ej: Llamada de seguimiento"
                value={form.titulo}
                onChange={(e) => setForm(f => ({ ...f, titulo: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                placeholder="Detalles adicionales..."
                rows={3}
                value={form.descripcion}
                onChange={(e) => setForm(f => ({ ...f, descripcion: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha *</Label>
                <Input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm(f => ({ ...f, fecha: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={form.hora}
                  onChange={(e) => setForm(f => ({ ...f, hora: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v: any) => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cita">📞 Cita</SelectItem>
                    <SelectItem value="pago">💰 Pago</SelectItem>
                    <SelectItem value="renovacion">🔄 Renovación</SelectItem>
                    <SelectItem value="recordatorio">🔔 Recordatorio</SelectItem>
                    <SelectItem value="otro">📋 Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Creando..." : "Crear Evento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
