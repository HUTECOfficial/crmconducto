import { NextRequest, NextResponse } from "next/server"

// pdf-parse uses export= which doesn't work well with ESM imports
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdf = require("pdf-parse")

export interface ExtractedData {
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

const SYSTEM_PROMPT = `Eres un asistente especializado en extraer información de documentos de seguros en México.
A partir del texto de un PDF (póliza, carátula, endoso, etc.), extrae los siguientes campos SI están presentes:
- nombre: Nombre completo del cliente o asegurado
- email: Correo electrónico
- telefono: Teléfono de contacto
- empresa: Empresa o razón social
- rfc: RFC
- direccion: Dirección
- ciudad: Ciudad
- estado: Estado
- codigoPostal: Código postal
- numeroPoliza: Número de póliza
- compania: Nombre de la aseguradora
- ramo: Tipo de seguro (autos, vida, gastos-medicos, empresa, hogar, flotilla)
- prima: Prima o monto total
- formaPago: Forma de pago (mensual, trimestral, semestral, anual)
- vigenciaInicio: Fecha de inicio de vigencia (YYYY-MM-DD)
- vigenciaFin: Fecha de fin de vigencia (YYYY-MM-DD)
- agente: ID o nombre del agente
- numeroRecibo: Número de recibo

Responde SOLO en formato JSON. No incluyas texto adicional ni markdown.
Si un campo no está presente, omítelo del JSON.`

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("pdf") as File | null

    if (!file) {
      return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 })
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Solo se permiten archivos PDF" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let pdfText: string
    try {
      const data = await pdf(buffer)
      pdfText = data.text
    } catch (err: any) {
      console.error("[extract-pdf] Error parsing PDF:", err)
      return NextResponse.json({ error: "No se pudo leer el PDF. Puede estar protegido o corrupto." }, { status: 422 })
    }

    if (!pdfText || pdfText.trim().length < 20) {
      return NextResponse.json({ error: "El PDF no contiene texto extraíble (posiblemente es una imagen escaneada)" }, { status: 422 })
    }

    const truncated = pdfText.slice(0, 8000)

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY no configurada" }, { status: 500 })
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Extrae la información de este documento:\n\n${truncated}` },
        ],
        temperature: 0,
        response_format: { type: "json_object" },
      }),
    })

    if (!response.ok) {
      const errBody = await response.text()
      console.error("[extract-pdf] OpenAI error:", response.status, errBody)
      return NextResponse.json({ error: "Error al procesar con OpenAI" }, { status: 502 })
    }

    const completion = await response.json()
    const content = completion.choices?.[0]?.message?.content

    if (!content) {
      return NextResponse.json({ error: "Respuesta vacía de OpenAI" }, { status: 502 })
    }

    let extracted: ExtractedData
    try {
      extracted = JSON.parse(content)
    } catch {
      return NextResponse.json({ error: "Respuesta de OpenAI no es JSON válido" }, { status: 502 })
    }

    return NextResponse.json({ data: extracted, fullText: pdfText.slice(0, 2000) })
  } catch (err: any) {
    console.error("[extract-pdf] Unexpected error:", err)
    return NextResponse.json({ error: err?.message ?? "Error interno del servidor" }, { status: 500 })
  }
}
