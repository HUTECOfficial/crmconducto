import { compareDateOnly, differenceInCalendarDays } from './date-only'

export interface ValorUdiActual {
  valor: number
  /** Fecha del valor publicado (AAAA-MM-DD). */
  fecha: string | null
  fuente: string
}

/** Valor UDI de Banco de México para una fecha (AAAA-MM-DD); sin fecha, el de hoy. */
export async function obtenerValorUdi(fecha?: string): Promise<ValorUdiActual> {
  const response = await fetch(fecha ? `/api/udi/?fecha=${encodeURIComponent(fecha)}` : '/api/udi/', { cache: 'no-store' })
  const data = await response.json().catch(() => ({})) as Partial<ValorUdiActual> & { error?: string }
  if (!response.ok) throw new Error(data.error || 'No fue posible consultar el valor UDI')
  if (!Number.isFinite(data.valor) || Number(data.valor) <= 0) throw new Error('Banco de México no devolvió un valor UDI válido')
  // Nunca aplicar el valor de otro día al convertir un recibo.
  if (fecha && data.fecha !== fecha) throw new Error(`El valor UDI recibido no corresponde al ${fecha}`)
  return data as ValorUdiActual
}

export function obtenerValorUdiActual(): Promise<ValorUdiActual> {
  return obtenerValorUdi()
}

export interface UdiParaFecha {
  valor: number
  /** Día cuyo valor se aplica (el de pago). */
  fecha: string
  /** true si Banco de México aún no publica ese día y se proyectó con el último valor publicado. */
  estimado: boolean
}

/**
 * Valor UDI para un día: el publicado si existe; si es posterior al último publicado, se
 * proyecta con el crecimiento diario del último día (la UDI crece a ritmo constante dentro de
 * cada periodo de publicación). Sin valores previos a esa fecha no hay dato.
 */
export function udiParaFecha(valores: Record<string, number>, fecha: string): UdiParaFecha | null {
  if (valores[fecha]) return { valor: valores[fecha], fecha, estimado: false }
  const anteriores = Object.keys(valores).filter(dia => compareDateOnly(dia, fecha) < 0).sort(compareDateOnly)
  const ultima = anteriores[anteriores.length - 1]
  if (!ultima) return null
  const penultima = anteriores[anteriores.length - 2]
  const crecimientoDiario = penultima ? Math.pow(valores[ultima] / valores[penultima], 1 / differenceInCalendarDays(ultima, penultima)) : 1
  const valor = valores[ultima] * Math.pow(crecimientoDiario, differenceInCalendarDays(fecha, ultima))
  return { valor: Math.round(valor * 1e6) / 1e6, fecha, estimado: true }
}

/** Un recibo vencido se pagaría hoy; uno por vencer, el día de su fecha límite. */
export function fechaPagoEsperada(fechaLimite: string, hoy: string): string {
  return compareDateOnly(fechaLimite, hoy) < 0 ? hoy : fechaLimite
}

/** Valores UDI publicados entre dos fechas (AAAA-MM-DD). */
export async function obtenerValoresUdi(desde: string, hasta: string): Promise<Record<string, number>> {
  const response = await fetch(`/api/udi/?desde=${desde}&hasta=${hasta}`)
  const data = await response.json().catch(() => ({})) as { valores?: Record<string, number>; error?: string }
  if (!response.ok || !data.valores) throw new Error(data.error || 'No fue posible consultar los valores UDI')
  return data.valores
}
