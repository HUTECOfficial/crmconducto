"use client"

import { startAuthentication, startRegistration } from '@simplewebauthn/browser'

const CLAVE_DISPOSITIVO = 'crm-faceid'

/** Face ID / Touch ID / Windows Hello disponible en este dispositivo y navegador. */
export async function dispositivoSoportaFaceId(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

/** Correos con Face ID activado en este dispositivo (sólo para decidir qué ofrecer en pantalla). */
export function correosConFaceId(): string[] {
  try {
    const valor = JSON.parse(localStorage.getItem(CLAVE_DISPOSITIVO) || '[]')
    return Array.isArray(valor) ? valor.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function recordarCorreo(email: string) {
  try {
    const correos = new Set(correosConFaceId())
    correos.add(email.toLowerCase())
    localStorage.setItem(CLAVE_DISPOSITIVO, JSON.stringify([...correos]))
  } catch {
    // Sin almacenamiento local sólo se deja de ofrecer el botón automáticamente.
  }
}

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'No fue posible completar Face ID')
  return data
}

function nombreDispositivo() {
  const ua = navigator.userAgent
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua)) return 'iPad'
  if (/Macintosh/.test(ua)) return 'Mac'
  if (/Android/.test(ua)) return 'Android'
  if (/Windows/.test(ua)) return 'Windows'
  return 'Otro dispositivo'
}

/** Activa Face ID para este usuario en este dispositivo; requiere la contraseña recién escrita. */
export async function activarFaceId(email: string, password: string, nombre?: string) {
  const { options, retoId } = await postJson('/api/passkey/registro/opciones/', { email, nombre })
  const response = await startRegistration({ optionsJSON: options })
  await postJson('/api/passkey/registro/verificar/', { email, password, retoId, response, dispositivo: nombreDispositivo() })
  recordarCorreo(email)
}

/** Pide Face ID y devuelve el correo del usuario verificado por el servidor. */
export async function ingresarConFaceId(): Promise<string> {
  const { options, retoId } = await postJson('/api/passkey/ingreso/opciones/', {})
  const response = await startAuthentication({ optionsJSON: options })
  const { email } = await postJson('/api/passkey/ingreso/verificar/', { retoId, response })
  recordarCorreo(email)
  return email
}

/** El usuario canceló el diálogo de Face ID: no se muestra como error. */
export function faceIdCancelado(error: unknown) {
  return error instanceof Error && (error.name === 'NotAllowedError' || error.name === 'AbortError')
}
