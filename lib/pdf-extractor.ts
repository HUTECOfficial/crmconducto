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

const TIMEOUT_MS = 8000
const MAX_PAGES = 3
const MIN_USEFUL_TEXT = 200

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Tiempo de espera agotado (${ms / 1000}s) en: ${label}`)), ms)
    ),
  ])
}

export async function extractTextFromPDF(file: File): Promise<ExtractedPDFData> {
  if (typeof window === "undefined") {
    throw new Error("extractTextFromPDF solo puede ejecutarse en el cliente")
  }

  const pdfjsLib = await withTimeout(
    import("pdfjs-dist"),
    TIMEOUT_MS,
    "cargar pdfjs"
  )

  const version = pdfjsLib.version
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`

  const arrayBuffer = await file.arrayBuffer()

  let pdf: any
  try {
    pdf = await withTimeout(
      pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
      }).promise,
      TIMEOUT_MS,
      "abrir PDF"
    )
  } catch (err: any) {
    console.error("[pdf-extractor] Error al abrir el PDF:", err)
    throw new Error(err?.message?.includes("Tiempo") ? err.message : "No se pudo abrir el PDF. Verifica que el archivo no esté protegido.")
  }

  let fullText = ""
  const pagesToRead = Math.min(pdf.numPages, MAX_PAGES)

  for (let i = 1; i <= pagesToRead; i++) {
    try {
      const page = await withTimeout(pdf.getPage(i), 3000, `página ${i}`) as any
      const content = await withTimeout((page as any).getTextContent(), 3000, `texto página ${i}`) as any
      const pageText = (content.items as any[])
        .map((item) => item.str ?? "")
        .join(" ")
      fullText += pageText + "\n"

      // Stop early if we already have enough text to extract fields
      if (fullText.trim().length >= MIN_USEFUL_TEXT) {
        const candidate = {
          nombre: extractNombre(fullText),
          email: extractEmail(fullText),
          telefono: extractTelefono(fullText),
          empresa: extractEmpresa(fullText),
        }
        if (candidate.nombre && candidate.telefono) break
      }
    } catch (pageErr) {
      console.warn(`[pdf-extractor] Página ${i} falló:`, pageErr)
      break
    }
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
