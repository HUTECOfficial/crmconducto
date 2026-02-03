"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { Usuario } from "@/data/usuarios"
import { usuarios, permisos } from "@/data/usuarios"
import { sessionManager, type Session } from "@/lib/security/session-manager"
import { auditLogger, AuditEventType } from "@/lib/security/audit-logger"
import { rateLimiter } from "@/lib/security/rate-limiter"
import { dataProtectionManager } from "@/lib/security/data-protection"

interface AuthContextType {
  usuario: Usuario | null
  session: Session | null
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  tienePermiso: (permiso: keyof (typeof permisos)["administrador"]) => boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Cargar y validar sesión al montar
  useEffect(() => {
    const initSession = async () => {
      const sessionId = localStorage.getItem("crm-session-id")
      if (sessionId) {
        const validation = await sessionManager.validateSession(sessionId)
        if (validation.valid && validation.session) {
          const usuarioEncontrado = usuarios.find((u) => u.id === validation.session!.userId)
          if (usuarioEncontrado && usuarioEncontrado.activo) {
            setUsuario(usuarioEncontrado)
            setSession(validation.session)
          } else {
            await cleanupSession()
          }
        } else {
          await cleanupSession()
        }
      }
      setIsLoading(false)
    }

    initSession()
  }, [])

  const login = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Rate limiting para prevenir fuerza bruta
      const rateCheck = await rateLimiter.checkLimit(email, 'login')
      if (!rateCheck.allowed) {
        await auditLogger.log({
          eventType: AuditEventType.RATE_LIMIT_EXCEEDED,
          resource: 'auth',
          action: 'login_attempt',
          userEmail: email,
          success: false,
          details: { reason: 'rate_limit_exceeded' },
        })

        return {
          success: false,
          error: `Demasiados intentos. Intenta de nuevo en ${rateCheck.retryAfter} segundos.`,
        }
      }

      // Buscar usuario
      const usuarioEncontrado = usuarios.find((u) => u.email === email && u.activo)
      
      if (!usuarioEncontrado) {
        // Log intento fallido
        await auditLogger.log({
          eventType: AuditEventType.LOGIN_FAILED,
          resource: 'auth',
          action: 'login',
          userEmail: email,
          success: false,
          details: { reason: 'user_not_found' },
        })

        return { success: false, error: 'Credenciales inválidas' }
      }

      // Crear sesión segura
      const newSession = await sessionManager.createSession(
        usuarioEncontrado.id,
        usuarioEncontrado.email,
        usuarioEncontrado.rol
      )

      setUsuario(usuarioEncontrado)
      setSession(newSession)
      localStorage.setItem("crm-session-id", newSession.id)

      // Registrar en protección de datos
      dataProtectionManager.registerDataSubject(
        usuarioEncontrado.id,
        usuarioEncontrado.email,
        usuarioEncontrado.nombre
      )

      // Log login exitoso
      await auditLogger.log({
        eventType: AuditEventType.LOGIN_SUCCESS,
        userId: usuarioEncontrado.id,
        userEmail: usuarioEncontrado.email,
        userRole: usuarioEncontrado.rol,
        resource: 'auth',
        action: 'login',
        success: true,
      })

      return { success: true }
    } catch (error) {
      console.error('Error en login:', error)
      return { success: false, error: 'Error al iniciar sesión' }
    }
  }

  const logout = async () => {
    if (session && usuario) {
      // Log logout
      await auditLogger.log({
        eventType: AuditEventType.LOGOUT,
        userId: usuario.id,
        userEmail: usuario.email,
        userRole: usuario.rol,
        resource: 'auth',
        action: 'logout',
        success: true,
      })

      // Terminar sesión
      await sessionManager.terminateSession(session.id, 'User logout')
    }

    await cleanupSession()
  }

  const cleanupSession = async () => {
    setUsuario(null)
    setSession(null)
    localStorage.removeItem("crm-session-id")
    localStorage.removeItem("crm-usuario") // Legacy cleanup
  }

  const tienePermiso = (permiso: keyof (typeof permisos)["administrador"]): boolean => {
    if (!usuario) return false
    return permisos[usuario.rol][permiso] === true
  }

  return (
    <AuthContext.Provider value={{ usuario, session, login, logout, tienePermiso, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider")
  }
  return context
}
