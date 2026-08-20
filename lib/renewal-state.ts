export type EstadoRenovacion = 'sin_iniciar' | 'pendiente' | 'en_proceso' | 'renovada' | 'cancelada'

export function puedeIniciarRenovacion(estado: EstadoRenovacion): boolean {
  return estado === 'sin_iniciar' || estado === 'pendiente' || estado === 'cancelada'
}

export function iniciarEstadoRenovacion(estado: EstadoRenovacion): EstadoRenovacion {
  if (!puedeIniciarRenovacion(estado)) throw new Error('La renovación no puede iniciarse desde su estado actual')
  return 'en_proceso'
}

export function completarEstadoRenovacion(estado: EstadoRenovacion): EstadoRenovacion {
  if (estado !== 'en_proceso') throw new Error('Sólo una renovación en proceso puede completarse')
  return 'renovada'
}

export function cancelarEstadoRenovacion(estado: EstadoRenovacion): EstadoRenovacion {
  if (estado !== 'pendiente' && estado !== 'en_proceso') throw new Error('No existe una renovación activa para cancelar')
  return 'cancelada'
}
