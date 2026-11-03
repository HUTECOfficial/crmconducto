import Anthropic from "@anthropic-ai/sdk"
import { formatDateOnly, todayDateOnly } from "@/lib/date-only"
import { ESTADO_HERRAMIENTA, HERRAMIENTAS, ejecutarHerramienta, type NombreHerramienta } from "@/lib/asistente/herramientas"
import { PROMPT_SISTEMA } from "@/lib/asistente/personalidad"

export const MODELO_ASISTENTE = "claude-haiku-5-5"
const MAX_VUELTAS_HERRAMIENTAS = 6

export interface HerramientasExtra {
  definiciones: Anthropic.Tool[]
  /** Devuelve null si la herramienta no es suya. */
  ejecutar: (nombre: string, entrada: unknown) => Promise<{ contenido: string; error: boolean } | null>
  estados?: Record<string, string>
}

/**
 * Una vuelta de conversación con Coni: llama a Claude, ejecuta las herramientas que pida y
 * repite hasta tener la respuesta. Devuelve el texto completo; `alTexto` lo recibe en vivo.
 */
export async function conversarConConi({
  mensajes,
  usuario,
  contextoCanal,
  extra,
  alTexto,
  alEstado,
}: {
  mensajes: Anthropic.MessageParam[]
  usuario: { nombre: string; rol: string }
  contextoCanal?: string
  extra?: HerramientasExtra
  alTexto?: (fragmento: string) => void
  alEstado?: (estado: string) => void
}): Promise<string> {
  const client = new Anthropic()
  const tools = [...HERRAMIENTAS, ...(extra?.definiciones || [])]
  // Lo fijo (personalidad y herramientas) va primero y en caché; lo que cambia, después.
  const system: Anthropic.TextBlockParam[] = [
    { type: "text", text: PROMPT_SISTEMA, cache_control: { type: "ephemeral" } },
    {
      type: "text",
      text: [
        `Hoy es ${formatDateOnly(todayDateOnly())} (hora de la Ciudad de México). Hablas con ${usuario.nombre}, rol ${usuario.rol}.`,
        contextoCanal,
      ].filter(Boolean).join("\n\n"),
    },
  ]
  const historial = [...mensajes]
  let texto = ""
  const emitir = (fragmento: string) => {
    texto += fragmento
    alTexto?.(fragmento)
  }

  let reintentosJson = 0
  for (let vuelta = 0; vuelta < MAX_VUELTAS_HERRAMIENTAS; vuelta++) {
    const stream = client.messages.stream({
      model: MODELO_ASISTENTE,
      max_tokens: 16000,
      output_config: { effort: "low" },
      system,
      tools,
      messages: historial,
    })
    // Separa el texto previo a una consulta del que viene después.
    let inicioDeVuelta = true
    stream.on("text", delta => {
      if (inicioDeVuelta && texto && !texto.endsWith("\n")) emitir("\n\n")
      inicioDeVuelta = false
      emitir(delta)
    })

    let mensaje: Anthropic.Message
    try {
      mensaje = await stream.finalMessage()
      reintentosJson = 0
    } catch (error) {
      // Sólo se reintenta una entrada de herramienta que llegó como JSON ilegible.
      if (error instanceof Anthropic.APIError || reintentosJson++ >= 2) throw error
      vuelta--
      continue
    }

    if (mensaje.stop_reason === "refusal") {
      emitir("\n\nEso no lo puedo responder. ¿Te ayudo con algo de la cartera?")
      break
    }
    const usos = mensaje.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
    if (mensaje.stop_reason !== "tool_use" || usos.length === 0) break

    historial.push({ role: "assistant", content: mensaje.content })
    const resultados: Anthropic.ToolResultBlockParam[] = await Promise.all(usos.map(async uso => {
      alEstado?.(ESTADO_HERRAMIENTA[uso.name as NombreHerramienta] || extra?.estados?.[uso.name] || "Consultando…")
      const resultado = (await extra?.ejecutar(uso.name, uso.input)) ?? await ejecutarHerramienta(uso.name, uso.input)
      return { type: "tool_result", tool_use_id: uso.id, content: resultado.contenido, is_error: resultado.error }
    }))
    historial.push({ role: "user", content: resultados })
  }
  return texto
}

/** Mensaje para el usuario según el error de la API. */
export function mensajeDeError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) return "La clave de la API de Claude no es válida; revisa ANTHROPIC_API_KEY."
  if (error instanceof Anthropic.RateLimitError) return "Coni está muy ocupada en este momento; intenta en un minuto."
  if (error instanceof Anthropic.APIError) return `Coni no pudo responder (error ${error.status}).`
  return "Coni no pudo responder; intenta de nuevo."
}
