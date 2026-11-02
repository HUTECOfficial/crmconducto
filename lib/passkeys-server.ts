import { NextResponse, type NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export const RP_NAME = 'Conducto CRM'

/**
 * Origen y RP ID de la petición. El navegador firma el origen en cada passkey, así que una
 * passkey creada en conductocrm.cloud sólo sirve en conductocrm.cloud.
 */
export function relyingParty(request: NextRequest): { origin: string; rpID: string } | null {
  const origin = request.headers.get('origin')
  const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').split(',')[0].trim()
  if (!origin || !host) return null
  try {
    const url = new URL(origin)
    if (url.host !== host) return null
    return { origin: url.origin, rpID: url.hostname }
  } catch {
    return null
  }
}

/** Reto aleatorio de un solo uso generado y guardado en la base. */
export async function crearReto(): Promise<{ id: string; challenge: string }> {
  const { data, error } = await supabase.rpc('crear_reto_passkey')
  const reto = Array.isArray(data) ? data[0] : data
  if (error || !reto?.id || !reto?.challenge) throw new Error(error?.message || 'No fue posible crear el reto')
  return { id: reto.id, challenge: reto.challenge }
}

/**
 * Consume el reto (se borra al leerlo) y devuelve el valor que el navegador debió firmar:
 * la librería convierte el reto de texto a bytes y lo publica en base64url.
 */
export async function consumirReto(retoId: unknown): Promise<string | null> {
  if (typeof retoId !== 'string' || !retoId) return null
  const { data, error } = await supabase.rpc('consumir_reto_passkey', { p_id: retoId })
  if (error || typeof data !== 'string' || !data) return null
  return Buffer.from(data, 'utf8').toString('base64url')
}

export function errorJson(mensaje: string, status = 400) {
  return NextResponse.json({ error: mensaje }, { status, headers: { 'Cache-Control': 'no-store' } })
}
