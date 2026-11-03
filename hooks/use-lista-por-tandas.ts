import { useCallback, useEffect, useMemo, useState } from "react"

/**
 * Dibuja una lista larga por tandas: miles de filas en pantalla vuelven lenta cada tecla
 * del buscador. Vuelve a la primera tanda cuando cambia `reinicio` (búsqueda o filtros).
 */
export function useListaPorTandas<T>(items: T[], reinicio: unknown, tamano = 100) {
  const [limite, setLimite] = useState(tamano)
  useEffect(() => setLimite(tamano), [reinicio, tamano])
  const visibles = useMemo(() => items.slice(0, limite), [items, limite])
  const mostrarMas = useCallback(() => setLimite(actual => actual + tamano), [tamano])
  return { visibles, restantes: Math.max(items.length - limite, 0), mostrarMas }
}
