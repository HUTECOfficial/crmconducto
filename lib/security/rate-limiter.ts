/**
 * 🛡️ RATE LIMITER - PROTECCIÓN CONTRA ATAQUES
 * 
 * Previene ataques de fuerza bruta y DDoS
 * Implementa algoritmo Token Bucket
 */

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  blockDurationMs?: number
}

interface RateLimitEntry {
  count: number
  resetTime: number
  blocked: boolean
  blockUntil?: number
}

export class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map()
  private readonly configs: Map<string, RateLimitConfig> = new Map()

  constructor() {
    // Configuraciones predefinidas
    this.configs.set('login', {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000, // 15 minutos
      blockDurationMs: 30 * 60 * 1000, // 30 minutos de bloqueo
    })

    this.configs.set('api', {
      maxRequests: 100,
      windowMs: 60 * 1000, // 1 minuto
      blockDurationMs: 5 * 60 * 1000, // 5 minutos de bloqueo
    })

    this.configs.set('export', {
      maxRequests: 10,
      windowMs: 60 * 60 * 1000, // 1 hora
      blockDurationMs: 60 * 60 * 1000, // 1 hora de bloqueo
    })

    this.configs.set('search', {
      maxRequests: 50,
      windowMs: 60 * 1000, // 1 minuto
    })

    // Limpiar entradas expiradas cada 5 minutos
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanup(), 5 * 60 * 1000)
    }
  }

  /**
   * Verifica si una acción está permitida
   */
  async checkLimit(
    identifier: string,
    action: string = 'api'
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number; retryAfter?: number }> {
    const config = this.configs.get(action)
    if (!config) {
      throw new Error(`Configuración de rate limit no encontrada para: ${action}`)
    }

    const key = `${action}:${identifier}`
    const now = Date.now()
    let entry = this.limits.get(key)

    // Verificar si está bloqueado
    if (entry?.blocked && entry.blockUntil && entry.blockUntil > now) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.blockUntil,
        retryAfter: Math.ceil((entry.blockUntil - now) / 1000),
      }
    }

    // Crear nueva entrada o resetear si expiró
    if (!entry || now >= entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
        blocked: false,
      }
      this.limits.set(key, entry)
    }

    // Incrementar contador
    entry.count++

    // Verificar límite
    if (entry.count > config.maxRequests) {
      // Bloquear si está configurado
      if (config.blockDurationMs) {
        entry.blocked = true
        entry.blockUntil = now + config.blockDurationMs
      }

      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: config.blockDurationMs
          ? Math.ceil(config.blockDurationMs / 1000)
          : Math.ceil((entry.resetTime - now) / 1000),
      }
    }

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime,
    }
  }

  /**
   * Registra un intento (incrementa el contador)
   */
  async recordAttempt(identifier: string, action: string = 'api'): Promise<void> {
    await this.checkLimit(identifier, action)
  }

  /**
   * Resetea el límite para un identificador
   */
  reset(identifier: string, action: string = 'api'): void {
    const key = `${action}:${identifier}`
    this.limits.delete(key)
  }

  /**
   * Bloquea manualmente un identificador
   */
  block(identifier: string, action: string = 'api', durationMs?: number): void {
    const config = this.configs.get(action)
    if (!config) return

    const key = `${action}:${identifier}`
    const now = Date.now()

    this.limits.set(key, {
      count: config.maxRequests + 1,
      resetTime: now + config.windowMs,
      blocked: true,
      blockUntil: now + (durationMs || config.blockDurationMs || config.windowMs),
    })
  }

  /**
   * Desbloquea un identificador
   */
  unblock(identifier: string, action: string = 'api'): void {
    const key = `${action}:${identifier}`
    this.limits.delete(key)
  }

  /**
   * Obtiene el estado actual de un identificador
   */
  getStatus(identifier: string, action: string = 'api'): {
    isBlocked: boolean
    attempts: number
    resetTime: number
    blockUntil?: number
  } | null {
    const key = `${action}:${identifier}`
    const entry = this.limits.get(key)

    if (!entry) return null

    return {
      isBlocked: entry.blocked,
      attempts: entry.count,
      resetTime: entry.resetTime,
      blockUntil: entry.blockUntil,
    }
  }

  /**
   * Limpia entradas expiradas
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.limits.entries()) {
      // Eliminar si el tiempo de reset ya pasó y no está bloqueado
      if (now >= entry.resetTime && (!entry.blocked || (entry.blockUntil && now >= entry.blockUntil))) {
        this.limits.delete(key)
      }
    }
  }

  /**
   * Obtiene estadísticas de rate limiting
   */
  getStats(): {
    totalEntries: number
    blockedEntries: number
    topOffenders: Array<{ key: string; attempts: number }>
  } {
    const blocked = Array.from(this.limits.entries()).filter(([, entry]) => entry.blocked)

    const topOffenders = Array.from(this.limits.entries())
      .map(([key, entry]) => ({ key, attempts: entry.count }))
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 10)

    return {
      totalEntries: this.limits.size,
      blockedEntries: blocked.length,
      topOffenders,
    }
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter()

// Helper middleware para Next.js
export async function checkRateLimit(
  identifier: string,
  action: string = 'api'
): Promise<{ success: boolean; error?: string; retryAfter?: number }> {
  const result = await rateLimiter.checkLimit(identifier, action)

  if (!result.allowed) {
    return {
      success: false,
      error: `Demasiadas solicitudes. Intenta de nuevo en ${result.retryAfter} segundos.`,
      retryAfter: result.retryAfter,
    }
  }

  return { success: true }
}
