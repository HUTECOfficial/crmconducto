"use client"

import { Badge } from "@/components/ui/badge"
import type { NivelSemaforo, SituacionCobranzaPoliza } from "@/lib/cobranza"
import type { ReciboExistente } from "@/lib/payment-schedule"

export const SEMAFORO: Record<NivelSemaforo, { label: string; detalle: string; fila: string; card: string; punto: string; texto: string }> = {
  rojo: {
    label: "Urgente",
    detalle: "0 a 5 días o vencida",
    fila: "bg-red-100 dark:bg-red-950/30 hover:bg-red-200/70 dark:hover:bg-red-900/40",
    card: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900",
    punto: "bg-red-500",
    texto: "text-red-700 dark:text-red-300",
  },
  naranja: {
    label: "Próximo a vencer",
    detalle: "6 a 9 días",
    fila: "bg-orange-100 dark:bg-orange-950/30 hover:bg-orange-200/70 dark:hover:bg-orange-900/40",
    card: "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900",
    punto: "bg-orange-500",
    texto: "text-orange-700 dark:text-orange-300",
  },
  amarillo: {
    label: "Preventivo",
    detalle: "10 a 15 días",
    fila: "bg-yellow-100 dark:bg-yellow-950/30 hover:bg-yellow-200/70 dark:hover:bg-yellow-900/40",
    card: "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900",
    punto: "bg-yellow-400",
    texto: "text-yellow-800 dark:text-yellow-300",
  },
  verde: {
    label: "Dentro del periodo",
    detalle: "16 a 30 días",
    fila: "bg-green-100 dark:bg-green-950/30 hover:bg-green-200/70 dark:hover:bg-green-900/40",
    card: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900",
    punto: "bg-green-500",
    texto: "text-green-700 dark:text-green-300",
  },
  morado: {
    label: "Pago por validar",
    detalle: "sin importar los días",
    fila: "bg-purple-100 dark:bg-purple-950/30 hover:bg-purple-200/70 dark:hover:bg-purple-900/40",
    card: "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900",
    punto: "bg-purple-500",
    texto: "text-purple-700 dark:text-purple-300",
  },
  sin_color: {
    label: "Sin urgencia",
    detalle: "más de 30 días",
    fila: "bg-card hover:bg-muted/50",
    card: "bg-card border-border/50",
    punto: "bg-muted-foreground/30",
    texto: "text-muted-foreground",
  },
}

export const ORDEN_SEMAFORO: NivelSemaforo[] = ["rojo", "naranja", "amarillo", "verde", "morado", "sin_color"]

export const ESTADO_COBRANZA_LABEL: Record<SituacionCobranzaPoliza["estado"], string> = {
  pendiente: "Pendiente",
  vencida: "Vencida",
  por_validar: "Por validar",
  pagada: "Pagada",
}

export function textoDias(dias?: number) {
  if (dias === undefined) return "—"
  if (dias < 0) return `Vencida hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "día" : "días"}`
  if (dias === 0) return "Vence hoy"
  return `${dias} ${dias === 1 ? "día" : "días"}`
}

export function SemaforoPill({ situacion }: { situacion: SituacionCobranzaPoliza<ReciboExistente> }) {
  const estilo = SEMAFORO[situacion.semaforo]
  return (
    <div className="space-y-1">
      <div className={`flex items-center gap-1.5 font-semibold whitespace-nowrap ${estilo.texto}`}>
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${estilo.punto}`} aria-hidden />
        {situacion.estado === "pagada" ? "Pagada" : textoDias(situacion.diasRestantes)}
      </div>
      <Badge
        variant="outline"
        className={situacion.estado === "por_validar" || situacion.porValidar > 0 ? "border-purple-500 text-purple-700 dark:text-purple-300" : situacion.estado === "vencida" ? "border-red-500 text-red-700 dark:text-red-300" : situacion.estado === "pagada" ? "border-green-600 text-green-700 dark:text-green-300" : ""}
      >
        {situacion.porValidar > 0 && situacion.estado !== "por_validar" ? `${ESTADO_COBRANZA_LABEL[situacion.estado]} · por validar` : ESTADO_COBRANZA_LABEL[situacion.estado]}
      </Badge>
    </div>
  )
}
