"use client"

import { formatDateOnly } from "@/lib/date-only"
import type { UdiParaFecha } from "@/lib/udi"

const mxn = (monto: number) => `$${monto.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** "≈ $X MXN al 12/11/2026 · UDI 8.897671": cuánto cobrar en pesos un recibo en UDIS. */
export function EquivalenteUdi({ udis, udi, className = "text-xs text-muted-foreground" }: {
  udis: number
  udi: UdiParaFecha | null
  className?: string
}) {
  if (!udi) return null
  return (
    <p className={className} title={udi.estimado
      ? "Banco de México aún no publica la UDI de ese día: se estimó con el último valor publicado. El monto final se fija con la UDI del día en que se pague."
      : "UDI publicada por Banco de México para ese día."}>
      ≈ {mxn(udis * udi.valor)} MXN al {formatDateOnly(udi.fecha)} · UDI {udi.valor.toFixed(6)}{udi.estimado ? " (estimada)" : ""}
    </p>
  )
}
