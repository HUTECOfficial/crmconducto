import { addDaysDateOnly, addMonthsDateOnly, compareDateOnly, differenceInCalendarDays, todayDateOnly } from './date-only'

export type PeriodicidadPago = 'mensual' | 'trimestral' | 'semestral' | 'anual'
export type EstadoRecibo = 'pendiente' | 'pagado' | 'vencido' | 'cancelado'
export type EstadoCobranza = 'pagado' | 'vigente' | 'proximo_vencer' | 'vencido' | 'cancelado'

export interface ReciboExistente {
  id: string
  monto: number
  numeroRecibo: number
  totalRecibos: number
  fechaEmision: string
  fechaLimite: string
  fechaPago?: string
  estatus: EstadoRecibo
}

export interface ReciboProgramado {
  monto: number
  numeroRecibo: number
  totalRecibos: number
  anualidad: number
  fechaEmision: string
  fechaLimite: string
  estatus: 'pendiente'
}

export interface VigenciasPoliza {
  vigenciaAnualFin: string
  vigenciaPagoFin?: string
  vigenciaProductoFin?: string
}

export interface GenerarRecibosInput {
  primaTotal: number
  vigenciaInicio: string
  vigenciaFin: string
  periodicidad: PeriodicidadPago
  primerRecibo?: number
  recibosPagados?: ReciboExistente[]
}

export interface ResumenCobranza {
  estatus: 'pagada' | 'pendiente' | 'vencida' | 'sin_recibos'
  total: number
  cobrado: number
  pendiente: number
  recibosPagados: number
  recibosPendientes: number
  proximoPago?: ReciboExistente
}

const MESES_POR_PERIODICIDAD: Record<PeriodicidadPago, number> = {
  mensual: 1,
  trimestral: 3,
  semestral: 6,
  anual: 12,
}

export function calcularVigenciasPoliza(
  vigenciaInicio: string,
  plazoPagoAnos?: number,
  plazoProductoAnos?: number,
): VigenciasPoliza {
  const vigenciaAnualFin = addMonthsDateOnly(vigenciaInicio, 12)
  if (plazoPagoAnos === undefined && plazoProductoAnos === undefined) return { vigenciaAnualFin }
  if (!Number.isInteger(plazoPagoAnos) || Number(plazoPagoAnos) < 1) throw new Error('La vigencia de pago debe ser un número entero mayor a 0')
  if (!Number.isInteger(plazoProductoAnos) || Number(plazoProductoAnos) < 1) throw new Error('La vigencia del producto debe ser un número entero mayor a 0')
  if (Number(plazoPagoAnos) > Number(plazoProductoAnos)) throw new Error('La vigencia de pago no puede ser mayor que la vigencia del producto')

  return {
    vigenciaAnualFin,
    vigenciaPagoFin: addMonthsDateOnly(vigenciaInicio, Number(plazoPagoAnos) * 12),
    vigenciaProductoFin: addMonthsDateOnly(vigenciaInicio, Number(plazoProductoAnos) * 12),
  }
}

export function calcularPrimaTotalPlazo(primaAnual: number, plazoPagoAnos?: number): number {
  if (!Number.isFinite(primaAnual) || primaAnual < 0) throw new Error('La prima anual debe ser un importe válido')
  const anos = plazoPagoAnos === undefined ? 1 : plazoPagoAnos
  if (!Number.isInteger(anos) || anos < 1) throw new Error('La vigencia de pago debe ser un número entero mayor a 0')
  return Math.round(primaAnual * anos * 100) / 100
}

export function calcularMontoMxnUdis(montoUdis: number, valorUdi: number): number {
  if (!Number.isFinite(montoUdis) || montoUdis <= 0) throw new Error('El monto en UDIS debe ser mayor a 0')
  if (!Number.isFinite(valorUdi) || valorUdi <= 0) throw new Error('El valor UDI debe ser mayor a 0')
  return Math.round(montoUdis * valorUdi * 100) / 100
}

function toCents(value: number): number {
  return Math.round(value * 100)
}

function fromCents(value: number): number {
  return value / 100
}

function distributeAmount(total: number, count: number, firstAmount?: number): number[] {
  if (count <= 0) return []
  const totalCents = toCents(Math.max(0, total))
  const requestedFirst = firstAmount === undefined ? undefined : toCents(Math.max(0, firstAmount))
  if (requestedFirst !== undefined && requestedFirst > totalCents) throw new Error('El primer recibo no puede ser mayor que la prima total')
  const firstCents = requestedFirst === undefined ? Math.floor(totalCents / count) : requestedFirst
  if (count === 1) return [fromCents(totalCents)]

  const remainingCents = totalCents - firstCents
  const base = Math.floor(remainingCents / (count - 1))
  const amounts = [firstCents, ...Array.from({ length: count - 1 }, () => base)]
  amounts[amounts.length - 1] += totalCents - amounts.reduce((sum, amount) => sum + amount, 0)
  return amounts.map(fromCents)
}

export function fechasEmisionPorPeriodicidad(
  vigenciaInicio: string,
  vigenciaFin: string,
  periodicidad: PeriodicidadPago,
): string[] {
  if (compareDateOnly(vigenciaInicio, vigenciaFin) >= 0) {
    throw new Error('La vigencia final debe ser posterior a la vigencia inicial')
  }

  const fechas: string[] = []
  const meses = MESES_POR_PERIODICIDAD[periodicidad]
  let fecha = vigenciaInicio
  let guard = 0

  while (compareDateOnly(fecha, vigenciaFin) < 0 && guard < 1_200) {
    fechas.push(fecha)
    fecha = addMonthsDateOnly(vigenciaInicio, meses * fechas.length)
    guard++
  }

  return fechas
}

export function generarRecibos(input: GenerarRecibosInput): ReciboProgramado[] {
  if (!Number.isFinite(input.primaTotal) || input.primaTotal < 0) {
    throw new Error('La prima total debe ser un importe válido')
  }

  const pagados = [...(input.recibosPagados || [])]
    .filter(recibo => recibo.estatus === 'pagado')
    .sort((left, right) => left.numeroRecibo - right.numeroRecibo)
  const cobrado = pagados.reduce((sum, recibo) => sum + recibo.monto, 0)
  const saldo = Math.max(0, Math.round((input.primaTotal - cobrado) * 100) / 100)
  if (saldo === 0) return []

  const fechasBase = fechasEmisionPorPeriodicidad(input.vigenciaInicio, input.vigenciaFin, input.periodicidad)
  const totalObjetivo = Math.max(fechasBase.length, pagados.length + 1)
  const pendientesCantidad = Math.max(1, totalObjetivo - pagados.length)
  const montos = distributeAmount(
    saldo,
    pendientesCantidad,
    pagados.length === 0 ? input.primerRecibo : undefined,
  )
  const meses = MESES_POR_PERIODICIDAD[input.periodicidad]

  return montos.map((monto, index) => {
    const numeroRecibo = pagados.length + index + 1
    const fechaEmision = fechasBase[numeroRecibo - 1]
      || addMonthsDateOnly(input.vigenciaInicio, meses * (numeroRecibo - 1))

    return {
      monto,
      numeroRecibo,
      totalRecibos: pagados.length + pendientesCantidad,
      anualidad: Math.floor(((numeroRecibo - 1) * meses) / 12) + 1,
      fechaEmision,
      fechaLimite: addDaysDateOnly(fechaEmision, 30),
      estatus: 'pendiente',
    }
  })
}

export function estadoCobranzaRecibo(
  recibo: Pick<ReciboExistente, 'estatus' | 'fechaLimite'>,
  hoy = todayDateOnly(),
  diasProximoVencimiento = 7,
): EstadoCobranza {
  if (recibo.estatus === 'pagado' || recibo.estatus === 'cancelado') return recibo.estatus
  const dias = differenceInCalendarDays(recibo.fechaLimite, hoy)
  if (dias < 0) return 'vencido'
  if (dias <= diasProximoVencimiento) return 'proximo_vencer'
  return 'vigente'
}

export function resumirCobranza(recibos: ReciboExistente[], primaTotal: number, hoy = todayDateOnly()): ResumenCobranza {
  const activos = recibos.filter(recibo => recibo.estatus !== 'cancelado')
  if (activos.length === 0) {
    return { estatus: 'sin_recibos', total: primaTotal, cobrado: 0, pendiente: primaTotal, recibosPagados: 0, recibosPendientes: 0 }
  }

  const pagados = activos.filter(recibo => recibo.estatus === 'pagado')
  const pendientes = activos.filter(recibo => recibo.estatus !== 'pagado')
  const cobrado = pagados.reduce((sum, recibo) => sum + recibo.monto, 0)
  const pendiente = pendientes.reduce((sum, recibo) => sum + recibo.monto, 0)
  const proximoPago = [...pendientes].sort((left, right) => left.fechaLimite.localeCompare(right.fechaLimite))[0]
  const tieneVencidos = pendientes.some(recibo => estadoCobranzaRecibo(recibo, hoy) === 'vencido')

  return {
    estatus: pendientes.length === 0 ? 'pagada' : tieneVencidos ? 'vencida' : 'pendiente',
    total: primaTotal,
    cobrado,
    pendiente,
    recibosPagados: pagados.length,
    recibosPendientes: pendientes.length,
    proximoPago,
  }
}
