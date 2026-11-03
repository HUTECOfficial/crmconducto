import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Cliente de Supabase con la llave de servicio. SÓLO para rutas del servidor (Telegram, cron):
 * salta RLS, así que nunca debe importarse desde un componente del navegador.
 * Con `usuarioEmail` los triggers de la bitácora registran quién hizo cada cambio.
 */
export function supabaseServidor(usuarioEmail?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const llave = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !llave) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY en el servidor')
  return createClient(url, llave, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: usuarioEmail ? { 'x-crm-usuario': usuarioEmail, 'x-crm-pantalla': 'telegram' } : {} },
  })
}

export type SupabaseServidor = ReturnType<typeof supabaseServidor>
