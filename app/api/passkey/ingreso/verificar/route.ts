import { NextResponse, type NextRequest } from 'next/server'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import { supabase } from '@/lib/supabase'
import { consumirReto, errorJson, relyingParty } from '@/lib/passkeys-server'

export const dynamic = 'force-dynamic'

/** Verifica la firma de Face ID con la llave pública guardada y devuelve a quién pertenece. */
export async function POST(request: NextRequest) {
  const rp = relyingParty(request)
  if (!rp) return errorJson('Origen no permitido')
  const body = await request.json().catch(() => null)
  const credentialId = typeof body?.response?.id === 'string' ? body.response.id : ''
  if (!credentialId) return errorJson('Datos incompletos')

  const expectedChallenge = await consumirReto(body.retoId)
  if (!expectedChallenge) return errorJson('El intento expiró; vuelve a intentarlo')

  try {
    const { data, error } = await supabase.rpc('obtener_passkey', { p_credential_id: credentialId })
    if (error) throw error
    const guardada = Array.isArray(data) ? data[0] : data
    if (!guardada?.public_key) return errorJson('Este dispositivo no tiene Face ID activado para ningún usuario', 404)

    const verificacion = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      requireUserVerification: true,
      credential: {
        id: credentialId,
        publicKey: new Uint8Array(Buffer.from(guardada.public_key, 'base64url')),
        counter: Number(guardada.counter || 0),
        transports: guardada.transports ?? undefined,
      },
    })
    if (!verificacion.verified) return errorJson('No se pudo verificar Face ID', 401)

    await supabase.rpc('actualizar_uso_passkey', { p_credential_id: credentialId, p_counter: verificacion.authenticationInfo.newCounter })
    return NextResponse.json({ email: guardada.email }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    console.error('Passkey ingreso/verificar:', error?.message)
    return errorJson('No se pudo verificar Face ID', 401)
  }
}
