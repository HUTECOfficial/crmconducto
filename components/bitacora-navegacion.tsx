"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { PANTALLAS } from "@/lib/bitacora"
import { registrarEnBitacora } from "@/lib/bitacora-registro"

/** Anota en la bitácora cada pantalla que abre el usuario con sesión. */
export function BitacoraNavegacion() {
  const pathname = usePathname()
  const { usuario } = useAuth()

  useEffect(() => {
    if (!usuario || !pathname || pathname === "/login") return
    void registrarEnBitacora({
      accion: "consulta",
      entidad: "pantalla",
      descripcion: `Entró a ${PANTALLAS[pathname] || pathname}`,
      ruta: pathname,
    })
  }, [pathname, usuario])

  return null
}
