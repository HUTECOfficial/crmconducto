import { randomBytes } from "crypto"
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { usuarios } from "@/data/usuarios"
import { supabase } from "@/lib/supabase"
import { supabaseServidor } from "@/lib/supabase-servidor"
import { nombreUsuarioBot } from "@/lib/telegram/api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const VIGENCIA_CODIGO_MS = 15 * 60_000

const usuarioActivo = (email: string) => usuarios.find(u => u.email.toLowerCase() === email.toLowerCase() && u.activo)

/** Telegram vinculados al usuario. */
export async function GET(request: NextRequest) {
  const email = request.headers.get("x-crm-usuario") || ""
  if (!usuarioActivo(email)) return NextResponse.json({ error: "Inicia sesión" }, { status: 401 })
  try {
    const { data, error } = await supabaseServidor().from("telegram_vinculos")
      .select("telegram_chat_id, telegram_usuario, telegram_nombre, vinculado_en").ilike("usuario_email", email)
    if (error) throw error
    return NextResponse.json({ vinculos: data, bot: await nombreUsuarioBot().catch(() => null) })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "No disponible" }, { status: 503 })
  }
}

/**
 * Genera un código de un solo uso para vincular Telegram. Pide la contraseña del CRM: es lo que
 * impide que alguien vincule su Telegram a la cuenta de otra persona.
 */
export async function POST(request: NextRequest) {
  const cuerpo = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(await request.json().catch(() => null))
  if (!cuerpo.success) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 })
  const email = cuerpo.data.email.trim().toLowerCase()
  if (!usuarioActivo(email)) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 401 })
  const { data: valida, error } = await supabase.rpc("verificar_contrasena", { p_email: email, p_password: cuerpo.data.password })
  if (error) return NextResponse.json({ error: "No se pudo verificar la contraseña" }, { status: 503 })
  if (valida !== true) return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 })

  try {
    const codigo = randomBytes(9).toString("base64url")
    const { error: errorCodigo } = await supabaseServidor().from("telegram_codigos")
      .insert([{ codigo, usuario_email: email, expira_en: new Date(Date.now() + VIGENCIA_CODIGO_MS).toISOString() }])
    if (errorCodigo) throw errorCodigo
    const bot = await nombreUsuarioBot()
    return NextResponse.json({ codigo, bot, enlace: `https://t.me/${bot}?start=${codigo}` })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "El bot de Telegram no está configurado" }, { status: 503 })
  }
}

/** Desvincula un Telegram del usuario. */
export async function DELETE(request: NextRequest) {
  const email = request.headers.get("x-crm-usuario") || ""
  const chatId = Number(request.nextUrl.searchParams.get("chat"))
  if (!usuarioActivo(email) || !chatId) return NextResponse.json({ error: "Inicia sesión" }, { status: 401 })
  const admin = supabaseServidor()
  await admin.from("telegram_vinculos").delete().eq("telegram_chat_id", chatId).ilike("usuario_email", email)
  await admin.from("telegram_conversaciones").delete().eq("telegram_chat_id", chatId)
  return NextResponse.json({ ok: true })
}
