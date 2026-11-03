"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"

/** Al final de una lista por tandas: carga la siguiente al acercarse, o con el botón. */
export function CargarMas({ restantes, onMas }: { restantes: number; onMas: () => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const elemento = ref.current
    if (!elemento || restantes <= 0) return
    const observador = new IntersectionObserver(entradas => {
      if (entradas.some(entrada => entrada.isIntersecting)) onMas()
    }, { rootMargin: "600px" })
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [restantes, onMas])

  if (restantes <= 0) return null
  return (
    <div ref={ref} className="flex justify-center p-4">
      <Button variant="outline" onClick={onMas}>
        Mostrar más ({restantes.toLocaleString("es-MX")} restantes)
      </Button>
    </div>
  )
}
