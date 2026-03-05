"use client"

import type React from "react"

import { useState, useRef } from "react"
import { NeoButton } from "./neo-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion } from "framer-motion"
import { useSupabase } from "@/contexts/supabase-context"
import { toast } from "sonner"
import { extractTextFromPDF } from "@/lib/pdf-extractor"
import { FileText, Upload, X, Loader2 } from "lucide-react"

interface ProspectoFormProps {
  onClose: () => void
}

export function ProspectoForm({ onClose }: ProspectoFormProps) {
  const { agregarProspecto } = useSupabase()
  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfText, setPdfText] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    telefono: "",
    empresa: "",
    interes: "",
    prioridad: "",
    responsable: "",
    notas: "",
    origen: "directo",
  })

  const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== "application/pdf") {
      toast.error("Solo se permiten archivos PDF")
      return
    }
    setPdfFile(file)
    setPdfLoading(true)
    try {
      const extracted = await extractTextFromPDF(file)
      setPdfText(extracted.fullText)
      const updates: Partial<typeof formData> = {}
      if (extracted.nombre && !formData.nombre) updates.nombre = extracted.nombre
      if (extracted.email && !formData.email) updates.email = extracted.email
      if (extracted.telefono && !formData.telefono) updates.telefono = extracted.telefono
      if (extracted.empresa && !formData.empresa) updates.empresa = extracted.empresa
      if (extracted.fullText) {
        updates.notas = (formData.notas ? formData.notas + "\n\n" : "") + "--- Extraído del PDF ---\n" + extracted.fullText.slice(0, 1000)
      }
      if (Object.keys(updates).length > 0) {
        setFormData((prev) => ({ ...prev, ...updates }))
        toast.success("Información extraída del PDF")
      } else {
        toast.info("PDF procesado. No se detectaron campos automáticamente.")
      }
    } catch (err) {
      toast.error("Error al leer el PDF")
      console.error(err)
    } finally {
      setPdfLoading(false)
    }
  }

  const removePDF = () => {
    setPdfFile(null)
    setPdfText("")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

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
        interes: formData.interes || "autos",
        prioridad: (formData.prioridad || "media") as "alta" | "media" | "baja",
        origen: formData.origen || "directo",
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
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* PDF Upload */}
      <div className="space-y-2">
        <Label>Subir PDF (opcional)</Label>
        <div
          className="border-2 border-dashed border-primary/30 rounded-lg p-4 text-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all"
          onClick={() => !pdfFile && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handlePDFUpload}
          />
          {pdfLoading ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Extrayendo información del PDF...</span>
            </div>
          ) : pdfFile ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm text-primary">
                <FileText className="h-5 w-5 shrink-0" />
                <span className="truncate max-w-[260px]">{pdfFile.name}</span>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removePDF() }}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <Upload className="h-8 w-8 mb-1 opacity-50" />
              <span className="text-sm font-medium">Haz clic para subir un PDF</span>
              <span className="text-xs">Se extraerá la información automáticamente</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre completo *</Label>
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
          className="glass"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="telefono">Teléfono *</Label>
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="interes">Interés</Label>
          <Select value={formData.interes || "autos"} onValueChange={(value) => setFormData({ ...formData, interes: value })}>
            <SelectTrigger className="glass">
              <SelectValue placeholder="Selecciona un ramo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="autos">Autos</SelectItem>
              <SelectItem value="vida">Vida</SelectItem>
              <SelectItem value="gastos-medicos">Gastos Médicos</SelectItem>
              <SelectItem value="empresa">Empresa</SelectItem>
              <SelectItem value="hogar">Hogar</SelectItem>
              <SelectItem value="flotilla">Flotilla</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="origen">Origen</Label>
          <Select value={formData.origen} onValueChange={(value) => setFormData({ ...formData, origen: value })}>
            <SelectTrigger className="glass">
              <SelectValue placeholder="Origen del prospecto" />
            </SelectTrigger>
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="prioridad">Prioridad</Label>
          <Select value={formData.prioridad || "media"} onValueChange={(value) => setFormData({ ...formData, prioridad: value })}>
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
            value={formData.responsable || "sin-asignar"}
            onValueChange={(value) => setFormData({ ...formData, responsable: value === "sin-asignar" ? "" : value })}
          >
            <SelectTrigger className="glass">
              <SelectValue placeholder="Asignar a" />
            </SelectTrigger>
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
        <NeoButton type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90">
          {loading ? "Creando..." : "Crear Prospecto"}
        </NeoButton>
        <NeoButton type="button" variant="ghost" onClick={onClose} className="flex-1 hover:bg-muted/50">
          Cancelar
        </NeoButton>
      </div>
    </motion.form>
  )
}
