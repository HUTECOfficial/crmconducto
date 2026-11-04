import { NextResponse, type NextRequest } from "next/server"
import type Anthropic from "@anthropic-ai/sdk"
import { usuarios } from "@/data/usuarios"
import { conversarConConi, mensajeDeError } from "@/lib/asistente/agente"
import { cancelarAccion, ejecutarAccion, herramientasDeAcciones, type Propuesta } from "@/lib/asistente/acciones"
import { NOMBRE_ASISTENTE } from "@/lib/asistente/personalidad"
import { supabaseServidor } from "@/lib/supabase-servidor"
import { editarMensaje, enviarMensaje, escaparHtml, escribiendo, markdownATelegram, responderBoton, urlApp } from "@/lib/telegram/api"
import { resumenDiario } from "@/lib/telegram/resumen"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
// Coni con herramientas tarda unos segundos; Telegram espera la respuesta del webhook.
export const maxDuration = 60

const TURNOS_GUARDADOS = 16
const VIGENCIA_FOTO_MS = 30 * 60_000

const CONTEXTO_TELEGRAM = `Estás respondiendo por Telegram desde el celular del usuario.
- Sé más breve que en la web: pocas líneas, viñetas cortas.
- Aquí SÍ puedes hacer tareas con las herramientas proponer_*: comentar una póliza, crear eventos en el Calendario (citas, recordatorios, pagos, renovaciones), dar de alta y actualizar prospectos, actualizar pólizas (estatus, vendedor, grupo, % de comisión, tipo de pago, agente, asegurado) y registrar pagos con la foto del comprobante. Esas herramientas no ejecutan nada: le muestran al usuario un resumen con botones para confirmar. Después de usarlas di en una frase qué preparaste y que lo confirme; nunca digas que ya quedó hecho.
- Si falta un dato obligatorio (motivo para cancelar o marcar vencida, teléfono u origen de un prospecto), pregúntalo antes de proponer.
- Prima, forma de pago, vigencias, primer recibo y días de gracia no se cambian por aquí: recalculan los recibos; indica que se hace en Editar póliza del CRM.
- Si te piden registrar un pago y no hay foto reciente del comprobante en el chat, pide que la manden.
- Las rutas del CRM que enlaces se convierten en ligas que abren el CRM en el navegador.`

const AYUDA = `Puedo ayudarte con:
• Consultas: "¿qué vence esta semana?", "¿cuánto llevamos cobrado de AXA?", "¿cuánto está vencido?", "pólizas de Lozano"
• Pagos: manda la foto del comprobante y dime "pago de la póliza X por transferencia"
• Pólizas: "cambia el vendedor de la 2964 a Maggie", "cancela la X por petición del cliente"
• Prospectos: "nuevo prospecto Juan Pérez 5512345678, quiere GMM, referido", "marca a Juan Pérez como contactado"
• Agenda: "agenda cita con Lozano el jueves a las 11", "recuérdame llamar a X mañana"
• Comentarios: "anota en la 2964 que el cliente paga el viernes"

Comandos: /resumen (resumen de hoy), /nueva (empezar de cero), /desvincular`

const sinTelegram = () => NextResponse.json({ ok: true })

export async function POST(request: NextRequest) {
  // Telegram manda este secreto en cada llamada (se configura con setWebhook).
  const secreto = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!secreto || request.headers.get("x-telegram-bot-api-secret-token") !== secreto) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 })
  }
  const update = await request.json().catch(() => null)
  if (!update?.update_id) return sinTelegram()

  const admin = supabaseServidor()
  // Telegram reintenta si tardamos: cada actualización se procesa una sola vez.
  const { error: registro } = await admin.from("telegram_updates").insert([{ update_id: update.update_id }])
  if (registro?.code === "23505") return sinTelegram()
  if (registro) console.error("Telegram: no se pudo registrar el update", registro.message)

  try {
    if (update.callback_query) await atenderBoton(update.callback_query)
    else if (update.message?.chat?.type === "private") await atenderMensaje(update.message)
  } catch (error) {
    console.error("Telegram:", error)
    const chatId = update.message?.chat?.id ?? update.callback_query?.message?.chat?.id
    if (chatId) await enviarMensaje(chatId, escaparHtml(mensajeDeError(error))).catch(() => undefined)
  }
  return sinTelegram()
}

async function usuarioDelChat(chatId: number) {
  const { data } = await supabaseServidor().from("telegram_vinculos").select("usuario_email").eq("telegram_chat_id", chatId).maybeSingle()
  if (!data) return null
  return usuarios.find(u => u.email.toLowerCase() === data.usuario_email.toLowerCase() && u.activo) ?? null
}

async function atenderBoton(boton: any) {
  const chatId: number = boton.message?.chat?.id
  const [accion, id] = String(boton.data || "").split(":")
  if (!chatId || !id || !(await usuarioDelChat(chatId))) {
    await responderBoton(boton.id, "Este chat no está vinculado al CRM.")
    return
  }
  const resumen: string = boton.message?.text ?? ""
  if (accion === "no") {
    await cancelarAccion(id, chatId)
    await responderBoton(boton.id, "Cancelado")
    await editarMensaje(chatId, boton.message.message_id, `${escaparHtml(resumen)}\n\n❌ <i>Cancelado</i>`)
    return
  }
  await responderBoton(boton.id, "Procesando…")
  await escribiendo(chatId)
  const resultado = await ejecutarAccion(id, chatId)
  await editarMensaje(chatId, boton.message.message_id, `${escaparHtml(resumen)}\n\n${resultado}`)
}

async function atenderMensaje(mensaje: any) {
  const chatId: number = mensaje.chat.id
  const texto: string = (mensaje.text || mensaje.caption || "").trim()
  const admin = supabaseServidor()

  if (texto.startsWith("/start")) {
    const codigo = texto.split(/\s+/)[1]
    if (codigo) return vincular(chatId, codigo, mensaje.from)
  }

  const usuario = await usuarioDelChat(chatId)
  if (!usuario) {
    await enviarMensaje(chatId, `Hola, soy ${NOMBRE_ASISTENTE}, la asistente de Conducto CRM. 👋\n\nPara hablar conmigo vincula tu cuenta: entra al CRM, abre ${NOMBRE_ASISTENTE} y toca <b>Usar en Telegram</b>.\n\n<a href="${urlApp("/coni-telegram")}">Vincular ahora</a>`)
    return
  }
  const primerNombre = usuario.nombre.split(" ")[0]

  if (texto === "/start" || texto === "/ayuda" || texto === "/help") {
    await enviarMensaje(chatId, `¡Hola, ${escaparHtml(primerNombre)}! ✨\n\n${AYUDA}`)
    return
  }
  if (texto === "/desvincular") {
    await admin.from("telegram_vinculos").delete().eq("telegram_chat_id", chatId)
    await admin.from("telegram_conversaciones").delete().eq("telegram_chat_id", chatId)
    await enviarMensaje(chatId, "Listo, desvinculé este Telegram de tu cuenta del CRM. Para volver a usarme vincúlalo de nuevo desde el CRM.")
    return
  }
  if (texto === "/nueva") {
    await admin.from("telegram_conversaciones").upsert({ telegram_chat_id: chatId, mensajes: [], actualizado_en: new Date().toISOString() })
    await enviarMensaje(chatId, "Empezamos de cero. ¿En qué te ayudo?")
    return
  }
  if (texto === "/resumen") {
    await escribiendo(chatId)
    await enviarMensaje(chatId, await resumenDiario(usuario.nombre))
    return
  }

  const { data: conversacion } = await admin.from("telegram_conversaciones").select("*").eq("telegram_chat_id", chatId).maybeSingle()
  // La foto más grande es la de mejor resolución; queda disponible 30 minutos para registrar el pago.
  const foto = Array.isArray(mensaje.photo) ? mensaje.photo[mensaje.photo.length - 1]?.file_id : mensaje.document?.mime_type?.startsWith("image/") ? mensaje.document.file_id : null
  const fotoVigente = foto ?? (conversacion?.foto_file_id && Date.now() - new Date(conversacion.foto_recibida_en).getTime() < VIGENCIA_FOTO_MS ? conversacion.foto_file_id : null)
  if (!texto && !foto) {
    await enviarMensaje(chatId, "Por ahora entiendo texto y fotos de comprobantes. 🙂")
    return
  }
  const pregunta = foto ? `[Adjunté una foto (comprobante de pago).] ${texto || "Te mando el comprobante de pago."}` : texto

  await escribiendo(chatId)
  const anteriores: Array<{ rol: "user" | "assistant"; texto: string }> = conversacion?.mensajes || []
  const mensajes: Anthropic.MessageParam[] = [...anteriores, { rol: "user" as const, texto: pregunta }]
    .map(m => ({ role: m.rol, content: m.texto }))
  const propuestas: Propuesta[] = []
  const respuesta = await conversarConConi({
    mensajes,
    usuario,
    contextoCanal: `${CONTEXTO_TELEGRAM}\n${fotoVigente ? "Hay una foto reciente del comprobante en el chat." : "No hay foto de comprobante reciente en el chat."}`,
    extra: herramientasDeAcciones({ chatId, email: usuario.email, nombre: usuario.nombre, fotoFileId: fotoVigente }, propuestas),
  })

  if (respuesta.trim()) await enviarMensaje(chatId, markdownATelegram(respuesta.trim()))
  for (const propuesta of propuestas) {
    await enviarMensaje(chatId, escaparHtml(propuesta.resumen), [[
      { texto: "✅ Confirmar", datos: `si:${propuesta.id}` },
      { texto: "❌ Cancelar", datos: `no:${propuesta.id}` },
    ]])
  }

  const turnos = [...anteriores, { rol: "user", texto: pregunta }, { rol: "assistant", texto: respuesta.trim() || "(sin respuesta)" }].slice(-TURNOS_GUARDADOS)
  // El historial debe empezar con el usuario.
  while (turnos.length && turnos[0].rol !== "user") turnos.shift()
  await admin.from("telegram_conversaciones").upsert({
    telegram_chat_id: chatId,
    mensajes: turnos,
    foto_file_id: foto ?? conversacion?.foto_file_id ?? null,
    foto_recibida_en: foto ? new Date().toISOString() : conversacion?.foto_recibida_en ?? null,
    actualizado_en: new Date().toISOString(),
  })
  await supabaseServidor(usuario.email).from("bitacora").insert([{
    accion: "consulta", entidad: "asistente", origen: "app", pantalla: "telegram",
    descripcion: `Preguntó a ${NOMBRE_ASISTENTE} por Telegram: "${pregunta.slice(0, 140)}${pregunta.length > 140 ? "…" : ""}"`,
  }])
}

async function vincular(chatId: number, codigo: string, de: any) {
  const admin = supabaseServidor()
  const { data } = await admin.from("telegram_codigos").select("*").eq("codigo", codigo).maybeSingle()
  if (!data || data.usado_en || new Date(data.expira_en).getTime() < Date.now()) {
    await enviarMensaje(chatId, "Ese código ya no es válido. Genera uno nuevo desde el CRM (abre Coni → Usar en Telegram).")
    return
  }
  const usuario = usuarios.find(u => u.email.toLowerCase() === data.usuario_email.toLowerCase() && u.activo)
  if (!usuario) {
    await enviarMensaje(chatId, "Ese usuario ya no está activo en el CRM.")
    return
  }
  await admin.from("telegram_codigos").update({ usado_en: new Date().toISOString() }).eq("codigo", codigo)
  await admin.from("telegram_vinculos").upsert({
    telegram_chat_id: chatId,
    usuario_email: usuario.email,
    telegram_usuario: de?.username ?? null,
    telegram_nombre: [de?.first_name, de?.last_name].filter(Boolean).join(" ") || null,
    vinculado_en: new Date().toISOString(),
  })
  await enviarMensaje(chatId, `¡Listo, ${escaparHtml(usuario.nombre.split(" ")[0])}! ✨ Ya estamos conectados.\n\n${AYUDA}\n\nCada mañana a las 8:00 te mando el resumen del día.`)
}
