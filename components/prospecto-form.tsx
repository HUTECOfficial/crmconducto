"use client"

import type React from "react"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSupabase } from "@/contexts/supabase-context"
import { toast } from "sonner"
import { PdfUploadZone } from "@/components/pdf-upload-zone"
import { User, Mail, Phone, Building2, Target, Star, Users, FileText, ArrowRight } from "lucide-react"

interface ProspectoFormProps {
  onClose: () => void
}

export function ProspectoForm({ onClose }: ProspectoFormProps) {
  const { agregarProspecto } = useSupabase()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    telefono: "",
    empresa: "",
    interes: "autos",
    prioridad: "media",
    responsable: "",
    notas: "",
    origen: "directo",
  })

  const set = (key: string, val: string) => setFormData(prev => ({ ...prev, [key]: val }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nombre || !formData.telefono) {
      toast.error("Nombre y teléfono son obligatorios")
      return
    }
    setLoading(true)
    try {
      await agregarProspecto({
        nombre: formData.nombre,
        email: formData.email,
        telefono: formData.telefono,
        empresa: formData.empresa || undefined,
        interes: formData.interes,
        prioridad: formData.prioridad as "alta" | "media" | "baja",
        origen: formData.origen,
        estatus: "nuevo",
        fechaContacto: new Date().toISOString().split("T")[0],
        notas: formData.notas || undefined,
        asignadoA: formData.responsable || undefined,
      })
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* PDF Upload */}
      <PdfUploadZone
        onExtracted={(data) => {
          setFormData(prev => ({
            ...prev,
            nombre: data.nombre && !prev.nombre ? data.nombre : prev.nombre,
            email: data.email && !prev.email ? data.email : prev.email,
            telefono: data.telefono && !prev.telefono ? data.telefono : prev.telefono,
            empresa: data.empresa && !prev.empresa ? data.empresa : prev.empresa,
            notas: data.fullText
              ? (prev.notas ? prev.notas + "\n\n" : "") + "--- PDF ---\n" + data.fullText.slice(0, 800)
              : prev.notas,
          }))
        }}
      />

      {/* Nombre + Empresa */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <User className="w-3.5 h-3.5" /> Nombre *
          </Label>
          <Input
            value={formData.nombre}
            onChange={e => set("nombre", e.target.value)}
            placeholder="Juan Pérez García"
            required
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <Building2 className="w-3.5 h-3.5" /> Empresa
          </Label>
          <Input
            value={formData.empresa}
            onChange={e => set("empresa", e.target.value)}
            placeholder="Empresa SA de CV"
          />
        </div>
      </div>

      {/* Email + Teléfono */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <Mail className="w-3.5 h-3.5" /> Email
          </Label>
          <Input
            type="email"
            value={formData.email}
            onChange={e => set("email", e.target.value)}
            placeholder="juan@empresa.com"
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <Phone className="w-3.5 h-3.5" /> Teléfono *
          </Label>
          <Input
            value={formData.telefono}
            onChange={e => set("telefono", e.target.value)}
            placeholder="+52 55 1234 5678"
            required
          />
        </div>
      </div>

      {/* Interés + Origen */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <Target className="w-3.5 h-3.5" /> Interés
          </Label>
          <Select value={formData.interes} onValueChange={v => set("interes", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="autos">🚗 Autos</SelectItem>
              <SelectItem value="vida">❤️ Vida</SelectItem>
              <SelectItem value="gastos-medicos">🏥 Gastos Médicos</SelectItem>
              <SelectItem value="empresa">🏢 Empresa</SelectItem>
              <SelectItem value="hogar">🏠 Hogar</SelectItem>
              <SelectItem value="flotilla">🚛 Flotilla</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <ArrowRight className="w-3.5 h-3.5" /> Origen
          </Label>
          <Select value={formData.origen} onValueChange={v => set("origen", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="directo">Directo</SelectItem>
              <SelectItem value="referido">Referido</SelectItem>
              <SelectItem value="redes-sociales">Redes Sociales</SelectItem>
              <SelectItem value="telefono">Teléfono</SelectItem>
              <SelectItem value="web">Web</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Prioridad + Responsable */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <Star className="w-3.5 h-3.5" /> Prioridad
          </Label>
          <Select value={formData.prioridad} onValueChange={v => set("prioridad", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="alta">🔴 Alta</SelectItem>
              <SelectItem value="media">🟡 Media</SelectItem>
              <SelectItem value="baja">🟢 Baja</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <Users className="w-3.5 h-3.5" /> Responsable
          </Label>
          <Select value={formData.responsable || "sin-asignar"} onValueChange={v => set("responsable", v === "sin-asignar" ? "" : v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sin-asignar">Sin asignar</SelectItem>
              <SelectItem value="Mauricio Portillo">Mauricio Portillo</SelectItem>
              <SelectItem value="Javier Garcia">Javier Garcia</SelectItem>
              <SelectItem value="Monse">Monse</SelectItem>
              <SelectItem value="Dani">Dani</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Notas */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <FileText className="w-3.5 h-3.5" /> Notas
        </Label>
        <Textarea
          value={formData.notas}
          onChange={e => set("notas", e.target.value)}
          placeholder="Información adicional sobre el prospecto..."
          rows={3}
        />
      </div>

      {/* Footer */}
      <div className="flex gap-3 pt-4 border-t border-border/30">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? "Creando..." : "Crear Prospecto"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
      </div>
    </form>
  )
}
