export interface Etapa {
  id: string
  nombre: string
  orden: number
  color: string
}

export const etapas: Etapa[] = [
  { id: "lead", nombre: "Lead", orden: 1, color: "#94a3b8" },
  { id: "contactado", nombre: "Contactado", orden: 2, color: "#60a5fa" },
  { id: "cotizando", nombre: "Cotizando", orden: 3, color: "#fbbf24" },
  { id: "enviado", nombre: "Enviado", orden: 4, color: "#a78bfa" },
  { id: "emitido", nombre: "Emitido", orden: 5, color: "#34d399" },
]
