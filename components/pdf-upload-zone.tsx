"use client"

import { useRef, useState } from "react"
import { FileText, Upload, X, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { extractTextFromPDF, type ExtractedPDFData } from "@/lib/pdf-extractor"

interface PdfUploadZoneProps {
  onExtracted: (data: ExtractedPDFData) => void
}

export function PdfUploadZone({ onExtracted }: PdfUploadZoneProps) {
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Solo se permiten archivos PDF")
      return
    }
    setPdfFile(file)
    setLoading(true)
    setDone(false)
    try {
      const data = await extractTextFromPDF(file)
      onExtracted(data)
      setDone(true)
      toast.success("Información extraída del PDF")
    } catch {
      toast.error("Error al leer el PDF")
      setPdfFile(null)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const remove = () => {
    setPdfFile(null)
    setDone(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div
      className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer group
        ${pdfFile
          ? done
            ? "border-green-400/60 bg-green-50/50 dark:bg-green-950/20"
            : "border-primary/40 bg-primary/5"
          : "border-border/50 hover:border-primary/50 hover:bg-muted/30"
        }`}
      onClick={() => !pdfFile && fileInputRef.current?.click()}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleChange}
      />

      <div className="p-4 flex items-center gap-3">
        {loading ? (
          <>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
            <div>
              <p className="text-sm font-medium">Extrayendo información...</p>
              <p className="text-xs text-muted-foreground">{pdfFile?.name}</p>
            </div>
          </>
        ) : pdfFile ? (
          <>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${done ? "bg-green-500/15" : "bg-primary/10"}`}>
              {done
                ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                : <FileText className="w-5 h-5 text-primary" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{pdfFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {done ? "Campos auto-rellenados desde el PDF" : "Procesando..."}
              </p>
            </div>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); remove() }}
              className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-xl bg-muted/60 group-hover:bg-primary/10 flex items-center justify-center shrink-0 transition-colors">
              <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                Subir PDF para autocompletar
              </p>
              <p className="text-xs text-muted-foreground">Arrastra aquí o haz clic · extrae nombre, email, teléfono</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
