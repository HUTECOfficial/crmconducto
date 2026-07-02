import { NextRequest, NextResponse } from "next/server"
import { PDFParse } from "pdf-parse"

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

const SYSTEM_PROMPT = `Eres un asistente especializado en extraer información de documentos de seguros en México (pólizas, carátulas, endosos, certificados).
A partir del texto de un PDF, extrae los siguientes campos SI están presentes:

DATOS DEL CLIENTE:
- nombre: Nombre completo del cliente, asegurado o contratante
- email: Correo electrónico
- telefono: Teléfono de contacto (con código de país si aparece)
- empresa: Empresa o razón social
- rfc: RFC del cliente o empresa
- direccion: Dirección completa
- ciudad: Ciudad
- estado: Estado
- codigoPostal: Código postal

DATOS DE LA PÓLIZA:
- numeroPoliza: Número de póliza (tal cual aparece en el documento)
- compania: Nombre de la aseguradora (GNP, AXA, MetLife, Mapfre, Zurich, etc.)
- ramo: Tipo de seguro. Usa uno de: autos, vida, gastos-medicos, empresa, hogar, flotilla
- prima: Prima o monto del recibo (número sin símbolos)
- primaTotal: Prima total anual o del periodo (número sin símbolos)
- formaPago: Forma de pago. Usa uno de: mensual, trimestral, semestral, anual
- tipoPago: Método de pago. Usa uno de: efectivo, transferencia, tarjeta, domiciliacion, cheque
- vigenciaInicio: Fecha de inicio de vigencia en formato YYYY-MM-DD
- vigenciaFin: Fecha de fin de vigencia en formato YYYY-MM-DD
- agente: ID o nombre del agente
- numeroRecibo: Número de recibo (ej: 1/12, 2/6, etc.)
- incisoEndoso: Inciso o número de endoso si aparece
- ultimoDiaPago: Fecha límite de pago en formato YYYY-MM-DD
- diasGraciaPrimerRecibo: Días de gracia para el primer recibo (número)
- diasGraciaSubsecuentes: Días de gracia para recibos subsecuentes (número)
- primerRecibo: Monto del primer recibo (número sin símbolos)
- recibosSubsecuentes: Monto de recibos subsecuentes (número sin símbolos)
- divisas: Moneda. Usa: MXN, USD, EUR (por defecto MXN)

REGLAS:
- Responde SOLO en formato JSON válido. No incluyas texto adicional ni markdown.
- Si un campo no está presente en el documento, omítelo del JSON.
- Para fechas, usa siempre formato YYYY-MM-DD.
- Para montos, usa solo números sin símbolos de moneda ni comas (ej: 5000.00).
- Para ramo, formaPago y tipoPago, usa exactamente los valores permitidos listados arriba.`

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
      const parser = new PDFParse({ data: buffer })
      const result = await parser.getText()
      pdfText = result.text
    } catch (err: any) {
      console.error("[extract-pdf] Error parsing PDF:", err)
      return NextResponse.json({ error: "No se pudo leer el PDF. Puede estar protegido o corrupto." }, { status: 422 })
    }

    if (!pdfText || pdfText.trim().length < 20) {
      return NextResponse.json({ error: "El PDF no contiene texto extraíble (posiblemente es una imagen escaneada)" }, { status: 422 })
    }

    const truncated = pdfText.slice(0, 12000)

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
