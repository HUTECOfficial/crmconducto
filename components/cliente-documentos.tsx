"use client"

import { useEffect, useRef, useState } from "react"
import { useSupabase, type DocumentoCliente } from "@/contexts/supabase-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Upload, FileText, FileImage, File, Trash2, Download,
  Loader2, FolderOpen, X
} from "lucide-react"

interface ClienteDocumentosProps {
  clienteId: string
}

const ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt,.zip"
const MAX_MB = 20

function fileIcon(tipo: string) {
  if (tipo.includes("pdf")) return <FileText className="w-5 h-5 text-red-400" />
  if (tipo.includes("image")) return <FileImage className="w-5 h-5 text-blue-400" />
  return <File className="w-5 h-5 text-muted-foreground" />
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

export function ClienteDocumentos({ clienteId }: ClienteDocumentosProps) {
  const { uploadDocumentoCliente, getDocumentosCliente, eliminarDocumentoCliente } = useSupabase()
  const [docs, setDocs] = useState<DocumentoCliente[]>([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoadingDocs(true)
    const data = await getDocumentosCliente(clienteId)
    setDocs(data)
    setLoadingDocs(false)
  }

  useEffect(() => { load() }, [clienteId])

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`El archivo supera el límite de ${MAX_MB} MB`)
      return
    }
    setUploading(true)
    const result = await uploadDocumentoCliente(clienteId, file)
    if (result) {
      setDocs(prev => [result, ...prev])
    }
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ""
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleDelete = async (doc: DocumentoCliente) => {
    await eliminarDocumentoCliente(doc)
    setDocs(prev => prev.filter(d => d.id !== doc.id))
    setConfirmDelete(null)
  }

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <div
        className={`rounded-2xl border-2 border-dashed transition-all cursor-pointer
          ${dragging
            ? "border-primary bg-primary/10 scale-[1.01]"
            : "border-border/50 hover:border-primary/50 hover:bg-muted/30"
          }
          ${uploading ? "pointer-events-none opacity-60" : ""}
        `}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
        <div className="p-5 flex items-center gap-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors
            ${dragging ? "bg-primary/20" : "bg-muted/60"}`}>
            {uploading
              ? <Loader2 className="w-5 h-5 text-primary animate-spin" />
              : <Upload className={`w-5 h-5 ${dragging ? "text-primary" : "text-muted-foreground"}`} />
            }
          </div>
          <div>
            <p className="text-sm font-medium">
              {uploading ? "Subiendo documento..." : "Subir documento"}
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, Word, Excel, imágenes · máx. {MAX_MB} MB · arrastra o haz clic
            </p>
          </div>
        </div>
      </div>

      {/* Document list */}
      <div className="space-y-2">
        {loadingDocs ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Cargando documentos...</span>
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
            <FolderOpen className="w-10 h-10 opacity-30" />
            <p className="text-sm">Sin documentos. Sube el primer archivo.</p>
          </div>
        ) : (
          docs.map(doc => (
            <div
              key={doc.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors group"
            >
              <div className="shrink-0">{fileIcon(doc.tipo)}</div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.nombre}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{formatBytes(doc.tamaño)}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{formatFecha(doc.creadoEn)}</span>
                  <Badge variant="outline" className="text-[10px] h-4 px-1 capitalize">
                    {doc.tipo.split("/").pop()?.split("+")[0] || "archivo"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                  title="Descargar"
                >
                  <Download className="w-4 h-4" />
                </a>
                {confirmDelete === doc.id ? (
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm" variant="destructive"
                      className="h-6 px-2 text-xs"
                      onClick={() => handleDelete(doc)}
                    >
                      Eliminar
                    </Button>
                    <button
                      className="p-1 rounded text-muted-foreground hover:text-foreground"
                      onClick={() => setConfirmDelete(null)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title="Eliminar"
                    onClick={() => setConfirmDelete(doc.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {docs.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          {docs.length} {docs.length === 1 ? "documento" : "documentos"}
        </p>
      )}
    </div>
  )
}
