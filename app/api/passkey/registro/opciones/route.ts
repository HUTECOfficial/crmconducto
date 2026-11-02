import { NextResponse, type NextRequest } from 'next/server'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { RP_NAME, crearReto, errorJson, relyingParty } from '@/lib/passkeys-server'

export const dynamic = 'force-dynamic'

/** Opciones para activar Face ID / Touch ID en este dispositivo. */
export async function POST(request: NextRequest) {
  const rp = relyingParty(request)
  if (!rp) return errorJson('Origen no permitido')
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const nombre = typeof body?.nombre === 'string' ? body.nombre.trim() : ''
  if (!email) return errorJson('Falta el correo')

  try {
    const reto = await crearReto()
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: rp.rpID,
      userName: email,
      userDisplayName: nombre || email,
      userID: new TextEncoder().encode(email),
      challenge: reto.challenge,
      attestationType: 'none',
      authenticatorSelection: { authenticatorAttachment: 'platform', residentKey: 'required', userVerification: 'required' },
    })
    return NextResponse.json({ options, retoId: reto.id }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    console.error('Passkey registro/opciones:', error?.message)
    return errorJson('No fue posible preparar Face ID', 500)
  }
}
