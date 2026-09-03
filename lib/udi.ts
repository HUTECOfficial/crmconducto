export interface ValorUdiActual {
  valor: number
  fecha: string | null
  fuente: string
}

export async function obtenerValorUdiActual(): Promise<ValorUdiActual> {
  const response = await fetch('/api/udi')
  if (!response.ok) throw new Error('No fue posible consultar el valor UDI actual')
  const data = await response.json() as ValorUdiActual
  if (!Number.isFinite(data.valor) || data.valor <= 0) throw new Error('Banco de México no devolvió un valor UDI válido')
  return data
}
