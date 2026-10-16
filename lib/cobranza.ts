import { differenceInCalendarDays, todayDateOnly } from './date-only'
import { reciboPorCobrar, resumirCobranza, type ReciboExistente } from './payment-schedule'

/**
 * Semáforo de vencimiento de Cobranza → Pólizas pendientes.
 * - morado: hay un pago registrado pendiente de validar (sin importar los días)
 * - rojo: 0 a 5 días, o ya vencido
 * - naranja: 6 a 9 días
 * - amarillo: 10 a 15 días
 * - verde: 16 a 30 días
 * - sin_color: más de 30 días o sin saldo
 */
export type NivelSemaforo = 'morado' | 'rojo' | 'naranja' | 'amarillo' | 'verde' | 'sin_color'

export type EstadoCobranzaPoliza = 'pagada' | 'por_validar' | 'pendiente' | 'vencida'

export interface SituacionCobranzaPoliza<R extends ReciboExistente = ReciboExistente> {
  estado: EstadoCobranzaPoliza
  semaforo: NivelSemaforo
  /** Recibo que sigue: el primero por cobrar o, si no hay, el primero por validar. */
  reciboActual?: R
  fechaVencimiento?: string
  diasRestantes?: number
  total: number
  cobrado: number
  porValidar: number
  pendiente: number
  tieneRecibos: boolean
}

export function nivelSemaforo(diasRestantes: number | undefined, tienePagoPorValidar: boolean): NivelSemaforo {
  if (tienePagoPorValidar) return 'morado'
  if (diasRestantes === undefined) return 'sin_color'
  if (diasRestantes <= 5) return 'rojo'
  if (diasRestantes <= 9) return 'naranja'
  if (diasRestantes <= 15) return 'amarillo'
  if (diasRestantes <= 30) return 'verde'
  return 'sin_color'
}

interface DatosPolizaSinRecibos {
  primaTotal: number
  primaCobrada: number
  fechaVencimiento?: string
}

/**
 * Situación de cobranza calculada desde los recibos. Sólo las pólizas antiguas sin
 * recibos generados recurren a primaTotal - primaCobrada.
 */
export function situacionCobranzaPoliza<R extends ReciboExistente>(
  recibos: R[],
  poliza: DatosPolizaSinRecibos,
  hoy = todayDateOnly(),
): SituacionCobranzaPoliza<R> {
  const activos = recibos.filter(recibo => recibo.estatus !== 'cancelado')

  if (activos.length === 0) {
    const pendiente = Math.max(0, Math.round((poliza.primaTotal - poliza.primaCobrada) * 100) / 100)
    const diasRestantes = pendiente > 0 && poliza.fechaVencimiento ? differenceInCalendarDays(poliza.fechaVencimiento, hoy) : undefined
    return {
      estado: pendiente === 0 ? 'pagada' : diasRestantes !== undefined && diasRestantes < 0 ? 'vencida' : 'pendiente',
      semaforo: pendiente === 0 ? 'sin_color' : nivelSemaforo(diasRestantes, false),
      fechaVencimiento: pendiente > 0 ? poliza.fechaVencimiento : undefined,
      diasRestantes,
      total: poliza.primaTotal,
      cobrado: Math.min(poliza.primaCobrada, poliza.primaTotal),
      porValidar: 0,
      pendiente,
      tieneRecibos: false,
    }
  }

  const resumen = resumirCobranza(activos, poliza.primaTotal, hoy)
  const porFecha = (left: R, right: R) => left.fechaLimite.localeCompare(right.fechaLimite)
  const reciboActual = activos.filter(reciboPorCobrar).sort(porFecha)[0]
    ?? activos.filter(recibo => recibo.estatus === 'por_validar').sort(porFecha)[0]
  const diasRestantes = reciboActual ? differenceInCalendarDays(reciboActual.fechaLimite, hoy) : undefined
  const estado: EstadoCobranzaPoliza = resumen.estatus === 'sin_recibos' ? 'pendiente' : resumen.estatus

  return {
    estado,
    semaforo: estado === 'pagada' ? 'sin_color' : nivelSemaforo(diasRestantes, resumen.recibosPorValidar > 0),
    reciboActual,
    fechaVencimiento: reciboActual?.fechaLimite,
    diasRestantes,
    total: poliza.primaTotal,
    cobrado: resumen.cobrado,
    porValidar: resumen.porValidar,
    pendiente: resumen.pendiente,
    tieneRecibos: true,
  }
}

/** Orden de atención: lo más próximo a vencer (o más vencido) primero; lo pagado al final. */
export function compararPorVencimiento(left: SituacionCobranzaPoliza, right: SituacionCobranzaPoliza): number {
  if (!left.fechaVencimiento && !right.fechaVencimiento) return 0
  if (!left.fechaVencimiento) return 1
  if (!right.fechaVencimiento) return -1
  return left.fechaVencimiento.localeCompare(right.fechaVencimiento)
}
