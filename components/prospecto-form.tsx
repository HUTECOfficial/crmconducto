"use client"

import type React from "react"

import { useState } from "react"
import { NeoButton } from "./neo-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion } from "framer-motion"
import { useProspectos } from "@/contexts/prospectos-context"
import { toast } from "sonner"

interface ProspectoFormProps {
  onClose: () => void
}

export function ProspectoForm({ onClose }: ProspectoFormProps) {
  const { agregarProspecto } = useProspectos()
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    telefono: "",
    empresa: "",
    interes: "",
    prioridad: "",
    responsable: "",
    notas: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    agregarProspecto({
      nombre: formData.nombre,
      email: formData.email,
      telefono: formData.telefono,
      empresa: formData.empresa || undefined,
      interes: formData.interes as any,
      prioridad: formData.prioridad as "alta" | "media" | "baja",
      responsable: formData.responsable,
      notas: formData.notas || undefined,
      etapa: "lead",
      tags: [],
    })
    
    toast.success(`Prospecto ${formData.nombre} creado exitosamente!`)
    onClose()
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre completo</Label>
        <Input
          id="nombre"
          value={formData.nombre}
          onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
          placeholder="Juan Pérez"
          required
          className="glass"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="juan@empresa.com"
          required
          className="glass"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="telefono">Teléfono</Label>
        <Input
          id="telefono"
          value={formData.telefono}
          onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
          placeholder="+52 55 1234 5678"
          required
          className="glass"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="empresa">Empresa (opcional)</Label>
        <Input
          id="empresa"
          value={formData.empresa}
          onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
          placeholder="Nombre de la empresa"
          className="glass"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="interes">Interés</Label>
        <Select value={formData.interes} onValueChange={(value) => setFormData({ ...formData, interes: value })}>
          <SelectTrigger className="glass">
            <SelectValue placeholder="Selecciona un ramo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="autos">Autos</SelectItem>
            <SelectItem value="vida">Vida</SelectItem>
            <SelectItem value="gastos-medicos">Gastos Médicos</SelectItem>
            <SelectItem value="empresa">Empresa</SelectItem>
            <SelectItem value="hogar">Hogar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="prioridad">Prioridad</Label>
        <Select value={formData.prioridad} onValueChange={(value) => setFormData({ ...formData, prioridad: value })}>
          <SelectTrigger className="glass">
            <SelectValue placeholder="Selecciona prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="media">Media</SelectItem>
            <SelectItem value="baja">Baja</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="responsable">Responsable</Label>
        <Select
          value={formData.responsable}
          onValueChange={(value) => setFormData({ ...formData, responsable: value })}
        >
          <SelectTrigger className="glass">
            <SelectValue placeholder="Asignar a" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Juan Pérez">Juan Pérez</SelectItem>
            <SelectItem value="María García">María García</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notas">Notas</Label>
        <Textarea
          id="notas"
          value={formData.notas}
          onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
          placeholder="Información adicional sobre el prospecto..."
          rows={4}
          className="glass"
        />
      </div>

      <div className="flex gap-3 pt-6 border-t border-border/20 mt-8">
        <NeoButton type="submit" className="flex-1 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90">
          Crear Prospecto
        </NeoButton>
        <NeoButton type="button" variant="ghost" onClick={onClose} className="flex-1 hover:bg-muted/50">
          Cancelar
        </NeoButton>
      </div>
    </motion.form>
  )
}
