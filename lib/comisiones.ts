/**
 * Comisiones: una por cada recibo validado de una póliza con % de comisión.
 * - pendiente: generada al validar el pago del recibo; falta que la aseguradora la pague
 * - pagada: la aseguradora ya la pagó
 * - cancelada: el pago del recibo se anuló antes de cobrar la comisión
 * - por_revertir: el pago se anuló pero la comisión ya estaba pagada; requiere ajuste
 */
export type EstadoComision = 'pendiente' | 'pagada' | 'cancelada' | 'por_revertir'

export interface ReciboComisionable {
  moneda: string
  monto: number
  montoMxn?: number
}

/** Base de la comisión en MXN: el importe convertido si el recibo es en UDIS. */
export function baseComisionRecibo(recibo: ReciboComisionable): number {
  if (recibo.moneda !== 'MXN' && recibo.moneda !== 'UDIS') {
    throw new Error(`Los recibos en ${recibo.moneda} no tienen conversión a MXN para calcular la comisión`)
  }
  const base = recibo.moneda === 'UDIS' ? recibo.montoMxn : recibo.monto
  if (base === undefined || !Number.isFinite(base) || base <= 0) {
    throw new Error('El recibo no tiene un importe en MXN para calcular la comisión')
  }
  return Math.round(base * 100) / 100
}

export function calcularComision(base: number, porcentaje: number): number {
  if (!Number.isFinite(porcentaje) || porcentaje < 0 || porcentaje > 100) {
    throw new Error('El porcentaje de comisión debe estar entre 0 y 100')
  }
  return Math.round(base * porcentaje) / 100
}

/** Estado al que pasa una comisión cuando se anula el pago de su recibo. */
export function estadoComisionAlAnularPago(estado: EstadoComision): EstadoComision {
  if (estado === 'pendiente') return 'cancelada'
  if (estado === 'pagada') return 'por_revertir'
  return estado
}

export interface ResumenComisiones {
  pendiente: number
  pagada: number
  porRevertir: number
  total: number
}

export function resumirComisiones(comisiones: Array<{ monto: number; estatus: EstadoComision }>): ResumenComisiones {
  const sumar = (estado: EstadoComision) => Math.round(
    comisiones.filter(item => item.estatus === estado).reduce((sum, item) => sum + item.monto, 0) * 100,
  ) / 100
  const pendiente = sumar('pendiente')
  const pagada = sumar('pagada')
  return { pendiente, pagada, porRevertir: sumar('por_revertir'), total: Math.round((pendiente + pagada) * 100) / 100 }
}
