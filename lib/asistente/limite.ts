import 'server-only'
import { supabaseServidor } from "@/lib/supabase-servidor"

/** Peticiones a Coni por usuario y por día (web + Telegram juntos), hora de Ciudad de México. */
export const LIMITE_DIARIO = Number(process.env.ASISTENTE_LIMITE_DIARIO) || 40

export interface Consumo {
  permitido: boolean
  /** Lo que le queda hoy después de esta petición; null si no se pudo contar. */
  restantes: number | null
}

/** Cuenta una petición. Si el contador no responde, deja pasar (Coni no se cae por eso) y lo registra. */
export async function consumirPeticion(email: string): Promise<Consumo> {
  try {
    const { data, error } = await supabaseServidor().rpc("asistente_consumir", { p_email: email, p_limite: LIMITE_DIARIO })
    if (error) throw error
    const usadas = Number(data)
    if (usadas < 0) return { permitido: false, restantes: 0 }
    return { permitido: true, restantes: Math.max(LIMITE_DIARIO - usadas, 0) }
  } catch (error: any) {
    console.error("Límite de Coni: no se pudo contar la petición", error?.message)
    return { permitido: true, restantes: null }
  }
}

export const MENSAJE_LIMITE = `Ya usaste tus ${LIMITE_DIARIO} peticiones de hoy 🙏 Se reinician a la medianoche (hora de Ciudad de México). Mientras, todo sigue disponible en el CRM.`
