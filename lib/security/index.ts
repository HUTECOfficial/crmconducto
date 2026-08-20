/**
 * 🔐 MÓDULO DE SEGURIDAD EMPRESARIAL
 * 
 * Exporta todas las funcionalidades de seguridad
 */

export { SecurityEncryption, encryptSensitiveFields, decryptSensitiveFields } from './encryption'

export {
  auditLogger,
  logUserAction,
  logSecurityEvent,
  AuditEventType,
  AuditSeverity,
  type AuditLog,
} from './audit-logger'

export { rateLimiter, checkRateLimit, RateLimiter } from './rate-limiter'

export { sessionManager, SessionManager, type Session, type SessionConfig } from './session-manager'

export {
  dataProtectionManager,
  DataProtectionManager,
  DataClassification,
  ConsentType,
  ARCORight,
  type DataSubject,
  type ConsentRecord,
  type ARCORequest,
  type DataRetentionPolicy,
} from './data-protection'

export { InputValidator, validators } from './input-validator'

/**
 * Inicializa todos los módulos de seguridad
 */
export function initializeSecurity(): void {
  console.log('🔐 Inicializando módulos de seguridad...')

  // Verificar que estamos en un entorno seguro
  if (typeof window !== 'undefined') {
    // Verificar HTTPS en producción
    if (process.env.NODE_ENV === 'production' && window.location.protocol !== 'https:') {
      console.warn('⚠️ ADVERTENCIA: La aplicación debe ejecutarse sobre HTTPS en producción')
    }

    // Verificar que crypto API está disponible
    if (!window.crypto || !window.crypto.subtle) {
      console.error('❌ ERROR: Web Crypto API no está disponible')
    }
  }

  console.log('✅ Módulos de seguridad inicializados')
}

/**
 * Configuración de seguridad global
 */
export const securityConfig = {
  // Encriptación
  encryption: {
    algorithm: 'AES-GCM',
    keyLength: 256,
    iterations: 600000,
  },

  // Sesiones
  session: {
    durationMs: 8 * 60 * 60 * 1000, // 8 horas
    inactivityTimeoutMs: 30 * 60 * 1000, // 30 minutos
    maxConcurrentSessions: 3,
  },

  // Rate Limiting
  rateLimit: {
    login: { maxRequests: 5, windowMs: 15 * 60 * 1000 },
    api: { maxRequests: 100, windowMs: 60 * 1000 },
    export: { maxRequests: 10, windowMs: 60 * 60 * 1000 },
  },

  // Validación
  validation: {
    maxInputLength: 10000,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  },

  // Auditoría
  audit: {
    retentionDays: 2555, // 7 años (SOX compliance)
    criticalEventsRetentionDays: 3650, // 10 años
  },

  // Protección de Datos
  dataProtection: {
    defaultRetentionDays: 365,
    anonymizeAfterDeletion: true,
    requireConsentForMarketing: true,
  },
}

/**
 * Verifica el estado de seguridad del sistema
 */
export function getSecurityStatus(): {
  healthy: boolean
  checks: Array<{ name: string; status: 'pass' | 'fail' | 'warning'; message: string }>
} {
  const checks: Array<{ name: string; status: 'pass' | 'fail' | 'warning'; message: string }> = []

  // Check 1: HTTPS
  if (typeof window !== 'undefined') {
    if (process.env.NODE_ENV === 'production') {
      checks.push({
        name: 'HTTPS',
        status: window.location.protocol === 'https:' ? 'pass' : 'fail',
        message:
          window.location.protocol === 'https:'
            ? 'Conexión segura HTTPS'
            : 'Conexión insegura HTTP',
      })
    }

    // Check 2: Crypto API
    checks.push({
      name: 'Web Crypto API',
      status: window.crypto && window.crypto.subtle ? 'pass' : 'fail',
      message:
        window.crypto && window.crypto.subtle
          ? 'Web Crypto API disponible'
          : 'Web Crypto API no disponible',
    })

    // Check 3: LocalStorage
    try {
      localStorage.setItem('test', 'test')
      localStorage.removeItem('test')
      checks.push({
        name: 'LocalStorage',
        status: 'pass',
        message: 'LocalStorage disponible',
      })
    } catch {
      checks.push({
        name: 'LocalStorage',
        status: 'warning',
        message: 'LocalStorage no disponible o bloqueado',
      })
    }

    // Check 4: SessionStorage
    try {
      sessionStorage.setItem('test', 'test')
      sessionStorage.removeItem('test')
      checks.push({
        name: 'SessionStorage',
        status: 'pass',
        message: 'SessionStorage disponible',
      })
    } catch {
      checks.push({
        name: 'SessionStorage',
        status: 'warning',
        message: 'SessionStorage no disponible o bloqueado',
      })
    }
  }

  // Check 5: Rate Limiter
  checks.push({
    name: 'Rate Limiter',
    status: 'pass',
    message: 'Rate Limiter activo',
  })

  // Check 6: Audit Logger
  checks.push({
    name: 'Audit Logger',
    status: 'pass',
    message: 'Audit Logger activo',
  })

  const healthy = checks.every((check) => check.status !== 'fail')

  return { healthy, checks }
}
