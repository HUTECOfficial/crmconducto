export interface ExtractedPDFData {
  fullText: string
  extraction: {
    method: "texto" | "vision"
    fieldsDetected: number
    totalFields: number
  }
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
  primaTotal?: string
  formaPago?: string
  tipoPago?: string
  vigenciaInicio?: string
  vigenciaFin?: string
  agente?: string
  numeroRecibo?: string
  incisoEndoso?: string
  ultimoDiaPago?: string
  diasGraciaPrimerRecibo?: string
  diasGraciaSubsecuentes?: string
  primerRecibo?: string
  recibosSubsecuentes?: string
  divisas?: string
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
    extraction: json.extraction || { method: "texto", fieldsDetected: 0, totalFields: 24 },
    ...json.data,
  }
}
