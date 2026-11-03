import { todayDateOnly } from './date-only'

/**
 * Consulta del valor UDI en el histórico del DOF (Banco de México), sin token.
 * Lo usan la ruta /api/udi y el servidor (p. ej. pagos registrados desde Telegram).
 */
export const FUENTE_UDI = 'DOF / Banco de México'
/** Indicador de UDIS en el histórico del DOF. */
const DOF_INDICADOR_UDIS = 159

/** El DOF falla de forma intermitente: un reintento evita bloquear el registro de pagos. */
async function fetchDof(url: string, init: RequestInit): Promise<Response> {
  try {
    const response = await fetch(url, init)
    if (response.ok) return response
  } catch {
    // Se reintenta abajo.
  }
  const response = await fetch(url, init)
  if (!response.ok) throw new Error(`DOF respondió ${response.status}`)
  return response
}

/**
 * Valor UDI publicado para una fecha exacta (AAAA-MM-DD) según el histórico del DOF.
 * Siempre se consulta en vivo; sólo la respuesta exitosa de esta ruta se cachea
 * (Cache-Control), así nunca queda en caché un "no publicado" ni una página de error.
 */
export async function valorPorFecha(fecha: string): Promise<number | null> {
  const [anio, mes, dia] = fecha.split('-')
  const dof = `${dia}/${mes}/${anio}`
  const url = `https://dof.gob.mx/indicadores_detalle.php?cod_tipo_indicador=${DOF_INDICADOR_UDIS}&dfecha=${encodeURIComponent(dof)}&hfecha=${encodeURIComponent(dof)}`
  const response = await fetchDof(url, { cache: 'no-store' })

  const html = await response.text()
  const fila = html.match(new RegExp(`>\\s*${dia}-${mes}-${anio}\\s*</td>\\s*<td[^>]*>\\s*([\\d.]+)\\s*<`, 'i'))
  const valor = Number(fila?.[1])
  return Number.isFinite(valor) && valor > 0 ? valor : null
}

/**
 * Valores UDI publicados entre dos fechas (AAAA-MM-DD), en una sola consulta al DOF.
 * Banco de México publica por adelantado (cada quincena), así que el rango puede traer
 * valores de días que aún no llegan.
 */
export async function valoresPorRango(desde: string, hasta: string): Promise<Record<string, number>> {
  const dof = (fecha: string) => fecha.split('-').reverse().join('/')
  const url = `https://dof.gob.mx/indicadores_detalle.php?cod_tipo_indicador=${DOF_INDICADOR_UDIS}&dfecha=${encodeURIComponent(dof(desde))}&hfecha=${encodeURIComponent(dof(hasta))}`
  const html = await (await fetchDof(url, { cache: 'no-store' })).text()
  const valores: Record<string, number> = {}
  for (const [, dia, mes, anio, texto] of html.matchAll(/>\s*(\d{2})-(\d{2})-(\d{4})\s*<\/td>\s*<td[^>]*>\s*([\d.]+)\s*</g)) {
    const valor = Number(texto)
    if (Number.isFinite(valor) && valor > 0) valores[`${anio}-${mes}-${dia}`] = valor
  }
  return valores
}

/** Respaldo: el indicador del día que publica la portada del DOF, sólo si corresponde a hoy. */
export async function valorPortadaDof(hoy: string): Promise<number | null> {
  const response = await fetchDof('https://dof.gob.mx/indicadores.php', { cache: 'no-store' })
  const html = await response.text()
  const indicador = html.match(/>UDIS<\/span>\s*<br\s*\/?\s*>\s*([\d.]+)/i)
  const fecha = html.match(/Tipo de Cambio y Tasas al\s+(\d{2})\/(\d{2})\/(\d{4})/i)
  const valor = Number(indicador?.[1])
  if (!fecha || `${fecha[3]}-${fecha[2]}-${fecha[1]}` !== hoy) return null
  return Number.isFinite(valor) && valor > 0 ? valor : null
}

/** Valor UDI de una fecha (AAAA-MM-DD); para hoy usa la portada del DOF como respaldo. */
export async function valorUdiDelDia(fecha: string): Promise<number | null> {
  return await valorPorFecha(fecha) ?? (fecha === todayDateOnly() ? await valorPortadaDof(fecha) : null)
}
