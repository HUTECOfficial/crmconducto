import { NextResponse, type NextRequest } from 'next/server'
import { addDaysDateOnly, compareDateOnly, todayDateOnly } from '@/lib/date-only'

const FUENTE = 'DOF / Banco de México'
/** Indicador de UDIS en el histórico del DOF. */
const DOF_INDICADOR_UDIS = 159

function respuesta(valor: number, fecha: string, maxAge: number) {
  return NextResponse.json({ valor, fecha, fuente: FUENTE }, {
    headers: { 'Cache-Control': maxAge > 0 ? `public, s-maxage=${maxAge}` : 'no-store' },
  })
}

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
async function valorPorFecha(fecha: string): Promise<number | null> {
  const [anio, mes, dia] = fecha.split('-')
  const dof = `${dia}/${mes}/${anio}`
  const url = `https://dof.gob.mx/indicadores_detalle.php?cod_tipo_indicador=${DOF_INDICADOR_UDIS}&dfecha=${encodeURIComponent(dof)}&hfecha=${encodeURIComponent(dof)}`
  const response = await fetchDof(url, { cache: 'no-store' })

  const html = await response.text()
  const fila = html.match(new RegExp(`>\\s*${dia}-${mes}-${anio}\\s*</td>\\s*<td[^>]*>\\s*([\\d.]+)\\s*<`, 'i'))
  const valor = Number(fila?.[1])
  return Number.isFinite(valor) && valor > 0 ? valor : null
}

/** Respaldo: el indicador del día que publica la portada del DOF, sólo si corresponde a hoy. */
async function valorPortadaDof(hoy: string): Promise<number | null> {
  const response = await fetchDof('https://dof.gob.mx/indicadores.php', { cache: 'no-store' })
  const html = await response.text()
  const indicador = html.match(/>UDIS<\/span>\s*<br\s*\/?\s*>\s*([\d.]+)/i)
  const fecha = html.match(/Tipo de Cambio y Tasas al\s+(\d{2})\/(\d{2})\/(\d{4})/i)
  const valor = Number(indicador?.[1])
  if (!fecha || `${fecha[3]}-${fecha[2]}-${fecha[1]}` !== hoy) return null
  return Number.isFinite(valor) && valor > 0 ? valor : null
}

export async function GET(request: NextRequest) {
  const solicitada = request.nextUrl.searchParams.get('fecha')
  if (solicitada !== null && !/^\d{4}-\d{2}-\d{2}$/.test(solicitada)) {
    return NextResponse.json({ error: 'La fecha debe tener formato AAAA-MM-DD' }, { status: 400 })
  }
  const hoy = todayDateOnly()
  const fecha = solicitada || hoy

  try {
    const valor = await valorPorFecha(fecha) ?? (fecha === hoy ? await valorPortadaDof(hoy) : null)
    if (!valor) {
      return NextResponse.json({ error: `Banco de México aún no publica el valor UDI del ${fecha}` }, { status: 404 })
    }
    const reciente = compareDateOnly(fecha, addDaysDateOnly(hoy, -2)) >= 0
    return respuesta(valor, fecha, reciente ? 0 : 60 * 60 * 24)
  } catch {
    return NextResponse.json({ error: 'No fue posible consultar el valor UDI de Banco de México' }, { status: 502 })
  }
}
