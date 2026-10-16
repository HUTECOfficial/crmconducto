import { differenceInCalendarDays, todayDateOnly } from './date-only'

/** Días antes del fin de vigencia en que se empieza a avisar de la renovación. */
export const DIAS_AVISO_RENOVACION = 60
/** Días después del fin de vigencia en que una póliza no renovada se sigue mostrando. */
export const DIAS_SEGUIMIENTO_VENCIDA = 30

export type EstadoRenovacion = 'no_aplica' | 'pendiente' | 'vencida_sin_renovar' | 'en_proceso' | 'renovada'

export interface PolizaRenovable {
  ramo: string
  estatus: string
  renovacionEstado?: string
  renovadaAId?: string
  vigenciaFin: string
  vigenciaProductoFin?: string
}

export interface SituacionRenovacion {
  estado: EstadoRenovacion
  /** Fecha en que la póliza debe renovarse. */
  fecha: string
  dias: number
  /** Sólo las pendientes y vencidas sin renovar generan avisos al cliente. */
  generaAviso: boolean
  prioridad: 'alta' | 'media' | 'baja'
}

const ESTATUS_SIN_RENOVACION = ['cancelada', 'cancelada-cliente', 'cancelada-falta-pago']

/**
 * En Vida la renovación ocurre al terminar la vigencia del producto, no en cada
 * aniversario anual: los años intermedios se cobran con sus recibos.
 */
export function fechaRenovacion(poliza: PolizaRenovable): string {
  return poliza.ramo === 'vida' && poliza.vigenciaProductoFin ? poliza.vigenciaProductoFin : poliza.vigenciaFin
}

export function situacionRenovacion(poliza: PolizaRenovable, hoy = todayDateOnly()): SituacionRenovacion {
  const fecha = fechaRenovacion(poliza)
  const dias = differenceInCalendarDays(fecha, hoy)
  const prioridad = dias <= 7 ? 'alta' : dias <= 30 ? 'media' : 'baja'
  const base = { fecha, dias, prioridad } as const

  if (poliza.estatus === 'renovada' || poliza.renovacionEstado === 'renovada' || poliza.renovadaAId) {
    return { ...base, estado: 'renovada', generaAviso: false }
  }
  if (ESTATUS_SIN_RENOVACION.includes(poliza.estatus) || poliza.renovacionEstado === 'cancelada') {
    return { ...base, estado: 'no_aplica', generaAviso: false }
  }
  if (dias > DIAS_AVISO_RENOVACION || dias < -DIAS_SEGUIMIENTO_VENCIDA) {
    return { ...base, estado: 'no_aplica', generaAviso: false }
  }
  if (poliza.renovacionEstado === 'en_proceso') {
    return { ...base, estado: 'en_proceso', generaAviso: false }
  }
  return { ...base, estado: dias < 0 ? 'vencida_sin_renovar' : 'pendiente', generaAviso: true }
}

export const ETIQUETA_RENOVACION: Record<EstadoRenovacion, string> = {
  no_aplica: 'Sin renovación próxima',
  pendiente: 'Pendiente de renovar',
  vencida_sin_renovar: 'Vencida sin renovar',
  en_proceso: 'Renovación en proceso',
  renovada: 'Renovada',
}
