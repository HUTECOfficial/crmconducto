/**
 * Tutoriales en video del CRM. Los archivos viven en el bucket R2 `conducto-crm-tutoriales`
 * (carpeta `tutoriales/`) y la página sólo los enlaza por URL: no pesan en el sitio.
 * La URL base se configura en NEXT_PUBLIC_TUTORIALES_URL, p. ej.
 * https://pub-xxxxxxxx.r2.dev/tutoriales
 */
export interface Tutorial {
  id: string
  archivo: string
  titulo: string
  descripcion: string
  /** Pantalla del CRM de la que trata, para ir directo a practicar. */
  ruta?: string
}

export const TUTORIALES: Tutorial[] = [
  { id: "01", archivo: "01_Conducto_CRM_Bienvenida_Dashboard.mp4", titulo: "Bienvenida y Dashboard", descripcion: "Recorrido general del CRM y cómo leer el resumen de la cartera.", ruta: "/" },
  { id: "02", archivo: "02_Conducto_CRM_Prospeccion.mp4", titulo: "Prospección", descripcion: "Registrar prospectos y darles seguimiento hasta convertirlos en clientes.", ruta: "/prospeccion" },
  { id: "03", archivo: "03_Conducto_CRM_Clientes.mp4", titulo: "Clientes", descripcion: "Alta, búsqueda y expediente de clientes con sus documentos.", ruta: "/clientes" },
  { id: "04", archivo: "04_Conducto_CRM_Polizas.mp4", titulo: "Pólizas", descripcion: "Capturar, editar y renovar pólizas; recibos y vigencias.", ruta: "/polizas" },
  { id: "05", archivo: "05_Conducto_CRM_Cobranza_Pagos.mp4", titulo: "Cobranza y pagos", descripcion: "Pólizas pendientes de pago, semáforo, registrar y validar pagos.", ruta: "/polizas-pendientes" },
  { id: "06", archivo: "06_Conducto_CRM_Operacion.mp4", titulo: "Operación", descripcion: "Folios, siniestros y movimientos del día a día.", ruta: "/folios" },
  { id: "07", archivo: "07_Conducto_CRM_Agenda.mp4", titulo: "Agenda", descripcion: "Calendario, notificaciones, tareas y recordatorios.", ruta: "/calendario" },
  { id: "08", archivo: "08_Conducto_CRM_Indicadores_Comisiones.mp4", titulo: "Indicadores y comisiones", descripcion: "Indicadores de cobranza y control de comisiones por recibo.", ruta: "/indicadores-cobranza" },
  { id: "09", archivo: "09_Conducto_CRM_Reportes.mp4", titulo: "Reportes", descripcion: "Producción por compañía y ramo, y reportes de la cartera.", ruta: "/reportes" },
  { id: "10", archivo: "10_Conducto_CRM_Administracion.mp4", titulo: "Administración", descripcion: "Usuarios, ajustes y bitácora de actividad.", ruta: "/usuarios" },
]

export function urlTutorial(tutorial: Tutorial, base = process.env.NEXT_PUBLIC_TUTORIALES_URL): string | null {
  if (!base) return null
  return `${base.replace(/\/+$/, "")}/${encodeURIComponent(tutorial.archivo)}`
}
