export interface ExtractedPDFData {
  fullText: string
  nombre?: string
  email?: string
  telefono?: string
  empresa?: string
  rfc?: string
  direccion?: string
  ciudad?: string
  estado?: string
  codigoPostal?: string
  numeroPoliza?: string
  compania?: string
  ramo?: string
  prima?: string
  formaPago?: string
  vigenciaInicio?: string
  vigenciaFin?: string
  agente?: string
  numeroRecibo?: string
}

export async function extractTextFromPDF(file: File): Promise<ExtractedPDFData> {
  const formData = new FormData()
  formData.append("pdf", file)

  const res = await fetch("/api/extract-pdf", {
    method: "POST",
    body: formData,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || "Error al procesar el PDF")
  }

  const json = await res.json()
  return {
    fullText: json.fullText || "",
    ...json.data,
  }
}
