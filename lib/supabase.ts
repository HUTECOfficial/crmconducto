import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Usuario con sesión abierta. Viaja en cada petición para que los triggers de la
// bitácora (supabase-bitacora.sql) sepan quién hizo cada cambio.
let usuarioBitacora: string | null = null

export function setUsuarioBitacora(email: string | null) {
  usuarioBitacora = email
}

// Sólo a la API de datos (/rest/v1), que es donde corren los triggers.
const fetchConUsuario: typeof fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  if (!usuarioBitacora || !url.includes('/rest/v1/')) return fetch(input, init)
  const headers = new Headers(init?.headers)
  headers.set('x-crm-usuario', usuarioBitacora)
  if (typeof window !== 'undefined') headers.set('x-crm-pantalla', window.location.pathname)
  return fetch(input, { ...init, headers })
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchConUsuario },
})
