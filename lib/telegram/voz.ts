import 'server-only'
import { descargarArchivo } from "@/lib/telegram/api"

/**
 * Transcribe las notas de voz de Telegram con OpenAI (la misma OPENAI_API_KEY que lee los PDFs).
 * Telegram graba en OGG/Opus, formato que el servicio acepta directo.
 */
const MODELOS = [process.env.OPENAI_MODELO_TRANSCRIPCION || "gpt-4o-mini-transcribe", "whisper-1"]
export const DURACION_MAXIMA_SEGUNDOS = 180

// Vocabulario del negocio: mejora números de póliza, aseguradoras y términos de cobranza.
const PISTA = "Mensaje de voz de alguien de una agencia de seguros en México para Coni, la asistente del CRM. "
  + "Términos frecuentes: póliza, recibo, prima, endoso, inciso, vigencia, renovación, cobranza, comprobante, transferencia, domiciliación, "
  + "prospecto, gastos médicos mayores, GMM, vida, autos, flotilla, daños, UDIS, AXA, GNP, Qualitas, HDI, Metlife, Allianz, Mapfre, Chubb, Zurich, Banorte."

export async function transcribirNotaDeVoz(fileId: string): Promise<string> {
  const llave = process.env.OPENAI_API_KEY
  if (!llave) throw new Error("Falta OPENAI_API_KEY para entender notas de voz")
  const { datos, ruta } = await descargarArchivo(fileId)
  const extension = (ruta.split(".").pop() || "ogg").toLowerCase()
  const archivo = new File([datos], `nota.${extension === "oga" ? "ogg" : extension}`, { type: extension === "mp3" ? "audio/mpeg" : "audio/ogg" })

  let ultimoError = "sin respuesta"
  for (const modelo of MODELOS) {
    const formulario = new FormData()
    formulario.append("file", archivo)
    formulario.append("model", modelo)
    formulario.append("language", "es")
    formulario.append("prompt", PISTA)
    formulario.append("response_format", "json")
    const respuesta = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${llave}` },
      body: formulario,
    })
    const cuerpo = await respuesta.json().catch(() => ({}))
    if (respuesta.ok && typeof cuerpo.text === "string") return cuerpo.text.trim()
    ultimoError = cuerpo?.error?.message || `error ${respuesta.status}`
  }
  throw new Error(`No pude transcribir la nota de voz: ${ultimoError}`)
}
