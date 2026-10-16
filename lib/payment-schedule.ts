import { addDaysDateOnly, addMonthsDateOnly, compareDateOnly, differenceInCalendarDays, todayDateOnly } from './date-only'

export type PeriodicidadPago = 'mensual' | 'trimestral' | 'semestral' | 'anual'
export type EstadoRecibo = 'pendiente' | 'por_validar' | 'pagado' | 'vencido' | 'cancelado'
export type EstadoCobranza = 'pagado' | 'por_validar' | 'vigente' | 'proximo_vencer' | 'vencido' | 'cancelado'

/** Recibos que ya no deben regenerarse: cobrados o con un pago registrado en espera de validación. */
export function reciboComprometido(recibo: Pick<ReciboExistente, 'estatus'>): boolean {
  return recibo.estatus === 'pagado' || recibo.estatus === 'por_validar'
}

/** Recibos que todavía requieren que el cliente pague. */
export function reciboPorCobrar(recibo: Pick<ReciboExistente, 'estatus'>): boolean {
  return recibo.estatus === 'pendiente' || recibo.estatus === 'vencido'
}

export const DIAS_GRACIA_DEFAULT = 30

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
  /** Prima de cada anualidad. En Vida se distribuye cada anualidad por separado. */
  primaAnual?: number
  vigenciaInicio: string
  vigenciaFin: string
  periodicidad: PeriodicidadPago
  primerRecibo?: number
  /** Recibos cobrados o por validar; se conservan intactos. */
  recibosPagados?: ReciboExistente[]
  diasGraciaPrimerRecibo?: number
  diasGraciaSubsecuentes?: number
}

export interface ResumenCobranza {
  estatus: 'pagada' | 'por_validar' | 'pendiente' | 'vencida' | 'sin_recibos'
  total: number
  cobrado: number
  pendiente: number
  porValidar: number
  recibosPagados: number
  recibosPendientes: number
  recibosPorValidar: number
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
    .filter(reciboComprometido)
    .sort((left, right) => left.numeroRecibo - right.numeroRecibo)
  const cobrado = pagados.reduce((sum, recibo) => sum + recibo.monto, 0)
  const saldo = Math.max(0, Math.round((input.primaTotal - cobrado) * 100) / 100)
  if (saldo === 0) return []

  const fechasBase = fechasEmisionPorPeriodicidad(input.vigenciaInicio, input.vigenciaFin, input.periodicidad)
  const totalObjetivo = Math.max(fechasBase.length, pagados.length + 1)
  const meses = MESES_POR_PERIODICIDAD[input.periodicidad]
  const usaPrimaAnual = input.primaAnual !== undefined
  if (usaPrimaAnual && (!Number.isFinite(input.primaAnual) || Number(input.primaAnual) < 0)) {
    throw new Error('La prima anual debe ser un importe válido')
  }

  // Vida se cobra por anualidades: cada anualidad descuenta su primer recibo
  // y distribuye el remanente entre sus recibos subsecuentes.
  const montosPlaneados = usaPrimaAnual
    ? fechasBase.map((_, index) => {
        const anualidad = Math.floor((index * meses) / 12) + 1
        const indicesAnualidad = fechasBase
          .map((__, candidate) => candidate)
          .filter(candidate => Math.floor((candidate * meses) / 12) + 1 === anualidad)
        const posicionAnual = indicesAnualidad.indexOf(index)
        return distributeAmount(Number(input.primaAnual), indicesAnualidad.length, input.primerRecibo)[posicionAnual]
      })
    : distributeAmount(input.primaTotal, totalObjetivo, input.primerRecibo)
  const pendientesCantidad = Math.max(1, totalObjetivo - pagados.length)
  const montos = montosPlaneados.slice(pagados.length, pagados.length + pendientesCantidad)
  // Las modificaciones nunca alteran recibos cobrados; su diferencia se ajusta
  // en el último recibo pendiente para que el saldo siempre cuadre.
  const diferenciaSaldo = Math.round((saldo - montos.reduce((sum, monto) => sum + monto, 0)) * 100) / 100
  if (montos.length > 0) montos[montos.length - 1] = Math.round((montos[montos.length - 1] + diferenciaSaldo) * 100) / 100

  const diasGracia = (numeroRecibo: number) => {
    const dias = numeroRecibo === 1 ? input.diasGraciaPrimerRecibo : input.diasGraciaSubsecuentes
    return Number.isInteger(dias) && Number(dias) >= 0 ? Number(dias) : DIAS_GRACIA_DEFAULT
  }

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
      fechaLimite: addDaysDateOnly(fechaEmision, diasGracia(numeroRecibo)),
      estatus: 'pendiente',
    }
  })
}

export function estadoCobranzaRecibo(
  recibo: Pick<ReciboExistente, 'estatus' | 'fechaLimite'>,
  hoy = todayDateOnly(),
  diasProximoVencimiento = 7,
): EstadoCobranza {
  if (recibo.estatus === 'pagado' || recibo.estatus === 'cancelado' || recibo.estatus === 'por_validar') return recibo.estatus
  const dias = differenceInCalendarDays(recibo.fechaLimite, hoy)
  if (dias < 0) return 'vencido'
  if (dias <= diasProximoVencimiento) return 'proximo_vencer'
  return 'vigente'
}

export function resumirCobranza(recibos: ReciboExistente[], primaTotal: number, hoy = todayDateOnly()): ResumenCobranza {
  const activos = recibos.filter(recibo => recibo.estatus !== 'cancelado')
  if (activos.length === 0) {
    return { estatus: 'sin_recibos', total: primaTotal, cobrado: 0, pendiente: primaTotal, porValidar: 0, recibosPagados: 0, recibosPendientes: 0, recibosPorValidar: 0 }
  }

  const sumar = (items: ReciboExistente[]) => Math.round(items.reduce((sum, recibo) => sum + recibo.monto, 0) * 100) / 100
  const pagados = activos.filter(recibo => recibo.estatus === 'pagado')
  const porValidar = activos.filter(recibo => recibo.estatus === 'por_validar')
  const pendientes = activos.filter(reciboPorCobrar)
  const proximoPago = [...pendientes, ...porValidar].sort((left, right) => left.fechaLimite.localeCompare(right.fechaLimite))[0]
  const tieneVencidos = pendientes.some(recibo => estadoCobranzaRecibo(recibo, hoy) === 'vencido')

  return {
    estatus: tieneVencidos ? 'vencida' : pendientes.length > 0 ? 'pendiente' : porValidar.length > 0 ? 'por_validar' : 'pagada',
    total: primaTotal,
    cobrado: sumar(pagados),
    pendiente: sumar(pendientes),
    porValidar: sumar(porValidar),
    recibosPagados: pagados.length,
    recibosPendientes: pendientes.length,
    recibosPorValidar: porValidar.length,
    proximoPago,
  }
}
