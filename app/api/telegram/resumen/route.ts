import { NextResponse, type NextRequest } from "next/server"
import { usuarios } from "@/data/usuarios"
import { supabaseServidor } from "@/lib/supabase-servidor"
import { enviarMensaje } from "@/lib/telegram/api"
import { resumenDiario } from "@/lib/telegram/resumen"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/** Resumen de la mañana a cada Telegram vinculado. Lo llama el cron de Vercel (vercel.json). */
export async function GET(request: NextRequest) {
  const secreto = process.env.CRON_SECRET
  if (!secreto || request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 })
  }
  const { data: vinculos, error } = await supabaseServidor().from("telegram_vinculos").select("telegram_chat_id, usuario_email").eq("resumen_diario", true)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let enviados = 0
  const fallidos: string[] = []
  for (const vinculo of vinculos || []) {
    const usuario = usuarios.find(u => u.email.toLowerCase() === vinculo.usuario_email.toLowerCase() && u.activo)
    if (!usuario) continue
    try {
      await enviarMensaje(vinculo.telegram_chat_id, await resumenDiario(usuario.nombre))
      enviados++
    } catch (error: any) {
      fallidos.push(`${usuario.email}: ${error?.message}`)
    }
  }
  return NextResponse.json({ enviados, fallidos })
}
