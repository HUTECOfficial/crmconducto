"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { usuario, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !usuario) {
      router.push("/login")
    }
  }, [usuario, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando...</p>
        </motion.div>
      </div>
    )
  }

  if (!usuario) {
    return null
  }

  return <>{children}</>
}
