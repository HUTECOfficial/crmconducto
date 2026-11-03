import { useCallback, useEffect, useState } from "react"
import { addDaysDateOnly, todayDateOnly } from "@/lib/date-only"
import { fechaPagoEsperada, obtenerValoresUdi, udiParaFecha, type UdiParaFecha } from "@/lib/udi"

// Una sola consulta por sesión: la semana pasada (para proyectar) y lo ya publicado por adelantado.
let consulta: Promise<Record<string, number>> | null = null

function cargarValores() {
  if (!consulta) {
    const hoy = todayDateOnly()
    consulta = obtenerValoresUdi(addDaysDateOnly(hoy, -7), addDaysDateOnly(hoy, 45))
      .catch(error => {
        consulta = null
        throw error
      })
  }
  return consulta
}

/**
 * UDI del día en que se pagará cada recibo, para mostrar a los asesores cuánto cobrar en pesos.
 * `udiParaRecibo(fechaLimite)` usa la fecha límite (o hoy si ya venció).
 */
export function useUdiPorFecha(activo = true) {
  const [valores, setValores] = useState<Record<string, number> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!activo) return
    let vigente = true
    cargarValores()
      .then(datos => { if (vigente) setValores(datos) })
      .catch((err: Error) => { if (vigente) setError(err.message) })
    return () => { vigente = false }
  }, [activo])

  const udiParaRecibo = useCallback((fechaLimite: string): UdiParaFecha | null => {
    if (!valores) return null
    return udiParaFecha(valores, fechaPagoEsperada(fechaLimite, todayDateOnly()))
  }, [valores])

  return { udiParaRecibo, cargando: activo && !valores && !error, error }
}
