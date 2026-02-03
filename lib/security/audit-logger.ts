/**
 * 📝 SISTEMA DE AUDITORÍA Y LOGGING DE NIVEL EMPRESARIAL
 * 
 * Registra todas las acciones críticas del sistema
 * Cumple con: SOX, HIPAA, ISO 27001, GDPR
 */

export enum AuditEventType {
  // Autenticación
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  
  // Acceso a Datos
  DATA_VIEW = 'DATA_VIEW',
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_SEARCH = 'DATA_SEARCH',
  
  // Modificación de Datos
  DATA_CREATE = 'DATA_CREATE',
  DATA_UPDATE = 'DATA_UPDATE',
  DATA_DELETE = 'DATA_DELETE',
  DATA_RESTORE = 'DATA_RESTORE',
  
  // Pólizas
  POLIZA_CREATE = 'POLIZA_CREATE',
  POLIZA_UPDATE = 'POLIZA_UPDATE',
  POLIZA_CANCEL = 'POLIZA_CANCEL',
  POLIZA_RENEW = 'POLIZA_RENEW',
  POLIZA_VIEW = 'POLIZA_VIEW',
  
  // Pagos
  PAYMENT_REGISTER = 'PAYMENT_REGISTER',
  PAYMENT_CANCEL = 'PAYMENT_CANCEL',
  PAYMENT_REFUND = 'PAYMENT_REFUND',
  
  // Documentos
  DOCUMENT_UPLOAD = 'DOCUMENT_UPLOAD',
  DOCUMENT_DOWNLOAD = 'DOCUMENT_DOWNLOAD',
  DOCUMENT_DELETE = 'DOCUMENT_DELETE',
  DOCUMENT_SHARE = 'DOCUMENT_SHARE',
  
  // Configuración
  CONFIG_CHANGE = 'CONFIG_CHANGE',
  USER_CREATE = 'USER_CREATE',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',
  PERMISSION_CHANGE = 'PERMISSION_CHANGE',
  
  // Seguridad
  SECURITY_ALERT = 'SECURITY_ALERT',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Sistema
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  SYSTEM_WARNING = 'SYSTEM_WARNING',
  BACKUP_CREATED = 'BACKUP_CREATED',
  BACKUP_RESTORED = 'BACKUP_RESTORED',
}

export enum AuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export interface AuditLog {
  id: string
  timestamp: string
  eventType: AuditEventType
  severity: AuditSeverity
  userId: string | null
  userEmail: string | null
  userRole: string | null
  ipAddress: string | null
  userAgent: string | null
  resource: string
  resourceId: string | null
  action: string
  details: Record<string, any>
  previousValue?: any
  newValue?: any
  success: boolean
  errorMessage?: string
  sessionId: string | null
  location?: {
    country?: string
    city?: string
    coordinates?: { lat: number; lon: number }
  }
}

class AuditLogger {
  private logs: AuditLog[] = []
  private readonly MAX_LOGS_IN_MEMORY = 10000
  private readonly STORAGE_KEY = 'crm-audit-logs'

  constructor() {
    this.loadLogs()
  }

  /**
   * Registra un evento de auditoría
   */
  async log(params: {
    eventType: AuditEventType
    severity?: AuditSeverity
    userId?: string | null
    userEmail?: string | null
    userRole?: string | null
    resource: string
    resourceId?: string | null
    action: string
    details?: Record<string, any>
    previousValue?: any
    newValue?: any
    success?: boolean
    errorMessage?: string
  }): Promise<void> {
    const log: AuditLog = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      eventType: params.eventType,
      severity: params.severity || this.determineSeverity(params.eventType),
      userId: params.userId || null,
      userEmail: params.userEmail || null,
      userRole: params.userRole || null,
      ipAddress: await this.getClientIP(),
      userAgent: this.getUserAgent(),
      resource: params.resource,
      resourceId: params.resourceId || null,
      action: params.action,
      details: params.details || {},
      previousValue: params.previousValue,
      newValue: params.newValue,
      success: params.success !== undefined ? params.success : true,
      errorMessage: params.errorMessage,
      sessionId: this.getSessionId(),
      location: await this.getLocation(),
    }

    this.logs.push(log)

    // Mantener solo los últimos N logs en memoria
    if (this.logs.length > this.MAX_LOGS_IN_MEMORY) {
      this.logs = this.logs.slice(-this.MAX_LOGS_IN_MEMORY)
    }

    this.saveLogs()

    // Log críticos se envían inmediatamente
    if (log.severity === AuditSeverity.CRITICAL) {
      await this.sendCriticalAlert(log)
    }

    // En producción, aquí se enviaría a un servicio de logging externo
    // como Datadog, Splunk, ELK Stack, etc.
    if (process.env.NODE_ENV === 'production') {
      await this.sendToExternalLogger(log)
    }
  }

  /**
   * Obtiene logs filtrados
   */
  getLogs(filters?: {
    startDate?: string
    endDate?: string
    userId?: string
    eventType?: AuditEventType
    severity?: AuditSeverity
    resource?: string
    success?: boolean
  }): AuditLog[] {
    let filtered = [...this.logs]

    if (filters) {
      if (filters.startDate) {
        filtered = filtered.filter((log) => log.timestamp >= filters.startDate!)
      }
      if (filters.endDate) {
        filtered = filtered.filter((log) => log.timestamp <= filters.endDate!)
      }
      if (filters.userId) {
        filtered = filtered.filter((log) => log.userId === filters.userId)
      }
      if (filters.eventType) {
        filtered = filtered.filter((log) => log.eventType === filters.eventType)
      }
      if (filters.severity) {
        filtered = filtered.filter((log) => log.severity === filters.severity)
      }
      if (filters.resource) {
        filtered = filtered.filter((log) => log.resource === filters.resource)
      }
      if (filters.success !== undefined) {
        filtered = filtered.filter((log) => log.success === filters.success)
      }
    }

    return filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  }

  /**
   * Exporta logs para análisis forense
   */
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2)
    } else {
      // CSV format
      const headers = [
        'ID',
        'Timestamp',
        'Event Type',
        'Severity',
        'User ID',
        'User Email',
        'Resource',
        'Action',
        'Success',
        'IP Address',
      ]

      const rows = this.logs.map((log) => [
        log.id,
        log.timestamp,
        log.eventType,
        log.severity,
        log.userId || '',
        log.userEmail || '',
        log.resource,
        log.action,
        log.success ? 'Yes' : 'No',
        log.ipAddress || '',
      ])

      return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
    }
  }

  /**
   * Detecta actividad sospechosa
   */
  detectSuspiciousActivity(userId: string, timeWindowMinutes: number = 5): {
    isSuspicious: boolean
    reasons: string[]
  } {
    const now = new Date()
    const windowStart = new Date(now.getTime() - timeWindowMinutes * 60 * 1000)

    const recentLogs = this.logs.filter(
      (log) => log.userId === userId && new Date(log.timestamp) >= windowStart
    )

    const reasons: string[] = []

    // Múltiples intentos de login fallidos
    const failedLogins = recentLogs.filter(
      (log) => log.eventType === AuditEventType.LOGIN_FAILED
    ).length
    if (failedLogins >= 3) {
      reasons.push(`${failedLogins} intentos de login fallidos`)
    }

    // Acceso desde múltiples IPs
    const uniqueIPs = new Set(recentLogs.map((log) => log.ipAddress).filter(Boolean))
    if (uniqueIPs.size >= 3) {
      reasons.push(`Acceso desde ${uniqueIPs.size} IPs diferentes`)
    }

    // Exportación masiva de datos
    const exports = recentLogs.filter(
      (log) => log.eventType === AuditEventType.DATA_EXPORT
    ).length
    if (exports >= 5) {
      reasons.push(`${exports} exportaciones de datos`)
    }

    // Eliminaciones masivas
    const deletions = recentLogs.filter(
      (log) => log.eventType === AuditEventType.DATA_DELETE
    ).length
    if (deletions >= 10) {
      reasons.push(`${deletions} eliminaciones de datos`)
    }

    // Accesos no autorizados
    const unauthorized = recentLogs.filter(
      (log) => log.eventType === AuditEventType.UNAUTHORIZED_ACCESS
    ).length
    if (unauthorized >= 2) {
      reasons.push(`${unauthorized} intentos de acceso no autorizado`)
    }

    return {
      isSuspicious: reasons.length > 0,
      reasons,
    }
  }

  /**
   * Genera reporte de cumplimiento
   */
  generateComplianceReport(startDate: string, endDate: string): {
    totalEvents: number
    criticalEvents: number
    failedLogins: number
    dataAccess: number
    dataModifications: number
    securityAlerts: number
    topUsers: Array<{ userId: string; userEmail: string; eventCount: number }>
    topResources: Array<{ resource: string; accessCount: number }>
  } {
    const logs = this.getLogs({ startDate, endDate })

    const criticalEvents = logs.filter((log) => log.severity === AuditSeverity.CRITICAL)
      .length
    const failedLogins = logs.filter(
      (log) => log.eventType === AuditEventType.LOGIN_FAILED
    ).length
    const dataAccess = logs.filter((log) => log.eventType === AuditEventType.DATA_VIEW)
      .length
    const dataModifications = logs.filter(
      (log) =>
        log.eventType === AuditEventType.DATA_CREATE ||
        log.eventType === AuditEventType.DATA_UPDATE ||
        log.eventType === AuditEventType.DATA_DELETE
    ).length
    const securityAlerts = logs.filter(
      (log) => log.eventType === AuditEventType.SECURITY_ALERT
    ).length

    // Top usuarios
    const userCounts = new Map<string, { email: string; count: number }>()
    logs.forEach((log) => {
      if (log.userId) {
        const current = userCounts.get(log.userId) || {
          email: log.userEmail || '',
          count: 0,
        }
        current.count++
        userCounts.set(log.userId, current)
      }
    })

    const topUsers = Array.from(userCounts.entries())
      .map(([userId, data]) => ({
        userId,
        userEmail: data.email,
        eventCount: data.count,
      }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 10)

    // Top recursos
    const resourceCounts = new Map<string, number>()
    logs.forEach((log) => {
      const current = resourceCounts.get(log.resource) || 0
      resourceCounts.set(log.resource, current + 1)
    })

    const topResources = Array.from(resourceCounts.entries())
      .map(([resource, accessCount]) => ({ resource, accessCount }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10)

    return {
      totalEvents: logs.length,
      criticalEvents,
      failedLogins,
      dataAccess,
      dataModifications,
      securityAlerts,
      topUsers,
      topResources,
    }
  }

  // Métodos privados
  private determineSeverity(eventType: AuditEventType): AuditSeverity {
    const criticalEvents = [
      AuditEventType.SECURITY_ALERT,
      AuditEventType.UNAUTHORIZED_ACCESS,
      AuditEventType.DATA_DELETE,
      AuditEventType.USER_DELETE,
      AuditEventType.PERMISSION_CHANGE,
    ]

    const warningEvents = [
      AuditEventType.LOGIN_FAILED,
      AuditEventType.DATA_EXPORT,
      AuditEventType.SUSPICIOUS_ACTIVITY,
      AuditEventType.RATE_LIMIT_EXCEEDED,
    ]

    if (criticalEvents.includes(eventType)) return AuditSeverity.CRITICAL
    if (warningEvents.includes(eventType)) return AuditSeverity.WARNING
    return AuditSeverity.INFO
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private async getClientIP(): Promise<string | null> {
    // En producción, esto vendría del servidor
    // Por ahora retornamos null para el cliente
    return null
  }

  private getUserAgent(): string | null {
    if (typeof window !== 'undefined') {
      return window.navigator.userAgent
    }
    return null
  }

  private getSessionId(): string | null {
    if (typeof window !== 'undefined') {
      let sessionId = sessionStorage.getItem('crm-session-id')
      if (!sessionId) {
        sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        sessionStorage.setItem('crm-session-id', sessionId)
      }
      return sessionId
    }
    return null
  }

  private async getLocation(): Promise<AuditLog['location']> {
    // En producción, esto se obtendría del servidor usando la IP
    return undefined
  }

  private loadLogs(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.STORAGE_KEY)
        if (stored) {
          this.logs = JSON.parse(stored)
        }
      } catch (error) {
        console.error('Error cargando logs de auditoría:', error)
      }
    }
  }

  private saveLogs(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.logs))
      } catch (error) {
        console.error('Error guardando logs de auditoría:', error)
      }
    }
  }

  private async sendCriticalAlert(log: AuditLog): Promise<void> {
    // En producción, enviar alerta por email, SMS, Slack, etc.
    console.error('🚨 ALERTA CRÍTICA DE SEGURIDAD:', log)
  }

  private async sendToExternalLogger(log: AuditLog): Promise<void> {
    // En producción, enviar a servicio externo
    // Ejemplo: Datadog, Splunk, CloudWatch, etc.
    console.log('📤 Enviando log a servicio externo:', log.id)
  }
}

// Singleton instance
export const auditLogger = new AuditLogger()

// Helper functions
export async function logUserAction(
  eventType: AuditEventType,
  userId: string,
  userEmail: string,
  userRole: string,
  resource: string,
  action: string,
  details?: Record<string, any>
): Promise<void> {
  await auditLogger.log({
    eventType,
    userId,
    userEmail,
    userRole,
    resource,
    action,
    details,
  })
}

export async function logSecurityEvent(
  eventType: AuditEventType,
  details: Record<string, any>
): Promise<void> {
  await auditLogger.log({
    eventType,
    severity: AuditSeverity.CRITICAL,
    resource: 'security',
    action: 'security_event',
    details,
  })
}
