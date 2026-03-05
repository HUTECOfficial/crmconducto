export interface ExtractedPDFData {
  fullText: string
  nombre?: string
  email?: string
  telefono?: string
  empresa?: string
}

function extractEmail(text: string): string | undefined {
  const match = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/i)
  return match?.[0]
}

function extractTelefono(text: string): string | undefined {
  const match = text.match(/(\+?52[\s\-]?)?(\d{2,3}[\s\-]?)?\d{4}[\s\-]?\d{4}/)
  return match?.[0]?.trim()
}

function extractNombre(text: string): string | undefined {
  const patterns = [
    /(?:nombre|cliente|asegurado|contratante)[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})/i,
    /^([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})/m,
  ]
  for (const p of patterns) {
    const match = text.match(p)
    if (match?.[1]) return match[1].trim()
  }
  return undefined
}

function extractEmpresa(text: string): string | undefined {
  const match = text.match(/(?:empresa|compañía|razón social|negocio)[:\s]+([^\n]{3,60})/i)
  return match?.[1]?.trim()
}

export async function extractTextFromPDF(file: File): Promise<ExtractedPDFData> {
  if (typeof window === "undefined") {
    throw new Error("extractTextFromPDF solo puede ejecutarse en el cliente")
  }

  const pdfjsLib = await import("pdfjs-dist")

  // Use a pinned worker that matches the installed pdfjs-dist version
  const version = pdfjsLib.version
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`

  const arrayBuffer = await file.arrayBuffer()

  let pdf: any
  try {
    pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
  } catch (err) {
    console.error("[pdf-extractor] Error al abrir el PDF:", err)
    throw new Error("No se pudo abrir el PDF. Asegúrate de que el archivo no esté protegido.")
  }

  let fullText = ""
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = (content.items as any[])
      .map((item) => item.str ?? "")
      .join(" ")
    fullText += pageText + "\n"
  }

  fullText = fullText.trim()

  return {
    fullText,
    nombre: extractNombre(fullText),
    email: extractEmail(fullText),
    telefono: extractTelefono(fullText),
    empresa: extractEmpresa(fullText),
  }
}
