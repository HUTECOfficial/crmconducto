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
  /** Periodicidad con la que se generaron los recibos pagados (respaldo para saber hasta dónde cubren). */
  periodicidadPagados?: PeriodicidadPago
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

/** Meses completos entre dos fechas (cuántas veces cabe un mes desde `inicio` sin pasar de `fin`). */
function mesesEntre(inicio: string, fin: string): number {
  let meses = 0
  while (meses < 1_200 && compareDateOnly(addMonthsDateOnly(inicio, meses + 1), fin) <= 0) meses++
  return meses
}

/** Reparte un total en centavos proporcionalmente a los pesos; el último absorbe el redondeo. */
function distributeByWeights(total: number, weights: number[]): number[] {
  if (weights.length === 0) return []
  const totalCents = toCents(Math.max(0, total))
  const sumWeights = weights.reduce((sum, weight) => sum + weight, 0)
  const amounts = weights.map(weight => Math.floor((totalCents * weight) / sumWeights))
  amounts[amounts.length - 1] += totalCents - amounts.reduce((sum, amount) => sum + amount, 0)
  return amounts.map(fromCents)
}

/**
 * Fecha hasta la que cubren los recibos ya pagados (o por validar). Se deduce del propio
 * calendario de esos recibos: la separación entre los dos últimos del mismo calendario, o el
 * plazo dividido entre su total de recibos; si no se puede, la periodicidad con que se generaron.
 */
function finCoberturaPagados(pagados: ReciboExistente[], input: GenerarRecibosInput): string | undefined {
  const ultimo = pagados[pagados.length - 1]
  if (!ultimo) return undefined
  const penultimo = pagados[pagados.length - 2]
  let meses = penultimo && penultimo.totalRecibos === ultimo.totalRecibos ? mesesEntre(penultimo.fechaEmision, ultimo.fechaEmision) : 0
  if (!meses) {
    const plazo = mesesEntre(input.vigenciaInicio, input.vigenciaFin)
    if (ultimo.totalRecibos > 0 && plazo > 0 && plazo % ultimo.totalRecibos === 0) meses = plazo / ultimo.totalRecibos
  }
  if (!meses) meses = MESES_POR_PERIODICIDAD[input.periodicidadPagados ?? input.periodicidad]
  return addMonthsDateOnly(ultimo.fechaEmision, meses)
}

export function generarRecibos(input: GenerarRecibosInput): ReciboProgramado[] {
  if (!Number.isFinite(input.primaTotal) || input.primaTotal < 0) {
    throw new Error('La prima total debe ser un importe válido')
  }
  const usaPrimaAnual = input.primaAnual !== undefined
  if (usaPrimaAnual && (!Number.isFinite(input.primaAnual) || Number(input.primaAnual) < 0)) {
    throw new Error('La prima anual debe ser un importe válido')
  }
  if (compareDateOnly(input.vigenciaInicio, input.vigenciaFin) >= 0) {
    throw new Error('La vigencia final debe ser posterior a la vigencia inicial')
  }

  const pagados = [...(input.recibosPagados || [])]
    .filter(reciboComprometido)
    .sort((left, right) => left.numeroRecibo - right.numeroRecibo)
  const cobrado = pagados.reduce((sum, recibo) => sum + recibo.monto, 0)
  const saldo = Math.max(0, Math.round((input.primaTotal - cobrado) * 100) / 100)
  if (saldo === 0) return []

  // Los recibos pagados se respetan tal cual: los nuevos empiezan donde termina lo ya cubierto
  // y la nueva periodicidad sólo aplica al tiempo restante de la vigencia.
  const meses = MESES_POR_PERIODICIDAD[input.periodicidad]
  const finCobertura = finCoberturaPagados(pagados, input)
  const inicioPendiente = finCobertura ?? input.vigenciaInicio
  const fechas: string[] = []
  while (fechas.length < 1_200 && compareDateOnly(addMonthsDateOnly(inicioPendiente, meses * fechas.length), input.vigenciaFin) < 0) {
    fechas.push(addMonthsDateOnly(inicioPendiente, meses * fechas.length))
  }
  // Si la prima aumentó con todo el plazo ya cubierto, el ajuste va en un recibo adicional.
  if (fechas.length === 0) fechas.push(pagados[pagados.length - 1]?.fechaEmision ?? input.vigenciaInicio)

  const mesesCubiertos = fechas.map(fecha => {
    const fin = addMonthsDateOnly(fecha, meses)
    return Math.max(1, mesesEntre(fecha, compareDateOnly(fin, input.vigenciaFin) > 0 ? input.vigenciaFin : fin))
  })
  const anualidadDe = (fecha: string) => Math.floor(mesesEntre(input.vigenciaInicio, fecha) / 12) + 1

  let montos: number[]
  if (usaPrimaAnual) {
    // Vida se cobra por anualidades: cada año restante es su prima anual repartida entre sus
    // recibos (el primero puede ser distinto si se capturó "primer recibo").
    montos = new Array(fechas.length).fill(0)
    const grupos = new Map<number, number[]>()
    fechas.forEach((fecha, index) => grupos.set(anualidadDe(fecha), [...(grupos.get(anualidadDe(fecha)) || []), index]))
    for (const indices of grupos.values()) {
      const mesesGrupo = Math.min(12, indices.reduce((sum, index) => sum + mesesCubiertos[index], 0))
      const montoGrupo = Number(input.primaAnual) * mesesGrupo / 12
      const usaPrimerRecibo = input.primerRecibo !== undefined && input.primerRecibo > 0 && indices.length > 1 && mesesGrupo === 12 && input.primerRecibo < montoGrupo
      const reparto = usaPrimerRecibo
        ? distributeAmount(montoGrupo, indices.length, input.primerRecibo)
        : distributeByWeights(montoGrupo, indices.map(index => mesesCubiertos[index]))
      indices.forEach((index, position) => { montos[index] = reparto[position] })
    }
  } else if (pagados.length === 0) {
    montos = distributeAmount(input.primaTotal, fechas.length, input.primerRecibo)
  } else {
    // Con recibos ya pagados, el saldo se reparte según los meses que cubre cada recibo restante.
    montos = distributeByWeights(saldo, mesesCubiertos)
  }

  // Si la prima cambió, la diferencia se reparte entre todos los recibos pendientes
  // (el último absorbe los centavos) para que el saldo cuadre.
  const diferenciaCents = toCents(saldo) - montos.reduce((sum, monto) => sum + toCents(monto), 0)
  if (montos.length > 0 && diferenciaCents !== 0) {
    const ajusteBase = Math.trunc(diferenciaCents / montos.length)
    const ajustes = montos.map(() => ajusteBase)
    ajustes[ajustes.length - 1] += diferenciaCents - ajusteBase * montos.length
    montos = montos.map((monto, index) => fromCents(toCents(monto) + ajustes[index]))
    if (montos.some(monto => monto < 0)) throw new Error('El saldo no alcanza para los recibos pendientes; revisa la prima y el primer recibo')
  }

  const diasGracia = (numeroRecibo: number) => {
    const dias = numeroRecibo === 1 ? input.diasGraciaPrimerRecibo : input.diasGraciaSubsecuentes
    return Number.isInteger(dias) && Number(dias) >= 0 ? Number(dias) : DIAS_GRACIA_DEFAULT
  }

  return montos.map((monto, index) => {
    const numeroRecibo = pagados.length + index + 1
    const fechaEmision = fechas[index]
    return {
      monto,
      numeroRecibo,
      totalRecibos: pagados.length + fechas.length,
      anualidad: anualidadDe(fechaEmision),
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
