import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { usuarios } from "@/data/usuarios"
import { conversarConConi, mensajeDeError } from "@/lib/asistente/agente"
import { LIMITE_DIARIO, MENSAJE_LIMITE, consumirPeticion } from "@/lib/asistente/limite"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const Peticion = z.object({
  mensajes: z.array(z.object({
    rol: z.enum(["user", "assistant"]),
    texto: z.string().min(1).max(4000),
  })).min(1).max(40),
})

/** Respuesta en streaming: una línea JSON por evento ({tipo: "texto" | "estado" | "error" | "fin"}). */
export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Coni todavía no está configurada: falta ANTHROPIC_API_KEY en el servidor." }, { status: 503 })
  }
  const email = request.headers.get("x-crm-usuario")?.toLowerCase() || ""
  const usuario = usuarios.find(item => item.email.toLowerCase() === email && item.activo)
  if (!usuario) return NextResponse.json({ error: "Inicia sesión en el CRM para hablar con Coni." }, { status: 401 })
  const peticion = Peticion.safeParse(await request.json().catch(() => null))
  if (!peticion.success || peticion.data.mensajes[0].rol !== "user") {
    return NextResponse.json({ error: "Conversación inválida." }, { status: 400 })
  }
  // 40 peticiones por usuario al día, sumando la web y Telegram.
  const consumo = await consumirPeticion(usuario.email)
  if (!consumo.permitido) return NextResponse.json({ error: MENSAJE_LIMITE, restantes: 0 }, { status: 429 })

  const codificador = new TextEncoder()
  const cuerpo = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enviar = (evento: Record<string, unknown>) => controller.enqueue(codificador.encode(JSON.stringify(evento) + "\n"))
      try {
        if (consumo.restantes !== null) enviar({ tipo: "limite", restantes: consumo.restantes, limite: LIMITE_DIARIO })
        await conversarConConi({
          mensajes: peticion.data.mensajes.map(m => ({ role: m.rol, content: m.texto })),
          usuario,
          alTexto: texto => enviar({ tipo: "texto", texto }),
          alEstado: texto => enviar({ tipo: "estado", texto }),
        })
        enviar({ tipo: "fin" })
      } catch (error) {
        console.error("Asistente:", error)
        enviar({ tipo: "error", texto: mensajeDeError(error) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(cuerpo, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } })
}
