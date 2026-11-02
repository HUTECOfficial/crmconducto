"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Shield, User, Building2, ArrowRight, ScanFace } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { usuarios } from "@/data/usuarios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { activarFaceId, correosConFaceId, dispositivoSoportaFaceId, faceIdCancelado } from "@/lib/passkeys-client"

const CLAVE_FACEID_OMITIDO = "crm-faceid-omitido"

function faceIdOmitido(email: string) {
  try {
    return (JSON.parse(localStorage.getItem(CLAVE_FACEID_OMITIDO) || "[]") as string[]).includes(email.toLowerCase())
  } catch {
    return false
  }
}

function omitirFaceId(email: string) {
  try {
    const actuales = JSON.parse(localStorage.getItem(CLAVE_FACEID_OMITIDO) || "[]") as string[]
    localStorage.setItem(CLAVE_FACEID_OMITIDO, JSON.stringify([...new Set([...actuales, email.toLowerCase()])]))
  } catch {
    // Sin almacenamiento local se volverá a preguntar la próxima vez.
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [cargando, setCargando] = useState(false)
  const [soportaFaceId, setSoportaFaceId] = useState(false)
  // Tras entrar con contraseña se ofrece activar Face ID en este dispositivo.
  const [ofrecerFaceId, setOfrecerFaceId] = useState(false)
  const [activandoFaceId, setActivandoFaceId] = useState(false)
  const { login, loginConFaceId } = useAuth()
  const router = useRouter()

  useEffect(() => {
    void dispositivoSoportaFaceId().then(setSoportaFaceId)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setCargando(true)
    const result = await login(email, password)
    setCargando(false)
    if (result.success) {
      const correo = email.trim().toLowerCase()
      if (soportaFaceId && !correosConFaceId().includes(correo) && !faceIdOmitido(correo)) setOfrecerFaceId(true)
      else router.push("/")
    } else {
      setError(result.error || "Error al iniciar sesión")
      setPassword("")
    }
  }

  const handleActivarFaceId = async () => {
    setActivandoFaceId(true)
    setError("")
    try {
      const correo = email.trim().toLowerCase()
      await activarFaceId(correo, password, usuarios.find(u => u.email.toLowerCase() === correo)?.nombre)
      router.push("/")
    } catch (activarError) {
      setActivandoFaceId(false)
      if (!faceIdCancelado(activarError)) setError(activarError instanceof Error ? activarError.message : "No fue posible activar Face ID")
    }
  }

  const handleOmitirFaceId = () => {
    omitirFaceId(email.trim())
    router.push("/")
  }

  const handleLoginFaceId = async () => {
    setError("")
    setCargando(true)
    const result = await loginConFaceId()
    setCargando(false)
    if (result.success) router.push("/")
    else if (!result.cancelado) setError(result.error || "No fue posible entrar con Face ID")
  }

  // Elegir un perfil sólo llena el correo; siempre se pide la contraseña.
  const handleQuickLogin = (userEmail: string) => {
    setEmail(userEmail)
    setPassword("")
    setError("")
    document.getElementById("password")?.focus()
  }

  const getRolIcon = (rol: string) => {
    switch (rol) {
      case "administrador":
        return <Shield className="w-5 h-5" />
      case "gerencia":
        return <Building2 className="w-5 h-5" />
      case "asesor":
        return <User className="w-5 h-5" />
      case "administrativo":
        return <Building2 className="w-5 h-5" />
      default:
        return <User className="w-5 h-5" />
    }
  }

  const getRolColor = (rol: string) => {
    switch (rol) {
      case "administrador":
        return "from-primary to-secondary"
      case "gerencia":
        return "from-blue-500 to-indigo-600"
      case "asesor":
        return "from-accent to-primary"
      case "administrativo":
        return "from-warning to-accent"
      default:
        return "from-primary to-secondary"
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-white via-slate-50/50 to-blue-50/20">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-5xl">
        <div className="text-center mb-12">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent"
          >
            CONDUCTO CRM
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-lg"
          >
            Gestión Inteligente
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Formulario de login */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-strong rounded-3xl p-8"
          >
            <h2 className="text-2xl font-bold mb-6">Iniciar Sesión</h2>
            {ofrecerFaceId ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900 dark:bg-blue-950/30">
                  <ScanFace className="mt-0.5 h-6 w-6 shrink-0 text-blue-600" />
                  <div>
                    <p className="font-semibold">¿Entrar con Face ID la próxima vez?</p>
                    <p className="mt-1 text-sm text-muted-foreground">Activa Face ID, Touch ID o el desbloqueo de este dispositivo para entrar sin escribir tu contraseña. Sólo funciona en este dispositivo.</p>
                  </div>
                </div>
                {error && <p className="text-destructive text-sm">{error}</p>}
                <Button type="button" className="w-full" size="lg" disabled={activandoFaceId} onClick={() => void handleActivarFaceId()}>
                  <ScanFace className="w-4 h-4 mr-2" />
                  {activandoFaceId ? "Activando..." : "Activar Face ID"}
                </Button>
                <Button type="button" variant="ghost" className="w-full" disabled={activandoFaceId} onClick={handleOmitirFaceId}>
                  Ahora no
                </Button>
              </div>
            ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Correo electrónico
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError("")
                  }}
                  placeholder="tu@email.com"
                  className="w-full"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2">
                  Contraseña
                </label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError("")
                  }}
                  placeholder="••••••••••••"
                  className="w-full"
                  required
                />
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button type="submit" className="w-full group" size="lg" disabled={cargando}>
                {cargando ? "Verificando..." : "Ingresar"}
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              {soportaFaceId && (
                <>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />o<span className="h-px flex-1 bg-border" /></div>
                  <Button type="button" variant="outline" className="w-full" size="lg" disabled={cargando} onClick={() => void handleLoginFaceId()}>
                    <ScanFace className="w-4 h-4 mr-2" />
                    Entrar con Face ID
                  </Button>
                </>
              )}
            </form>
            )}
          </motion.div>

          {/* Acceso rápido */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-strong rounded-3xl p-8"
          >
            <h2 className="text-2xl font-bold mb-2">Perfiles</h2>
            <p className="text-sm text-muted-foreground mb-6">Elige tu perfil y escribe tu contraseña.</p>
            <div className="space-y-3">
              {usuarios
                .filter((u) => u.activo)
                .map((usuario, index) => (
                  <motion.button
                    key={usuario.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    onClick={() => handleQuickLogin(usuario.email)}
                    className="w-full glass rounded-2xl p-4 flex items-center gap-4 hover:scale-[1.02] transition-all group"
                  >
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${getRolColor(usuario.rol)} text-white`}>
                      {getRolIcon(usuario.rol)}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold">{usuario.nombre}</p>
                      <p className="text-sm text-muted-foreground capitalize">{usuario.rol}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all" />
                  </motion.button>
                ))}
            </div>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-sm text-muted-foreground mt-8"
        >
          Acceso con contraseña o Face ID
        </motion.p>
      </motion.div>
    </div>
  )
}
