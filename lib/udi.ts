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
