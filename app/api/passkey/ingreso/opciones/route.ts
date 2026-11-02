import { NextResponse, type NextRequest } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { crearReto, errorJson, relyingParty } from '@/lib/passkeys-server'

export const dynamic = 'force-dynamic'

/** Opciones para entrar con Face ID / Touch ID; el dispositivo elige la passkey guardada. */
export async function POST(request: NextRequest) {
  const rp = relyingParty(request)
  if (!rp) return errorJson('Origen no permitido')
  try {
    const reto = await crearReto()
    const options = await generateAuthenticationOptions({
      rpID: rp.rpID,
      challenge: reto.challenge,
      userVerification: 'required',
    })
    return NextResponse.json({ options, retoId: reto.id }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    console.error('Passkey ingreso/opciones:', error?.message)
    return errorJson('No fue posible preparar Face ID', 500)
  }
}
