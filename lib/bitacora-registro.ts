import { supabase } from '@/lib/supabase'

const ultimasConsultas = new Map<string, number>()
const VENTANA_REPETIDA_MS = 60_000

/**
 * Anota una consulta o un evento de sesión. Las altas, cambios y bajas no pasan por aquí:
 * los registra la base con triggers. Nunca interrumpe la operación si falla.
 */
export async function registrarEnBitacora(entrada: {
  accion: 'consulta' | 'sesion'
  entidad: string
  entidadId?: string
  etiqueta?: string
  polizaId?: string
  polizaNumero?: string
  clienteId?: string
  clienteNombre?: string
  descripcion: string
  ruta?: string
}) {
  // Recargar la misma pantalla o reabrir la misma póliza en menos de un minuto cuenta una vez.
  const clave = `${entrada.accion}|${entrada.entidad}|${entrada.entidadId || ''}|${entrada.ruta || ''}|${entrada.descripcion}`
  const ahora = Date.now()
  if (entrada.accion === 'consulta' && ahora - (ultimasConsultas.get(clave) || 0) < VENTANA_REPETIDA_MS) return
  ultimasConsultas.set(clave, ahora)

  const { error } = await supabase.from('bitacora').insert([{
    accion: entrada.accion,
    entidad: entrada.entidad,
    entidad_id: entrada.entidadId || null,
    etiqueta: entrada.etiqueta || null,
    poliza_id: entrada.polizaId || null,
    poliza_numero: entrada.polizaNumero || null,
    cliente_id: entrada.clienteId || null,
    cliente_nombre: entrada.clienteNombre || null,
    descripcion: entrada.descripcion,
    ruta: entrada.ruta || null,
    origen: 'app',
  }])
  if (error) console.warn('No se pudo anotar en la bitácora:', error.message)
}
