"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Shield, User, Building2, ArrowRight } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { usuarios } from "@/data/usuarios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const { login } = useAuth()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    const result = await login(email)
    if (result.success) {
      router.push("/")
    } else {
      setError(result.error || "Error al iniciar sesión")
    }
  }

  const handleQuickLogin = async (userEmail: string) => {
    const result = await login(userEmail)
    if (result.success) {
      router.push("/")
    }
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
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button type="submit" className="w-full group" size="lg">
                Ingresar
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </form>
          </motion.div>

          {/* Acceso rápido */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-strong rounded-3xl p-8"
          >
            <h2 className="text-2xl font-bold mb-6">Acceso Rápido</h2>
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
          Sistema de demostración - Selecciona cualquier usuario para acceder
        </motion.p>
      </motion.div>
    </div>
  )
}
