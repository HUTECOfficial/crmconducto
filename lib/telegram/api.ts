import 'server-only'

/** Llamadas a la Bot API de Telegram (HTTP). El token sólo vive en el servidor. */
const URL_APP = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.conductocrm.cloud').replace(/\/+$/, '')

function token() {
  const valor = process.env.TELEGRAM_BOT_TOKEN
  if (!valor) throw new Error('Falta TELEGRAM_BOT_TOKEN en el servidor')
  return valor
}

export async function telegram<T = any>(metodo: string, cuerpo: Record<string, unknown>): Promise<T> {
  const respuesta = await fetch(`https://api.telegram.org/bot${token()}/${metodo}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  })
  const datos = await respuesta.json().catch(() => ({}))
  if (!datos.ok) throw new Error(`Telegram ${metodo}: ${datos.description || respuesta.status}`)
  return datos.result as T
}

export interface Boton { texto: string; datos: string }

/** Envía texto en HTML de Telegram, partido en mensajes de hasta 4,000 caracteres. */
export async function enviarMensaje(chatId: number, html: string, botones?: Boton[][]) {
  const partes = partir(html, 4000)
  let ultimo: any
  for (const [indice, parte] of partes.entries()) {
    ultimo = await telegram('sendMessage', {
      chat_id: chatId,
      text: parte,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      ...(botones && indice === partes.length - 1
        ? { reply_markup: { inline_keyboard: botones.map(fila => fila.map(b => ({ text: b.texto, callback_data: b.datos }))) } }
        : {}),
    })
  }
  return ultimo
}

export const editarMensaje = (chatId: number, mensajeId: number, html: string) =>
  telegram('editMessageText', { chat_id: chatId, message_id: mensajeId, text: html, parse_mode: 'HTML', link_preview_options: { is_disabled: true } })

export const responderBoton = (callbackId: string, texto?: string) =>
  telegram('answerCallbackQuery', { callback_query_id: callbackId, ...(texto ? { text: texto } : {}) })

export const escribiendo = (chatId: number) => telegram('sendChatAction', { chat_id: chatId, action: 'typing' }).catch(() => undefined)

let usuarioBot: string | null = null
export async function nombreUsuarioBot(): Promise<string> {
  if (!usuarioBot) usuarioBot = (await telegram<{ username: string }>('getMe', {})).username
  return usuarioBot
}

/** Descarga un archivo que mandaron al bot (p. ej. la foto de un comprobante). */
export async function descargarArchivo(fileId: string): Promise<{ datos: ArrayBuffer; ruta: string }> {
  const archivo = await telegram<{ file_path: string }>('getFile', { file_id: fileId })
  const respuesta = await fetch(`https://api.telegram.org/file/bot${token()}/${archivo.file_path}`)
  if (!respuesta.ok) throw new Error('No se pudo descargar el archivo de Telegram')
  return { datos: await respuesta.arrayBuffer(), ruta: archivo.file_path }
}

export const escaparHtml = (texto: string) => texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Convierte el Markdown sencillo de Coni al HTML que acepta Telegram; las rutas del CRM se vuelven ligas completas. */
export function markdownATelegram(texto: string): string {
  return escaparHtml(texto)
    .replace(/^#{1,4}\s+(.+)$/gm, '<b>$1</b>')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, etiqueta: string, destino: string) => {
      const url = destino.startsWith('/') ? `${URL_APP}${destino}` : destino
      return /^https?:\/\//.test(url) ? `<a href="${url.replace(/"/g, '&quot;')}">${etiqueta}</a>` : etiqueta
    })
    .replace(/^\s*[-*]\s+/gm, '• ')
}

export const urlApp = (ruta = '/') => `${URL_APP}${ruta}`

function partir(texto: string, maximo: number): string[] {
  if (texto.length <= maximo) return [texto]
  const partes: string[] = []
  let resto = texto
  while (resto.length > maximo) {
    const corte = Math.max(resto.lastIndexOf('\n', maximo), maximo / 2)
    partes.push(resto.slice(0, corte))
    resto = resto.slice(corte).trimStart()
  }
  if (resto) partes.push(resto)
  return partes
}
