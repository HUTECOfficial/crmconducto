/**
 * 🔐 GESTOR DE SESIONES SEGURAS
 * 
 * Manejo de sesiones con tokens JWT, refresh tokens y detección de anomalías
 */

import { SecurityEncryption } from './encryption'

export interface Session {
  id: string
  userId: string
  userEmail: string
  userRole: string
  createdAt: string
  expiresAt: string
  lastActivity: string
  ipAddress: string | null
  userAgent: string | null
  deviceFingerprint: string | null
  isActive: boolean
  refreshToken?: string
}

export interface SessionConfig {
  sessionDurationMs: number
  inactivityTimeoutMs: number
  maxConcurrentSessions: number
  requireDeviceFingerprint: boolean
}

export class SessionManager {
  private sessions: Map<string, Session> = new Map()
  private readonly STORAGE_KEY = 'crm-sessions'
  private readonly config: SessionConfig

  constructor(config?: Partial<SessionConfig>) {
    this.config = {
      sessionDurationMs: 8 * 60 * 60 * 1000, // 8 horas
      inactivityTimeoutMs: 30 * 60 * 1000, // 30 minutos
      maxConcurrentSessions: 3,
      requireDeviceFingerprint: true,
      ...config,
    }

    this.loadSessions()
    this.startCleanupInterval()
  }

  /**
   * Crea una nueva sesión
   */
  async createSession(
    userId: string,
    userEmail: string,
    userRole: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<Session> {
    // Verificar límite de sesiones concurrentes
    await this.enforceSessionLimit(userId)

    const now = new Date()
    const session: Session = {
      id: await this.generateSessionId(),
      userId,
      userEmail,
      userRole,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + this.config.sessionDurationMs).toISOString(),
      lastActivity: now.toISOString(),
      ipAddress: ipAddress || null,
      userAgent: userAgent || this.getUserAgent(),
      deviceFingerprint: await this.generateDeviceFingerprint(),
      isActive: true,
      refreshToken: await this.generateRefreshToken(),
    }

    this.sessions.set(session.id, session)
    this.saveSessions()

    return session
  }

  /**
   * Valida una sesión
   */
  async validateSession(sessionId: string): Promise<{
    valid: boolean
    session?: Session
    reason?: string
  }> {
    const session = this.sessions.get(sessionId)

    if (!session) {
      return { valid: false, reason: 'Sesión no encontrada' }
    }

    if (!session.isActive) {
      return { valid: false, reason: 'Sesión inactiva' }
    }

    const now = new Date()

    // Verificar expiración
    if (new Date(session.expiresAt) < now) {
      await this.terminateSession(sessionId, 'Sesión expirada')
      return { valid: false, reason: 'Sesión expirada' }
    }

    // Verificar inactividad
    const lastActivity = new Date(session.lastActivity)
    const inactiveTime = now.getTime() - lastActivity.getTime()

    if (inactiveTime > this.config.inactivityTimeoutMs) {
      await this.terminateSession(sessionId, 'Sesión inactiva por timeout')
      return { valid: false, reason: 'Sesión inactiva' }
    }

    // Verificar device fingerprint si está habilitado
    if (this.config.requireDeviceFingerprint) {
      const currentFingerprint = await this.generateDeviceFingerprint()
      if (session.deviceFingerprint && session.deviceFingerprint !== currentFingerprint) {
        await this.terminateSession(sessionId, 'Device fingerprint no coincide')
        return { valid: false, reason: 'Dispositivo no reconocido' }
      }
    }

    // Actualizar última actividad
    session.lastActivity = now.toISOString()
    this.saveSessions()

    return { valid: true, session }
  }

  /**
   * Renueva una sesión usando refresh token
   */
  async refreshSession(sessionId: string, refreshToken: string): Promise<{
    success: boolean
    session?: Session
    error?: string
  }> {
    const session = this.sessions.get(sessionId)

    if (!session) {
      return { success: false, error: 'Sesión no encontrada' }
    }

    if (session.refreshToken !== refreshToken) {
      return { success: false, error: 'Refresh token inválido' }
    }

    // Extender expiración
    const now = new Date()
    session.expiresAt = new Date(now.getTime() + this.config.sessionDurationMs).toISOString()
    session.lastActivity = now.toISOString()
    session.refreshToken = await this.generateRefreshToken()

    this.saveSessions()

    return { success: true, session }
  }

  /**
   * Termina una sesión
   */
  async terminateSession(sessionId: string, reason?: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.isActive = false
      this.saveSessions()

      // Log de auditoría
      console.log(`🔒 Sesión terminada: ${sessionId}`, reason || '')
    }
  }

  /**
   * Termina todas las sesiones de un usuario
   */
  async terminateAllUserSessions(userId: string, exceptSessionId?: string): Promise<number> {
    let count = 0

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId && sessionId !== exceptSessionId) {
        await this.terminateSession(sessionId, 'Terminación masiva de sesiones')
        count++
      }
    }

    return count
  }

  /**
   * Obtiene todas las sesiones activas de un usuario
   */
  getUserSessions(userId: string): Session[] {
    return Array.from(this.sessions.values())
      .filter((session) => session.userId === userId && session.isActive)
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
  }

  /**
   * Detecta sesiones sospechosas
   */
  detectAnomalies(userId: string): {
    hasAnomalies: boolean
    anomalies: Array<{
      type: string
      description: string
      sessionId: string
    }>
  } {
    const sessions = this.getUserSessions(userId)
    const anomalies: Array<{ type: string; description: string; sessionId: string }> = []

    // Múltiples IPs
    const uniqueIPs = new Set(sessions.map((s) => s.ipAddress).filter(Boolean))
    if (uniqueIPs.size > 2) {
      sessions.forEach((session) => {
        if (session.ipAddress) {
          anomalies.push({
            type: 'multiple_ips',
            description: `Sesión desde IP inusual: ${session.ipAddress}`,
            sessionId: session.id,
          })
        }
      })
    }

    // Múltiples dispositivos
    const uniqueDevices = new Set(sessions.map((s) => s.deviceFingerprint).filter(Boolean))
    if (uniqueDevices.size > 3) {
      anomalies.push({
        type: 'multiple_devices',
        description: `${uniqueDevices.size} dispositivos diferentes detectados`,
        sessionId: sessions[0].id,
      })
    }

    // Sesiones desde ubicaciones geográficas muy distantes (requeriría geolocalización)
    // TODO: Implementar cuando se tenga acceso a API de geolocalización

    return {
      hasAnomalies: anomalies.length > 0,
      anomalies,
    }
  }

  /**
   * Obtiene estadísticas de sesiones
   */
  getStats(): {
    totalSessions: number
    activeSessions: number
    expiredSessions: number
    uniqueUsers: number
    averageSessionDuration: number
  } {
    const allSessions = Array.from(this.sessions.values())
    const activeSessions = allSessions.filter((s) => s.isActive)
    const now = new Date()

    const expiredSessions = allSessions.filter(
      (s) => new Date(s.expiresAt) < now
    ).length

    const uniqueUsers = new Set(allSessions.map((s) => s.userId)).size

    const durations = allSessions.map((s) => {
      const created = new Date(s.createdAt)
      const lastActivity = new Date(s.lastActivity)
      return lastActivity.getTime() - created.getTime()
    })

    const averageSessionDuration =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0

    return {
      totalSessions: allSessions.length,
      activeSessions: activeSessions.length,
      expiredSessions,
      uniqueUsers,
      averageSessionDuration: Math.round(averageSessionDuration / 1000 / 60), // en minutos
    }
  }

  // Métodos privados
  private async generateSessionId(): Promise<string> {
    return SecurityEncryption.generateSecureToken(32)
  }

  private async generateRefreshToken(): Promise<string> {
    return SecurityEncryption.generateSecureToken(48)
  }

  private getUserAgent(): string | null {
    if (typeof window !== 'undefined') {
      return window.navigator.userAgent
    }
    return null
  }

  private async generateDeviceFingerprint(): Promise<string | null> {
    if (typeof window === 'undefined') return null

    // Generar fingerprint basado en características del navegador
    const components = [
      window.navigator.userAgent,
      window.navigator.language,
      window.screen.colorDepth,
      window.screen.width,
      window.screen.height,
      new Date().getTimezoneOffset(),
      !!window.sessionStorage,
      !!window.localStorage,
    ]

    const fingerprint = components.join('|')
    return await SecurityEncryption.hash(fingerprint)
  }

  private async enforceSessionLimit(userId: string): Promise<void> {
    const userSessions = this.getUserSessions(userId)

    if (userSessions.length >= this.config.maxConcurrentSessions) {
      // Terminar la sesión más antigua
      const oldestSession = userSessions[userSessions.length - 1]
      await this.terminateSession(
        oldestSession.id,
        'Límite de sesiones concurrentes alcanzado'
      )
    }
  }

  private loadSessions(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.STORAGE_KEY)
        if (stored) {
          const sessionsArray: Session[] = JSON.parse(stored)
          this.sessions = new Map(sessionsArray.map((s) => [s.id, s]))
        }
      } catch (error) {
        console.error('Error cargando sesiones:', error)
      }
    }
  }

  private saveSessions(): void {
    if (typeof window !== 'undefined') {
      try {
        const sessionsArray = Array.from(this.sessions.values())
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessionsArray))
      } catch (error) {
        console.error('Error guardando sesiones:', error)
      }
    }
  }

  private startCleanupInterval(): void {
    if (typeof window !== 'undefined') {
      // Limpiar sesiones expiradas cada 5 minutos
      setInterval(() => {
        this.cleanupExpiredSessions()
      }, 5 * 60 * 1000)
    }
  }

  private cleanupExpiredSessions(): void {
    const now = new Date()
    let cleaned = 0

    for (const [sessionId, session] of this.sessions.entries()) {
      if (new Date(session.expiresAt) < now || !session.isActive) {
        this.sessions.delete(sessionId)
        cleaned++
      }
    }

    if (cleaned > 0) {
      this.saveSessions()
      console.log(`🧹 Limpiadas ${cleaned} sesiones expiradas`)
    }
  }
}

// Singleton instance
export const sessionManager = new SessionManager()
