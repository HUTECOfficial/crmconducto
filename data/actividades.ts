export interface Actividad {
  id: string
  tipo: "poliza-creada" | "pago-recibido" | "prospecto-nuevo" | "renovacion" | "recordatorio-enviado"
  titulo: string
  descripcion: string
  fecha: string
  clienteId?: string
  polizaId?: string
}

export const actividades: Actividad[] = [
  {
    id: "1",
    tipo: "pago-recibido",
    titulo: "Pago recibido",
    descripcion: "María González - GNP-GM-2024-001 - $2,000",
    fecha: "2024-09-28T10:30:00",
    clienteId: "1",
    polizaId: "2",
  },
  {
    id: "2",
    tipo: "prospecto-nuevo",
    titulo: "Nuevo prospecto",
    descripcion: "Beatriz Aguilar - Interés en seguro de hogar",
    fecha: "2024-09-27T14:15:00",
    clienteId: "10",
  },
  {
    id: "3",
    tipo: "recordatorio-enviado",
    titulo: "Recordatorio enviado",
    descripcion: "Renovación próxima - Ana Martínez - AXA-AUTO-2023-015",
    fecha: "2024-09-26T09:00:00",
    clienteId: "3",
    polizaId: "16",
  },
  {
    id: "4",
    tipo: "prospecto-nuevo",
    titulo: "Nuevo prospecto",
    descripcion: "Claudia Reyes - Interés en seguro empresarial",
    fecha: "2024-09-28T16:45:00",
    clienteId: "6",
  },
  {
    id: "5",
    tipo: "poliza-creada",
    titulo: "Póliza emitida",
    descripcion: "Andrés Medina - HDI-GM-2024-003",
    fecha: "2024-09-01T11:20:00",
    clienteId: "20",
    polizaId: "15",
  },
  {
    id: "6",
    tipo: "pago-recibido",
    titulo: "Pago recibido",
    descripcion: "Roberto Sánchez - AXA-VIDA-2024-002 - $1,500",
    fecha: "2024-10-14T13:10:00",
    clienteId: "6",
    polizaId: "6",
  },
  {
    id: "7",
    tipo: "prospecto-nuevo",
    titulo: "Nuevo prospecto",
    descripcion: "Pedro Ramírez - Interés en seguro de flota",
    fecha: "2024-09-25T10:00:00",
    clienteId: "1",
  },
  {
    id: "8",
    tipo: "renovacion",
    titulo: "Renovación completada",
    descripcion: "Carlos Rodríguez - QUA-AUTO-2024-002",
    fecha: "2024-09-20T15:30:00",
    clienteId: "2",
    polizaId: "3",
  },
]
