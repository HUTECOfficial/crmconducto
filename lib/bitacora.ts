export type AccionBitacora = 'consulta' | 'alta' | 'modificacion' | 'eliminacion' | 'sesion'

export interface EntradaBitacora {
  id: number
  createdAt: string
  usuarioNombre?: string
  usuarioEmail?: string
  usuarioRol?: string
  accion: AccionBitacora
  entidad: string
  entidadId?: string
  etiqueta?: string
  polizaId?: string
  polizaNumero?: string
  clienteId?: string
  clienteNombre?: string
  descripcion?: string
  cambios?: Record<string, { antes: unknown; despues: unknown }>
  registro?: Record<string, unknown>
  cantidad?: number
  pantalla?: string
  ruta?: string
  origen: 'app' | 'base' | 'reconstruido'
}

export const mapEntradaBitacora = (item: any): EntradaBitacora => ({
  id: item.id,
  createdAt: item.created_at,
  usuarioNombre: item.usuario_nombre || undefined,
  usuarioEmail: item.usuario_email || undefined,
  usuarioRol: item.usuario_rol || undefined,
  accion: item.accion,
  entidad: item.entidad,
  entidadId: item.entidad_id || undefined,
  etiqueta: item.etiqueta || undefined,
  polizaId: item.poliza_id || undefined,
  polizaNumero: item.poliza_numero || undefined,
  clienteId: item.cliente_id || undefined,
  clienteNombre: item.cliente_nombre || undefined,
  descripcion: item.descripcion || undefined,
  cambios: item.cambios || undefined,
  registro: item.registro || undefined,
  cantidad: item.cantidad ?? undefined,
  pantalla: item.pantalla || undefined,
  ruta: item.ruta || undefined,
  origen: item.origen,
})

// Nombre de cada pantalla para describir las visitas.
export const PANTALLAS: Record<string, string> = {
  '/': 'Dashboard',
  '/prospeccion': 'Prospección',
  '/clientes': 'Clientes',
  '/polizas': 'Pólizas',
  '/polizas-pendientes': 'Pólizas pendientes de pago',
  '/consulta-polizas': 'Consulta de pólizas',
  '/folios': 'Folios',
  '/siniestros': 'Siniestros',
  '/movimientos': 'Movimientos',
  '/calendario': 'Calendario',
  '/calendario-notificaciones': 'Notificaciones',
  '/pagos': 'Pagos',
  '/indicadores-cobranza': 'Indicadores de cobranza',
  '/comisiones': 'Comisiones',
  '/tareas': 'Tareas',
  '/recordatorios': 'Recordatorios',
  '/reportes': 'Reportes',
  '/ajustes': 'Ajustes',
  '/usuarios': 'Usuarios',
  '/bitacora': 'Bitácora',
  '/tutoriales': 'Tutoriales',
  '/coni-telegram': 'Coni en Telegram',
  '/documentacion': 'Documentación',
  '/objetivos': 'Objetivos',
  '/multicotizador': 'Multicotizador',
  '/monse': 'Monse',
}

export const MODULOS: Record<string, string> = {
  polizas: 'Pólizas',
  pagos: 'Recibos y pagos',
  clientes: 'Clientes',
  comisiones: 'Comisiones',
  renovaciones: 'Renovaciones',
  flotilla_unidades: 'Flotillas',
  siniestros: 'Siniestros',
  folios: 'Folios',
  eventos: 'Calendario',
  prospectos: 'Prospectos',
  cliente_documentos: 'Documentos',
  usuarios: 'Usuarios',
  companias: 'Compañías',
  pantalla: 'Pantallas',
  asistente: 'Asistente Coni',
  auth: 'Sesión',
}

/** A dónde lleva el botón "Ir" de cada entrada. */
export function rutaEntrada(entrada: EntradaBitacora): string | null {
  if (entrada.ruta) return entrada.ruta
  // Si lo eliminado fue la póliza o el cliente mismo, ya no hay a dónde ir.
  const eliminado = entrada.accion === 'eliminacion'
  if (entrada.polizaId && !(eliminado && entrada.entidad === 'polizas')) return `/polizas?poliza=${entrada.polizaId}`
  if (entrada.clienteId && !(eliminado && entrada.entidad === 'clientes')) return `/clientes?cliente=${entrada.clienteId}`
  switch (entrada.entidad) {
    case 'siniestros': return '/siniestros'
    case 'folios': return '/folios'
    case 'eventos': return '/calendario'
    case 'prospectos': return '/prospeccion'
    case 'usuarios': return '/usuarios'
    case 'companias': return '/ajustes'
    default: return null
  }
}

const ETIQUETAS_CAMPO: Record<string, string> = {
  estatus: 'Estatus',
  prima: 'Prima',
  prima_total: 'Prima total',
  prima_emitida: 'Prima emitida',
  prima_cobrada: 'Prima cobrada',
  forma_pago: 'Forma de pago',
  tipo_pago: 'Tipo de pago',
  metodo_pago: 'Método de pago',
  vendedor_id: 'Vendedor',
  grupo: 'Grupo',
  ramo: 'Ramo',
  agente: 'Agente',
  numero_poliza: 'Número de póliza',
  compania_id: 'Compañía',
  cliente_id: 'Cliente',
  poliza_id: 'Póliza',
  nombre_asegurado: 'Asegurado',
  vigencia_inicio: 'Inicio de vigencia',
  vigencia_fin: 'Fin de vigencia',
  vigencia_pago_fin: 'Fin de vigencia de pago',
  vigencia_producto_fin: 'Fin de vigencia del producto',
  fecha_emision: 'Fecha de emisión',
  fecha_limite: 'Fecha límite',
  fecha_pago: 'Fecha de pago',
  ultimo_dia_pago: 'Último día de pago',
  numero_recibo: 'Número de recibo',
  total_recibos: 'Total de recibos',
  primer_recibo: 'Primer recibo',
  recibos_subsecuentes: 'Recibos subsecuentes',
  dias_gracia_primer_recibo: 'Días de gracia (1er recibo)',
  dias_gracia_subsecuentes: 'Días de gracia (subsecuentes)',
  porcentaje_comision: '% de comisión',
  porcentaje: '% de comisión',
  divisas: 'Moneda',
  moneda: 'Moneda',
  monto: 'Importe',
  monto_mxn: 'Importe en MXN',
  monto_udis: 'Importe en UDIs',
  valor_udi: 'Valor UDI',
  referencia: 'Referencia',
  referencia_pago: 'Referencia de pago',
  notas: 'Notas',
  comentarios: 'Comentarios',
  registrado_por: 'Registró',
  registrado_en: 'Registrado el',
  validado_por: 'Validó',
  validado_en: 'Validado el',
  cancelado_por: 'Canceló',
  cancelado_en: 'Cancelado el',
  anulado_por: 'Anuló',
  anulado_en: 'Anulado el',
  motivo_cancelacion: 'Motivo de cancelación',
  motivo_anulacion: 'Motivo de anulación',
  comprobante_url: 'Comprobante',
  renovacion_estado: 'Estado de renovación',
  nombre: 'Nombre',
  email: 'Correo',
  telefono: 'Teléfono',
  telefonos: 'Teléfonos',
  empresa: 'Empresa',
  rfc: 'RFC',
  direccion: 'Dirección',
  ciudad: 'Ciudad',
  estado: 'Estado',
  codigo_postal: 'Código postal',
  titulo: 'Título',
  activa: 'Activa',
  activo: 'Activo',
  recibo: 'Recibo',
  unidad: 'Unidad',
}

/** El historial de pólizas usa nombres de la app (vendedorId); la base, de columna (vendedor_id). */
export function etiquetaCampo(campo: string): string {
  const columna = campo.replace(/[A-Z]/g, letra => `_${letra.toLowerCase()}`)
  if (ETIQUETAS_CAMPO[columna]) return ETIQUETAS_CAMPO[columna]
  const texto = columna.replace(/_id$/, '').replace(/_/g, ' ')
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export const CAMPOS_OCULTOS = new Set(['id', 'created_at', 'updated_at', 'comprobante_path', 'fechas_recordatorio'])

export interface GrupoBitacora {
  principal: EntradaBitacora
  relacionadas: EntradaBitacora[]
}

const VENTANA_GRUPO_MS = 20_000

/**
 * Junta los cambios que un mismo usuario hizo sobre la misma póliza o cliente en ráfaga
 * (guardar una póliza también toca sus recibos). Espera las entradas de la más reciente
 * a la más antigua.
 */
export function agruparEntradas(entradas: EntradaBitacora[]): GrupoBitacora[] {
  const grupos: GrupoBitacora[] = []
  const objeto = (entrada: EntradaBitacora) =>
    entrada.polizaId || entrada.clienteId || `${entrada.entidad}:${entrada.entidadId || ''}`
  const agrupable = (entrada: EntradaBitacora) =>
    entrada.accion !== 'consulta' && entrada.accion !== 'sesion' && !entrada.cantidad

  for (const entrada of entradas) {
    const actual = grupos[grupos.length - 1]
    const ultima = actual ? (actual.relacionadas[actual.relacionadas.length - 1] || actual.principal) : null
    if (
      actual && ultima && agrupable(entrada) && agrupable(actual.principal) &&
      entrada.usuarioEmail === actual.principal.usuarioEmail &&
      entrada.origen === actual.principal.origen &&
      objeto(entrada) === objeto(actual.principal) &&
      Date.parse(ultima.createdAt) - Date.parse(entrada.createdAt) <= VENTANA_GRUPO_MS
    ) {
      actual.relacionadas.push(entrada)
      continue
    }
    grupos.push({ principal: entrada, relacionadas: [] })
  }

  // Encabeza el grupo el cambio a la póliza o al cliente, no el de un recibo.
  for (const grupo of grupos) {
    const todas = [grupo.principal, ...grupo.relacionadas]
    const indice = todas.findIndex(entrada => entrada.entidad === 'polizas' || entrada.entidad === 'clientes')
    if (indice > 0) {
      const [principal] = todas.splice(indice, 1)
      grupo.principal = principal
      grupo.relacionadas = todas
    }
  }
  return grupos
}
