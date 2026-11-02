import { NextResponse, type NextRequest } from 'next/server'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { supabase } from '@/lib/supabase'
import { consumirReto, errorJson, relyingParty } from '@/lib/passkeys-server'

export const dynamic = 'force-dynamic'

/** Verifica la passkey recién creada y la guarda; registrar exige la contraseña del usuario. */
export async function POST(request: NextRequest) {
  const rp = relyingParty(request)
  if (!rp) return errorJson('Origen no permitido')
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!email || !password || !body?.response) return errorJson('Datos incompletos')

  const expectedChallenge = await consumirReto(body.retoId)
  if (!expectedChallenge) return errorJson('El intento expiró; vuelve a intentarlo')

  try {
    const verificacion = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      requireUserVerification: true,
    })
    if (!verificacion.verified || !verificacion.registrationInfo) return errorJson('No se pudo verificar Face ID')

    const { credential } = verificacion.registrationInfo
    const { data, error } = await supabase.rpc('registrar_passkey', {
      p_email: email,
      p_password: password,
      p_credential_id: credential.id,
      p_public_key: Buffer.from(credential.publicKey).toString('base64url'),
      p_counter: credential.counter,
      p_transports: credential.transports ?? [],
      p_dispositivo: typeof body.dispositivo === 'string' ? body.dispositivo.slice(0, 120) : null,
    })
    if (error) throw error
    if (data !== true) return errorJson('Contraseña incorrecta', 401)
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    console.error('Passkey registro/verificar:', error?.message)
    return errorJson('No fue posible activar Face ID', 500)
  }
}
