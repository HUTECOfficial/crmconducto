"use client"

import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { textoBuscablePoliza } from '@/lib/busqueda'
import { useAuth } from '@/contexts/auth-context'
import { auditLogger, AuditEventType } from '@/lib/security/audit-logger'
import { calcularMontoMxnUdis, calcularPrimaTotalPlazo, calcularVigenciasPoliza, completarImportesComprometidos, diasGraciaObservados, generarRecibos, reciboComprometido, reciboPorCobrar, type EstadoRecibo } from '@/lib/payment-schedule'
import { compareDateOnly, todayDateOnly } from '@/lib/date-only'
import type { Ramo } from '@/lib/ramos'
import { baseComisionRecibo, calcularComision, estadoComisionAlAnularPago, type EstadoComision } from '@/lib/comisiones'
import { cancelarEstadoRenovacion, completarEstadoRenovacion, iniciarEstadoRenovacion } from '@/lib/renewal-state'
import { normalizarNumeroInciso, numeroIncisoDisponible, validarNumeroInciso } from '@/lib/fleet'

// Tipos
export interface ClienteTelefono {
  canal: 'whatsapp' | 'telegram' | 'celular' | 'fijo' | 'otro'
  numero: string
  principal?: boolean
}

export interface Cliente {
  id: string
  nombre: string
  email: string
  telefono: string
  telefonos?: ClienteTelefono[]
  empresa?: string
  rfc?: string
  direccion?: string
  ciudad?: string
  estado?: string
  codigoPostal?: string
  fechaRegistro: string
  estatus: 'activo' | 'inactivo'
  notas?: string
}

export interface Compania {
  id: string
  nombre: string
  color: string
  logo?: string
  contacto?: string
  telefono?: string
  email?: string
}

export interface Poliza {
  id: string
  clienteId: string
  companiaId: string
  ramo: Ramo
  /** Grupo o colectividad (Vida, GMM y AP colectivos). */
  grupo?: string
  /** % de comisión del agente sobre cada recibo validado. */
  porcentajeComision?: number
  numeroPoliza: string
  vigenciaInicio: string
  vigenciaFin: string
  vigenciaPagoFin?: string
  vigenciaProductoFin?: string
  prima: number
  formaPago: 'mensual' | 'trimestral' | 'semestral' | 'anual'
  estatus: 'activa' | 'por-renovar' | 'renovada' | 'vencida' | 'cancelada' | 'gracia' | 'rehabilitada' | 'vigente' | 'en-movimientos' | 'cancelada-cliente' | 'cancelada-falta-pago' | 'espera-formato' | 'rechazo-bancario'
  renovacionEstado?: 'sin_iniciar' | 'pendiente' | 'en_proceso' | 'renovada' | 'cancelada'
  renovadaDesdeId?: string
  renovadaAId?: string
  vendedorId?: string
  folios?: string[]
  tramites?: number
  primaEmitida: number
  primaCobrada: number
  fechaEmision: string
  periodoGracia?: string
  cancelacionMotivo?: 'falta-pago' | 'cliente' | 'otro'
  rehabilitacionFecha?: string
  agente?: string
  incisoEndoso?: string
  nombreAsegurado?: string
  ultimoDiaPago?: string
  numeroRecibo?: string
  primaTotalRecibo?: number
  registroSistemaCobranza?: boolean
  fechasRecordatorio?: {
    fecha1?: string
    fecha2?: string
    fecha3?: string
    /** Recibo al que pertenecen los recordatorios; al avanzar de recibo se reinician. */
    reciboId?: string
    /** Rechazos del cargo del recibo actual; se reinician cuando cambia el recibo. */
    rechazo?: { reciboId: string; fecha1?: string; fecha2?: string }
  }
  comentarios?: string
  notas?: string
  marcaActualizacion?: boolean
  // Campos exclusivos de seguros de vida (plazos expresados en años)
  vigenciaVidaPago?: number
  vigenciaVidaProducto?: number
  // Se conserva para poder leer registros creados antes de los nuevos campos.
  anosVidaProducto?: number
  tipoPago?: string
  primerRecibo?: number
  recibosSubsecuentes?: number
  primaTotal?: number
  diasGraciaPrimerRecibo?: number
  diasGraciaSubsecuentes?: number
  divisas?: string
  valorUdiInicial?: number
  vehiculoAmis?: string
  vehiculoClave?: string
  vehiculoDescripcion?: string
  vehiculoModelo?: string
}

export interface VehiculoAxa {
  id: string
  amis?: string
  claveCot?: string
  marcaDescripcion?: string
  modelos?: string
  tipo?: string
  ocupantes?: string
  equipamiento?: string
  descripcionDetallada?: string
}

export interface UsuarioSistema {
  id: string
  nombre: string
  email: string
  rol: string
  activo: boolean
}

export interface PagoPoliza {
  id: string
  polizaId: string
  clienteId: string
  monto: number
  numeroRecibo: number
  totalRecibos: number
  anualidad: number
  moneda: string
  montoUdis?: number
  valorUdi?: number
  montoMxn?: number
  fechaEmision: string
  fechaLimite: string
  fechaPago?: string
  metodoPago?: string
  referencia?: string
  estatus: EstadoRecibo
  notas?: string
  anuladoEn?: string
  anuladoPor?: string
  motivoAnulacion?: string
  registradoEn?: string
  registradoPor?: string
  validadoEn?: string
  validadoPor?: string
  comprobanteUrl?: string
  comprobantePath?: string
  /** Fecha del valor UDI aplicado (la fecha de pago). */
  fechaValorUdi?: string
}

export interface DatosRegistroPago {
  metodoPago: string
  /** Fecha en que el cliente pagó; por defecto hoy. En UDIS define el valor UDI aplicado. */
  fechaPago?: string
  referencia?: string
  notas?: string
  valorUdi?: number
  /** Fecha a la que corresponde valorUdi; debe ser igual a fechaPago. */
  fechaValorUdi?: string
  comprobante?: File | null
}

export interface Comision {
  id: string
  polizaId: string
  pagoId: string
  vendedorId?: string
  numeroRecibo: number
  anualidad: number
  base: number
  porcentaje: number
  monto: number
  estatus: EstadoComision
  generadaEn: string
  pagadaEn?: string
  referenciaPago?: string
  canceladaEn?: string
  motivoCancelacion?: string
  notas?: string
}

type CambiosRegeneracion = Partial<Pick<Poliza, 'prima' | 'primaTotal' | 'formaPago' | 'vigenciaInicio' | 'vigenciaFin' | 'vigenciaPagoFin' | 'primerRecibo' | 'divisas' | 'diasGraciaPrimerRecibo' | 'diasGraciaSubsecuentes'>>

const ESTATUS_POLIZA_CANCELADA: Poliza['estatus'][] = ['cancelada', 'cancelada-cliente', 'cancelada-falta-pago']

/**
 * Supabase (PostgREST) regresa como máximo 1000 filas por consulta. Para tablas que pasan de
 * eso (pólizas, recibos, clientes) se piden por páginas hasta traerlas todas.
 * La consulta debe llevar un orden estable (se agrega `id` como desempate).
 */
async function seleccionarTodo(
  consulta: (desde: number, hasta: number) => PromiseLike<{ data: any[] | null; error: any }>,
): Promise<any[]> {
  // Supabase entrega máximo 1,000 filas por petición: se piden de 4 en 4 páginas a la vez
  // en lugar de una tras otra, lo que reduce a la mitad o menos la carga de pólizas y recibos.
  const TAMANO_PAGINA = 1000
  const PAGINAS_EN_PARALELO = 4
  const filas: any[] = []
  for (let desde = 0; ; desde += TAMANO_PAGINA * PAGINAS_EN_PARALELO) {
    const respuestas = await Promise.all(Array.from({ length: PAGINAS_EN_PARALELO }, (_, indice) => {
      const inicio = desde + indice * TAMANO_PAGINA
      return consulta(inicio, inicio + TAMANO_PAGINA - 1)
    }))
    for (const { data, error } of respuestas) {
      if (error) throw error
      filas.push(...(data || []))
      if (!data || data.length < TAMANO_PAGINA) return filas
    }
  }
}

function mapearPoliza(p: any): Poliza {
  // Algunas pólizas históricas sólo tenían prima. Usarla como respaldo evita
  // que Cobranza las interprete erróneamente como pólizas de $0.
  const prima = Number(p.prima || 0)
  const primaEmitida = Number(p.prima_emitida || 0) > 0 ? Number(p.prima_emitida) : prima
  const primaPrimerRecibo = Number(p.primer_recibo || 0)
  const primaTotalRecibo = Number(p.prima_total_recibo || 0) > 0
    ? Number(p.prima_total_recibo)
    : (primaPrimerRecibo > 0 ? primaPrimerRecibo : prima)

  return {
    id: p.id,
    clienteId: p.cliente_id,
    companiaId: p.compania_id,
    ramo: p.ramo as Poliza['ramo'],
    grupo: p.grupo || undefined,
    porcentajeComision: p.porcentaje_comision == null ? undefined : Number(p.porcentaje_comision),
    numeroPoliza: p.numero_poliza,
    vigenciaInicio: p.vigencia_inicio,
    vigenciaFin: p.vigencia_fin,
    vigenciaPagoFin: p.vigencia_pago_fin || undefined,
    vigenciaProductoFin: p.vigencia_producto_fin || undefined,
    prima,
    formaPago: p.forma_pago as Poliza['formaPago'],
    estatus: p.estatus as Poliza['estatus'],
    renovacionEstado: p.renovacion_estado || (p.estatus === 'por-renovar' ? 'pendiente' : 'sin_iniciar'),
    renovadaDesdeId: p.renovada_desde_id || undefined,
    renovadaAId: p.renovada_a_id || undefined,
    vendedorId: p.vendedor_id || undefined,
    folios: p.folios || [],
    tramites: p.tramites || 0,
    primaEmitida,
    primaCobrada: p.prima_cobrada || 0,
    fechaEmision: p.fecha_emision,
    periodoGracia: p.periodo_gracia || undefined,
    cancelacionMotivo: p.cancelacion_motivo as Poliza['cancelacionMotivo'] || undefined,
    rehabilitacionFecha: p.rehabilitacion_fecha || undefined,
    agente: p.agente || undefined,
    incisoEndoso: p.inciso_endoso || undefined,
    nombreAsegurado: p.nombre_asegurado || undefined,
    ultimoDiaPago: p.ultimo_dia_pago || undefined,
    numeroRecibo: p.numero_recibo || undefined,
    primaTotalRecibo,
    registroSistemaCobranza: p.registro_sistema_cobranza || false,
    fechasRecordatorio: p.fechas_recordatorio || undefined,
    comentarios: p.comentarios || undefined,
    notas: p.notas || undefined,
    marcaActualizacion: p.marca_actualizacion || false,
    vigenciaVidaPago: p.vigencia_vida_pago ?? undefined,
    vigenciaVidaProducto: p.vigencia_vida_producto ?? p.anos_vida_producto ?? undefined,
    anosVidaProducto: p.anos_vida_producto ?? undefined,
    primerRecibo: p.primer_recibo ?? undefined,
    recibosSubsecuentes: p.recibos_subsecuentes ?? undefined,
    diasGraciaPrimerRecibo: p.dias_gracia_primer_recibo ?? undefined,
    diasGraciaSubsecuentes: p.dias_gracia_subsecuentes ?? undefined,
    tipoPago: p.tipo_pago || undefined,
    primaTotal: p.prima_total ?? undefined,
    divisas: p.divisas || undefined,
    valorUdiInicial: p.valor_udi_inicial ?? undefined,
    vehiculoAmis: p.vehiculo_amis || undefined,
    vehiculoClave: p.vehiculo_clave || undefined,
    vehiculoDescripcion: p.vehiculo_descripcion || undefined,
    vehiculoModelo: p.vehiculo_modelo || undefined,
  }
}

function mapearPago(item: any): PagoPoliza {
  return {
    id: item.id,
    polizaId: item.poliza_id,
    clienteId: item.cliente_id,
    monto: Number(item.monto || 0),
    numeroRecibo: Number(item.numero_recibo || 1),
    totalRecibos: Number(item.total_recibos || 1),
    anualidad: Number(item.anualidad || 1),
    moneda: item.moneda || 'MXN',
    montoUdis: item.monto_udis == null ? undefined : Number(item.monto_udis),
    valorUdi: item.valor_udi == null ? undefined : Number(item.valor_udi),
    montoMxn: item.monto_mxn == null ? undefined : Number(item.monto_mxn),
    fechaEmision: item.fecha_emision || item.created_at?.slice(0, 10),
    fechaLimite: item.fecha_limite || item.created_at?.slice(0, 10),
    fechaPago: item.fecha_pago || undefined,
    metodoPago: item.metodo_pago || undefined,
    referencia: item.referencia || undefined,
    estatus: item.estatus as EstadoRecibo,
    notas: item.notas || undefined,
    anuladoEn: item.anulado_en || undefined,
    anuladoPor: item.anulado_por || undefined,
    motivoAnulacion: item.motivo_anulacion || undefined,
    registradoEn: item.registrado_en || undefined,
    registradoPor: item.registrado_por || undefined,
    validadoEn: item.validado_en || undefined,
    validadoPor: item.validado_por || undefined,
    comprobanteUrl: item.comprobante_url || undefined,
    comprobantePath: item.comprobante_path || undefined,
    fechaValorUdi: item.fecha_valor_udi || undefined,
  }
}

export interface Renovacion {
  id: string
  polizaOrigenId: string
  polizaRenovadaId?: string
  estado: 'pendiente' | 'en_proceso' | 'renovada' | 'cancelada'
  estatusPolizaAnterior: string
  iniciadaPor?: string
  completadaPor?: string
  canceladaPor?: string
  motivoCancelacion?: string
  iniciadaEn: string
  completadaEn?: string
  canceladaEn?: string
}

export interface PolizaHistorial {
  id: string
  polizaId: string
  tipoCambio: string
  campo?: string
  valorAnterior?: unknown
  valorNuevo?: unknown
  usuarioId?: string
  usuarioNombre?: string
  usuarioEmail?: string
  metadata: Record<string, unknown>
  createdAt: string
}

export interface FlotillaUnidad {
  id: string
  flotillaId: string
  polizaId: string
  numeroInciso: string
  descripcion?: string
  marca?: string
  modelo?: string
  placas?: string
  numeroSerie?: string
  primaTotal?: number
  activa: boolean
}

export interface FolioRegistro {
  id: string
  numeroFolio: string
  categoria: string
  subcategoria: string
  movimiento: 'indiv' | 'colectivo'
  fechaIngreso: string
  compania: string
  comentarios?: string
  responsable?: string
}

export interface SiniestroRegistro {
  id: string
  numeroFolio: string
  tipo: 'membresia' | 'programacion' | 'autos' | 'vida'
  movimiento: 'indiv' | 'colectivo'
  fechaIngreso: string
  compania: string
  comentarios?: string
  responsable?: string
  vistoBueno: boolean
  fechaVistoBueno?: string
}

export interface Prospecto {
  id: string
  nombre: string
  email: string
  telefono: string
  empresa?: string
  origen: string
  interes: string
  prioridad: 'alta' | 'media' | 'baja'
  estatus: 'nuevo' | 'contactado' | 'en-seguimiento' | 'convertido' | 'perdido' | 'aprobado' | 'rechazado'
  fechaContacto: string
  notas?: string
  asignadoA?: string
}

export interface DocumentoCliente {
  id: string
  clienteId: string
  nombre: string
  tipo: string
  tamaño: number
  url: string
  storagePath: string
  creadoEn: string
}

export interface Evento {
  id: string
  titulo: string
  descripcion?: string
  fecha: string
  hora?: string
  tipo: 'renovacion' | 'pago' | 'cita' | 'recordatorio' | 'otro'
  prioridad: 'alta' | 'media' | 'baja'
  polizaId?: string
  clienteId?: string
  completado: boolean
}

interface SupabaseContextType {
  // Clientes
  clientes: Cliente[]
  loadingClientes: boolean
  agregarCliente: (cliente: Omit<Cliente, 'id'>) => Promise<string | null>
  actualizarCliente: (id: string, cliente: Partial<Cliente>) => Promise<void>
  eliminarCliente: (id: string) => Promise<void>
  
  // Compañías
  companias: Compania[]
  loadingCompanias: boolean
  
  // Pólizas
  polizas: Poliza[]
  loadingPolizas: boolean

  // Índices para buscar por id sin recorrer las listas completas en cada fila.
  polizasPorId: Map<string, Poliza>
  clientesPorId: Map<string, Cliente>
  companiasPorId: Map<string, Compania>
  pagosPorPoliza: Map<string, PagoPoliza[]>
  /** Texto normalizado de cada póliza para el buscador (ver lib/busqueda.ts). */
  textoBusquedaPoliza: Map<string, string>
  agregarPoliza: (poliza: Omit<Poliza, 'id'>) => Promise<string | null>
  actualizarPoliza: (id: string, poliza: Partial<Poliza>) => Promise<void>
  eliminarPoliza: (id: string) => Promise<void>

  usuariosSistema: UsuarioSistema[]
  pagos: PagoPoliza[]
  loadingPagos: boolean
  /** Registra el pago de un recibo; queda "por validar" hasta que alguien lo valide. */
  registrarPago: (pagoId: string, datos: DatosRegistroPago) => Promise<void>
  validarPago: (pagoId: string) => Promise<void>
  /** Regresa a pendiente un recibo pagado o por validar (anulación o rechazo). */
  anularPago: (pagoId: string, motivo: string) => Promise<void>
  regenerarRecibosPoliza: (polizaId: string, cambios?: CambiosRegeneracion) => Promise<void>

  comisiones: Comision[]
  marcarComisionesPagadas: (ids: string[], datos: { fecha: string; referencia?: string }) => Promise<void>
  /** Cierra una comisión por revertir una vez descontada por la aseguradora. */
  resolverComisionPorRevertir: (id: string, notas: string) => Promise<void>
  /** Genera las comisiones que falten para recibos ya validados. Devuelve cuántas se crearon. */
  generarComisionesFaltantes: () => Promise<number>

  renovaciones: Renovacion[]
  iniciarRenovacion: (polizaId: string) => Promise<string | null>
  completarRenovacion: (renovacionId: string, polizaRenovadaId: string) => Promise<void>
  cancelarRenovacion: (polizaId: string, motivo: string) => Promise<void>

  historialPolizas: PolizaHistorial[]
  flotillaUnidades: FlotillaUnidad[]
  agregarUnidadFlotilla: (polizaId: string, unidad: Omit<FlotillaUnidad, 'id' | 'flotillaId' | 'polizaId'>) => Promise<void>
  actualizarUnidadFlotilla: (id: string, unidad: Partial<Omit<FlotillaUnidad, 'id' | 'flotillaId' | 'polizaId'>>) => Promise<void>
  desactivarUnidadFlotilla: (id: string) => Promise<void>
  
  // Vehículos AXA
  buscarVehiculos: (query: string) => Promise<VehiculoAxa[]>
  
  // Prospectos
  prospectos: Prospecto[]
  loadingProspectos: boolean
  agregarProspecto: (prospecto: Omit<Prospecto, 'id'>) => Promise<string | null>
  actualizarProspecto: (id: string, prospecto: Partial<Prospecto>) => Promise<void>
  eliminarProspecto: (id: string) => Promise<void>

  // Folios
  foliosRegistro: FolioRegistro[]
  loadingFolios: boolean
  agregarFolio: (folio: Omit<FolioRegistro, 'id'>) => Promise<string | null>
  actualizarFolio: (id: string, folio: Partial<FolioRegistro>) => Promise<void>
  eliminarFolio: (id: string) => Promise<void>

  // Siniestros
  siniestrosRegistro: SiniestroRegistro[]
  loadingSiniestros: boolean
  agregarSiniestro: (siniestro: Omit<SiniestroRegistro, 'id'>) => Promise<string | null>
  actualizarSiniestro: (id: string, siniestro: Partial<SiniestroRegistro>) => Promise<void>
  eliminarSiniestro: (id: string) => Promise<void>
  darVistoBueno: (id: string) => Promise<void>
  
  // Vencidos
  marcarComoVencido: (polizaId: string, motivo: string) => Promise<void>
  
  // Eventos del calendario
  eventos: Evento[]
  loadingEventos: boolean
  agregarEvento: (evento: Omit<Evento, 'id'>) => Promise<string | null>
  actualizarEvento: (id: string, evento: Partial<Evento>) => Promise<void>
  eliminarEvento: (id: string) => Promise<void>
  
  // Documentos de clientes
  uploadDocumentoCliente: (clienteId: string, file: File) => Promise<DocumentoCliente | null>
  getDocumentosCliente: (clienteId: string) => Promise<DocumentoCliente[]>
  eliminarDocumentoCliente: (doc: DocumentoCliente) => Promise<void>

  // Refetch
  refetchAll: () => Promise<void>
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth()
  // Estados
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loadingClientes, setLoadingClientes] = useState(true)
  
  const [companias, setCompanias] = useState<Compania[]>([])
  const [loadingCompanias, setLoadingCompanias] = useState(true)
  
  const [polizas, setPolizas] = useState<Poliza[]>([])
  const [loadingPolizas, setLoadingPolizas] = useState(true)
  const [usuariosSistema, setUsuariosSistema] = useState<UsuarioSistema[]>([])
  const [pagos, setPagos] = useState<PagoPoliza[]>([])
  const [comisiones, setComisiones] = useState<Comision[]>([])
  const [loadingPagos, setLoadingPagos] = useState(true)
  const [renovaciones, setRenovaciones] = useState<Renovacion[]>([])
  const [historialPolizas, setHistorialPolizas] = useState<PolizaHistorial[]>([])
  const [flotillaUnidades, setFlotillaUnidades] = useState<FlotillaUnidad[]>([])
  
  const [prospectos, setProspectos] = useState<Prospecto[]>([])
  const [loadingProspectos, setLoadingProspectos] = useState(true)
  
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loadingEventos, setLoadingEventos] = useState(true)

  const [foliosRegistro, setFoliosRegistro] = useState<FolioRegistro[]>([])
  const [loadingFolios, setLoadingFolios] = useState(true)

  const [siniestrosRegistro, setSiniestrosRegistro] = useState<SiniestroRegistro[]>([])
  const [loadingSiniestros, setLoadingSiniestros] = useState(true)

  // ==================== CLIENTES ====================
  const fetchClientes = async () => {
    try {
      setLoadingClientes(true)
      const data = await seleccionarTodo((desde, hasta) => supabase
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false })
        .order('id')
        .range(desde, hasta))

      const mapped: Cliente[] = (data || []).map((c: any) => ({
        id: c.id,
        nombre: c.nombre,
        email: c.email || '',
        telefono: c.telefono,
        telefonos: c.telefonos || [],
        empresa: c.empresa || undefined,
        rfc: c.rfc || undefined,
        direccion: c.direccion || undefined,
        ciudad: c.ciudad || undefined,
        estado: c.estado || undefined,
        codigoPostal: c.codigo_postal || undefined,
        fechaRegistro: c.fecha_registro,
        estatus: c.estatus as Cliente['estatus'],
        notas: c.notas || undefined,
      }))

      setClientes(mapped)
    } catch (err: any) {
      console.error('Error fetching clientes:', err.message)
    } finally {
      setLoadingClientes(false)
    }
  }

  const agregarCliente = async (cliente: Omit<Cliente, 'id'>): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .insert([{
          nombre: cliente.nombre,
          email: cliente.email || null,
          telefono: cliente.telefono,
          empresa: cliente.empresa || null,
          rfc: cliente.rfc || null,
          direccion: cliente.direccion || null,
          ciudad: cliente.ciudad || null,
          estado: cliente.estado || null,
          codigo_postal: cliente.codigoPostal || null,
          fecha_registro: cliente.fechaRegistro,
          estatus: cliente.estatus,
          notas: cliente.notas || null,
        }])
        .select()
        .single()

      if (error) throw error

      toast.success('Cliente creado exitosamente')
      await fetchClientes()
      return data.id
    } catch (err: any) {
      toast.error('Error al crear cliente: ' + err.message)
      return null
    }
  }

  const actualizarCliente = async (id: string, cliente: Partial<Cliente>) => {
    try {
      const updateData: any = {}
      if (cliente.nombre !== undefined) updateData.nombre = cliente.nombre
      if (cliente.email !== undefined) updateData.email = cliente.email || null
      if (cliente.telefono !== undefined) updateData.telefono = cliente.telefono
      if (cliente.telefonos !== undefined) updateData.telefonos = cliente.telefonos || null
      if (cliente.empresa !== undefined) updateData.empresa = cliente.empresa || null
      if (cliente.rfc !== undefined) updateData.rfc = cliente.rfc || null
      if (cliente.direccion !== undefined) updateData.direccion = cliente.direccion || null
      if (cliente.ciudad !== undefined) updateData.ciudad = cliente.ciudad || null
      if (cliente.estado !== undefined) updateData.estado = cliente.estado || null
      if (cliente.codigoPostal !== undefined) updateData.codigo_postal = cliente.codigoPostal || null
      if (cliente.estatus !== undefined) updateData.estatus = cliente.estatus
      if (cliente.notas !== undefined) updateData.notas = cliente.notas || null

      const { error } = await supabase
        .from('clientes')
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      toast.success('Cliente actualizado')
      await fetchClientes()
    } catch (err: any) {
      toast.error('Error al actualizar cliente: ' + err.message)
    }
  }

  const eliminarCliente = async (id: string) => {
    try {
      const { error } = await supabase.from('clientes').delete().eq('id', id)
      if (error) throw error
      toast.success('Cliente eliminado')
      await fetchClientes()
    } catch (err: any) {
      toast.error('Error al eliminar cliente: ' + err.message)
    }
  }

  // ==================== COMPAÑÍAS ====================
  const fetchCompanias = async () => {
    try {
      setLoadingCompanias(true)
      const { data, error } = await supabase
        .from('companias')
        .select('*')
        .order('nombre')

      if (error) throw error

      const mapped: Compania[] = (data || []).map((c: any) => ({
        id: c.id,
        nombre: c.nombre,
        color: c.color,
        logo: c.logo || undefined,
        contacto: c.contacto || undefined,
        telefono: c.telefono || undefined,
        email: c.email || undefined,
      }))

      setCompanias(mapped)
    } catch (err: any) {
      console.error('Error fetching companias:', err.message)
    } finally {
      setLoadingCompanias(false)
    }
  }

  // ==================== PÓLIZAS ====================
  const fetchPolizas = async () => {
    try {
      setLoadingPolizas(true)
      const data = await seleccionarTodo((desde, hasta) => supabase
        .from('polizas')
        .select('*')
        .order('created_at', { ascending: false })
        .order('id')
        .range(desde, hasta))

      const mapped: Poliza[] = (data || []).map(mapearPoliza)

      setPolizas(mapped)
    } catch (err: any) {
      console.error('Error fetching polizas:', err.message)
    } finally {
      setLoadingPolizas(false)
    }
  }

  const getActor = () => usuariosSistema.find(item => item.email === usuario?.email)

  /**
   * Vuelve a leer sólo las pólizas indicadas y sus recibos, y los reemplaza en memoria.
   * Recargar todas las pólizas y recibos tras cada guardado bajaba ~13 MB cada vez.
   */
  const refrescarPolizas = async (ids: Array<string | undefined>) => {
    const polizaIds = [...new Set(ids.filter((id): id is string => !!id))]
    if (!polizaIds.length) return
    const [polizasResp, pagosResp] = await Promise.all([
      supabase.from('polizas').select('*').in('id', polizaIds),
      supabase.from('pagos').select('*').in('poliza_id', polizaIds),
    ])
    if (polizasResp.error || pagosResp.error) {
      console.error('Error al refrescar pólizas:', (polizasResp.error || pagosResp.error)?.message)
      await Promise.all([fetchPolizas(), fetchPagos()])
      return
    }
    const actualizadas = new Map((polizasResp.data || []).map((item: any) => [item.id, mapearPoliza(item)]))
    setPolizas(previas => {
      const siguientes = previas
        .filter(poliza => !polizaIds.includes(poliza.id) || actualizadas.has(poliza.id))
        .map(poliza => actualizadas.get(poliza.id) || poliza)
      const nuevas = [...actualizadas.values()].filter(poliza => !previas.some(previa => previa.id === poliza.id))
      // Mismo orden que la carga completa: las más recientes primero.
      return [...nuevas, ...siguientes]
    })
    setPagos(previos => [
      ...previos.filter(pago => !polizaIds.includes(pago.polizaId)),
      ...(pagosResp.data || []).map(mapearPago),
    ].sort((left, right) => (left.fechaLimite || '').localeCompare(right.fechaLimite || '') || left.id.localeCompare(right.id)))
  }

  const fetchUsuariosSistema = async () => {
    const { data, error } = await supabase.from('usuarios').select('*').eq('activo', true).order('nombre')
    if (error) throw error
    setUsuariosSistema((data || []).map((item: any) => ({
      id: item.id,
      nombre: item.nombre,
      email: item.email,
      rol: item.rol,
      activo: item.activo,
    })))
  }

  const fetchPagos = async () => {
    try {
      setLoadingPagos(true)
      const data = await seleccionarTodo((desde, hasta) => supabase.from('pagos').select('*').order('fecha_limite').order('id').range(desde, hasta))
      setPagos(data.map(mapearPago))
    } catch (err: any) {
      console.error('Error fetching pagos:', err.message)
    } finally {
      setLoadingPagos(false)
    }
  }

  const fetchComisiones = async () => {
    let data: any[]
    try {
      data = await seleccionarTodo((desde, hasta) => supabase.from('comisiones').select('*').order('generada_en', { ascending: false }).order('id').range(desde, hasta))
    } catch (error: any) {
      if (error?.code === '42P01') return
      throw error
    }
    setComisiones((data || []).map((item: any) => ({
      id: item.id,
      polizaId: item.poliza_id,
      pagoId: item.pago_id,
      vendedorId: item.vendedor_id || undefined,
      numeroRecibo: Number(item.numero_recibo || 1),
      anualidad: Number(item.anualidad || 1),
      base: Number(item.base || 0),
      porcentaje: Number(item.porcentaje || 0),
      monto: Number(item.monto || 0),
      estatus: item.estatus as EstadoComision,
      generadaEn: item.generada_en,
      pagadaEn: item.pagada_en || undefined,
      referenciaPago: item.referencia_pago || undefined,
      canceladaEn: item.cancelada_en || undefined,
      motivoCancelacion: item.motivo_cancelacion || undefined,
      notas: item.notas || undefined,
    })))
  }

  const fetchRenovaciones = async () => {
    const { data, error } = await supabase.from('renovaciones').select('*').order('iniciada_en', { ascending: false })
    if (error) {
      if (error.code === '42P01') return
      throw error
    }
    setRenovaciones((data || []).map((item: any) => ({
      id: item.id,
      polizaOrigenId: item.poliza_origen_id,
      polizaRenovadaId: item.poliza_renovada_id || undefined,
      estado: item.estado,
      estatusPolizaAnterior: item.estatus_poliza_anterior,
      iniciadaPor: item.iniciada_por || undefined,
      completadaPor: item.completada_por || undefined,
      canceladaPor: item.cancelada_por || undefined,
      motivoCancelacion: item.motivo_cancelacion || undefined,
      iniciadaEn: item.iniciada_en,
      completadaEn: item.completada_en || undefined,
      canceladaEn: item.cancelada_en || undefined,
    })))
  }

  const fetchHistorialPolizas = async () => {
    const { data, error } = await supabase.from('poliza_historial').select('*').order('created_at', { ascending: false }).limit(1000)
    if (error) {
      if (error.code === '42P01') return
      throw error
    }
    setHistorialPolizas((data || []).map((item: any) => ({
      id: item.id,
      polizaId: item.poliza_id,
      tipoCambio: item.tipo_cambio,
      campo: item.campo || undefined,
      valorAnterior: item.valor_anterior ?? undefined,
      valorNuevo: item.valor_nuevo ?? undefined,
      usuarioId: item.usuario_id || undefined,
      usuarioNombre: item.usuario_nombre || undefined,
      usuarioEmail: item.usuario_email || undefined,
      metadata: item.metadata || {},
      createdAt: item.created_at,
    })))
  }

  const fetchFlotillaUnidades = async () => {
    let data: any[]
    try {
      data = await seleccionarTodo((desde, hasta) => supabase
        .from('flotilla_unidades')
        .select('*, flotillas!inner(poliza_id)')
        .order('numero_inciso')
        .order('id')
        .range(desde, hasta))
    } catch (error: any) {
      if (error?.code === '42P01') return
      throw error
    }
    setFlotillaUnidades((data || []).map((item: any) => ({
      id: item.id,
      flotillaId: item.flotilla_id,
      polizaId: item.flotillas.poliza_id,
      numeroInciso: item.numero_inciso,
      descripcion: item.descripcion || undefined,
      marca: item.marca || undefined,
      modelo: item.modelo || undefined,
      placas: item.placas || undefined,
      numeroSerie: item.numero_serie || undefined,
      primaTotal: item.prima_total == null ? undefined : Number(item.prima_total),
      activa: item.activa,
    })))
  }

  const registrarHistorial = async (
    polizaId: string,
    tipoCambio: string,
    campo?: string,
    valorAnterior?: unknown,
    valorNuevo?: unknown,
    metadata: Record<string, unknown> = {},
  ) => {
    const actor = getActor()
    const { error } = await supabase.from('poliza_historial').insert([{
      poliza_id: polizaId,
      tipo_cambio: tipoCambio,
      campo: campo || null,
      valor_anterior: valorAnterior === undefined ? null : valorAnterior,
      valor_nuevo: valorNuevo === undefined ? null : valorNuevo,
      usuario_id: actor?.id || null,
      usuario_nombre: usuario?.nombre || actor?.nombre || null,
      usuario_email: usuario?.email || actor?.email || null,
      metadata,
    }])
    if (error) throw error
    await auditLogger.log({
      eventType: tipoCambio === 'renovacion_completada' ? AuditEventType.POLIZA_RENEW : AuditEventType.POLIZA_UPDATE,
      userId: actor?.id || usuario?.id || null,
      userEmail: usuario?.email || actor?.email || null,
      userRole: usuario?.rol || actor?.rol || null,
      resource: 'polizas',
      resourceId: polizaId,
      action: tipoCambio,
      previousValue: valorAnterior,
      newValue: valorNuevo,
      details: { campo, ...metadata },
    })
  }

  const regenerarRecibosPoliza = async (
    polizaId: string,
    cambios: CambiosRegeneracion = {},
  ) => {
    const actual = polizas.find(item => item.id === polizaId)
    if (!actual) throw new Error('No se encontró la póliza para regenerar sus recibos')
    const cambiosDefinidos = Object.fromEntries(Object.entries(cambios).filter(([, value]) => value !== undefined))
    const configuracion = { ...actual, ...cambiosDefinidos } as Poliza
    // Se leen los recibos de la base y no del estado en memoria: otro usuario pudo registrar
    // o validar un pago desde que se cargó la página.
    const { data: recibosDb, error: recibosError } = await supabase.from('pagos').select('*').eq('poliza_id', polizaId)
    if (recibosError) throw recibosError
    const recibosActuales = (recibosDb || []).map(mapearPago)
    const pendientes = recibosActuales.filter(reciboPorCobrar)
    // Sin días de gracia capturados se respetan los que ya usan sus recibos, no los 30 por defecto.
    const graciaObservada = diasGraciaObservados(recibosActuales)
    const totalConfigurado = Number(configuracion.primaTotal || configuracion.prima || 0)
    const entradaRecibos = {
      primaTotal: totalConfigurado,
      primaAnual: configuracion.ramo === 'vida' ? configuracion.prima : undefined,
      vigenciaInicio: configuracion.vigenciaInicio,
      vigenciaFin: configuracion.ramo === 'vida' ? configuracion.vigenciaPagoFin || configuracion.vigenciaFin : configuracion.vigenciaFin,
      periodicidad: configuracion.formaPago,
      primerRecibo: configuracion.primerRecibo,
      recibosPagados: recibosActuales,
      periodicidadPagados: actual.formaPago,
      diasGraciaPrimerRecibo: configuracion.diasGraciaPrimerRecibo ?? graciaObservada.primerRecibo,
      diasGraciaSubsecuentes: configuracion.diasGraciaSubsecuentes ?? graciaObservada.subsecuentes,
    }
    // Los recibos por validar se conservan igual que los pagados: ya hay un pago registrado.
    // Los que se importaron en $0 reciben el importe que les toca para que el saldo cuadre.
    const comprometidos = completarImportesComprometidos(entradaRecibos)
    const importesCompletados = comprometidos.flatMap(recibo => {
      const original = recibosActuales.find(item => item.id === recibo.id)
      return original && original.monto !== recibo.monto ? [{ original, monto: recibo.monto }] : []
    })
    const totalComprometido = comprometidos.reduce((sum, item) => sum + item.monto, 0)
    const totalPagado = comprometidos.filter(item => item.estatus === 'pagado').reduce((sum, item) => sum + item.monto, 0)
    if (totalConfigurado < totalComprometido) throw new Error('La prima total del plazo no puede ser menor que el importe ya cobrado o por validar')
    const actor = getActor()
    let canceladosIds: string[] = []
    const restaurarPendientes = async () => {
      const cancelados = pendientes.filter(item => canceladosIds.includes(item.id))
      const resultados = await Promise.all(cancelados.map(item => supabase.from('pagos').update({
        estatus: item.estatus,
        cancelado_en: null,
        cancelado_por: null,
        motivo_cancelacion: null,
      }).eq('id', item.id)))
      const error = resultados.find(resultado => resultado.error)?.error
      if (error) throw error
    }

    if (pendientes.length > 0) {
      const { data: cancelados, error } = await supabase
        .from('pagos')
        .update({
          estatus: 'cancelado',
          cancelado_en: new Date().toISOString(),
          cancelado_por: actor?.id || null,
          motivo_cancelacion: 'regeneracion_periodicidad',
        })
        .in('id', pendientes.map(item => item.id))
        .in('estatus', ['pendiente', 'vencido'])
        .select('id')
      if (error) throw error
      canceladosIds = (cancelados || []).map((item: any) => item.id)
      if (canceladosIds.length !== pendientes.length) {
        await restaurarPendientes()
        throw new Error('Se registró un pago en esta póliza mientras se editaba; vuelve a intentarlo')
      }
    }

    const recibos = generarRecibos({ ...entradaRecibos, recibosPagados: comprometidos })

    const montosRecibo = (pago: PagoPoliza, monto: number) => ({
      monto,
      monto_udis: pago.moneda === 'UDIS' ? monto : pago.montoUdis ?? null,
      monto_mxn: pago.moneda === 'MXN' ? monto
        : pago.moneda === 'UDIS' && pago.valorUdi ? calcularMontoMxnUdis(monto, pago.valorUdi) : pago.montoMxn ?? null,
    })
    const revertirImportes = () => Promise.all(importesCompletados.map(({ original }) =>
      supabase.from('pagos').update({ monto: original.monto, monto_udis: original.montoUdis ?? null, monto_mxn: original.montoMxn ?? null }).eq('id', original.id)))
    if (importesCompletados.length > 0) {
      const resultados = await Promise.all(importesCompletados.map(({ original, monto }) =>
        supabase.from('pagos').update(montosRecibo(original, monto)).eq('id', original.id).eq('monto', original.monto)))
      const error = resultados.find(resultado => resultado.error)?.error
      if (error) {
        await revertirImportes()
        await restaurarPendientes()
        throw error
      }
    }

    if (recibos.length > 0) {
      const { data: nuevosPagos, error } = await supabase.from('pagos').insert(recibos.map(recibo => ({
        poliza_id: polizaId,
        cliente_id: configuracion.clienteId,
        monto: recibo.monto,
        numero_recibo: recibo.numeroRecibo,
        total_recibos: recibo.totalRecibos,
        anualidad: recibo.anualidad,
        moneda: configuracion.divisas || 'MXN',
        monto_udis: configuracion.divisas === 'UDIS' ? recibo.monto : null,
        fecha_emision: recibo.fechaEmision,
        fecha_limite: recibo.fechaLimite,
        estatus: recibo.estatus,
        metodo_pago: null,
      }))).select('id')
      if (error) {
        await revertirImportes()
        await restaurarPendientes()
        throw error
      }

      const { error: polizaError } = await supabase.from('polizas').update({
        prima_cobrada: totalPagado,
        numero_recibo: `${recibos[0].numeroRecibo}/${recibos[0].totalRecibos}`,
        prima_total_recibo: recibos[0].monto,
        ultimo_dia_pago: recibos[0].fechaLimite,
      }).eq('id', polizaId)
      if (polizaError) {
        if (nuevosPagos?.length) {
          await supabase.from('pagos').update({
            estatus: 'cancelado',
            cancelado_en: new Date().toISOString(),
            cancelado_por: actor?.id || null,
            motivo_cancelacion: 'error_regeneracion',
          }).in('id', nuevosPagos.map(item => item.id))
        }
        await revertirImportes()
        await restaurarPendientes()
        throw polizaError
      }
    } else {
      const ultimoPagado = [...comprometidos].sort((left, right) => right.numeroRecibo - left.numeroRecibo)[0]
      const { error } = await supabase.from('polizas').update({
        prima_cobrada: totalPagado,
        numero_recibo: ultimoPagado ? `${ultimoPagado.numeroRecibo}/${ultimoPagado.totalRecibos}` : null,
        prima_total_recibo: 0,
        ultimo_dia_pago: null,
      }).eq('id', polizaId)
      if (error) {
        await revertirImportes()
        await restaurarPendientes()
        throw error
      }
    }

    for (const { original, monto } of importesCompletados) {
      await registrarHistorial(polizaId, 'importe_recibo_completado', 'recibo', original.monto, monto, {
        pagoId: original.id,
        numeroRecibo: original.numeroRecibo,
        estatus: original.estatus,
      })
    }

    await refrescarPolizas([polizaId])
  }

  const sincronizarResumenCobranza = async (polizaId: string, metodoPago?: string) => {
    const { data: pagosActuales, error: pagosError } = await supabase
      .from('pagos')
      .select('monto, estatus, numero_recibo, total_recibos, fecha_limite')
      .eq('poliza_id', polizaId)
      .neq('estatus', 'cancelado')
    if (pagosError) throw pagosError

    const activos = pagosActuales || []
    const pagadosActuales = activos.filter((item: any) => item.estatus === 'pagado')
    // Sólo los pagos validados cuentan como prima cobrada.
    const cobrado = Math.round(pagadosActuales.reduce((sum: number, item: any) => sum + Number(item.monto), 0) * 100) / 100
    const porNumero = (left: any, right: any) => left.numero_recibo - right.numero_recibo
    // El recibo en curso es el primero sin validar: no se avanza mientras espera validación.
    const siguiente = activos.filter((item: any) => reciboPorCobrar(item) || item.estatus === 'por_validar').sort(porNumero)[0]
    const ultimoPagado = [...pagadosActuales].sort((left: any, right: any) => right.numero_recibo - left.numero_recibo)[0]
    const updateData: Record<string, unknown> = {
      prima_cobrada: cobrado,
      registro_sistema_cobranza: pagadosActuales.length > 0,
      numero_recibo: siguiente
        ? `${siguiente.numero_recibo}/${siguiente.total_recibos}`
        : ultimoPagado ? `${ultimoPagado.numero_recibo}/${ultimoPagado.total_recibos}` : null,
      prima_total_recibo: siguiente ? Number(siguiente.monto) : 0,
      ultimo_dia_pago: siguiente?.fecha_limite || null,
    }
    if (metodoPago !== undefined) updateData.tipo_pago = metodoPago || null
    const { error } = await supabase.from('polizas').update(updateData).eq('id', polizaId)
    if (error) throw error
  }

  const subirComprobantePago = async (pago: PagoPoliza, file: File) => {
    const path = `comprobantes-pagos/${pago.polizaId}/${pago.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: false, contentType: file.type || 'application/octet-stream' })
    if (error) throw new Error('No fue posible subir el comprobante: ' + error.message)
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return { path, url: data.publicUrl }
  }

  const registrarPago = async (pagoId: string, datos: DatosRegistroPago) => {
    const pago = pagos.find(item => item.id === pagoId)
    if (!pago || !reciboPorCobrar(pago)) throw new Error('El recibo ya tiene un pago registrado o fue cancelado')
    const esUdis = pago.moneda === 'UDIS'
    const valorUdi = datos.valorUdi === undefined ? undefined : Number(datos.valorUdi)
    if (esUdis && (!valorUdi || valorUdi <= 0)) throw new Error('Captura el valor UDI aplicado a este recibo')
    const fechaPago = datos.fechaPago || todayDateOnly()
    if (compareDateOnly(fechaPago, todayDateOnly()) > 0) throw new Error('La fecha de pago no puede ser futura')
    if (esUdis && datos.fechaValorUdi !== fechaPago) throw new Error('El valor UDI no corresponde a la fecha de pago; vuelve a consultarlo')
    // USD/EUR no tienen conversión: no se guarda un importe en MXN que no lo es.
    const montoMxn = esUdis ? calcularMontoMxnUdis(pago.montoUdis || pago.monto, Number(valorUdi)) : pago.moneda === 'MXN' ? pago.monto : null
    const actor = getActor()
    const comprobante = datos.comprobante ? await subirComprobantePago(pago, datos.comprobante) : undefined
    const eliminarComprobante = async () => {
      if (comprobante) await supabase.storage.from(BUCKET).remove([comprobante.path])
    }

    const { data: pagoActualizado, error } = await supabase.from('pagos').update({
      estatus: 'por_validar',
      fecha_pago: fechaPago,
      metodo_pago: datos.metodoPago,
      referencia: datos.referencia || null,
      notas: datos.notas || null,
      valor_udi: esUdis ? valorUdi : null,
      fecha_valor_udi: esUdis ? fechaPago : null,
      monto_mxn: montoMxn,
      registrado_en: new Date().toISOString(),
      registrado_por: actor?.id || null,
      validado_en: null,
      validado_por: null,
      comprobante_url: comprobante?.url || null,
      comprobante_path: comprobante?.path || null,
    }).eq('id', pagoId).in('estatus', ['pendiente', 'vencido']).select('id').maybeSingle()
    if (error || !pagoActualizado) {
      await eliminarComprobante()
      if (error) throw error
      throw new Error('El recibo ya fue registrado o cancelado por otro usuario')
    }

    try {
      await sincronizarResumenCobranza(pago.polizaId, datos.metodoPago)
    } catch (error) {
      await supabase.from('pagos').update({
        estatus: pago.estatus,
        fecha_pago: pago.fechaPago || null,
        metodo_pago: pago.metodoPago || null,
        referencia: pago.referencia || null,
        notas: pago.notas || null,
        valor_udi: pago.valorUdi ?? null,
        fecha_valor_udi: pago.fechaValorUdi ?? null,
        monto_mxn: pago.montoMxn ?? null,
        registrado_en: null,
        registrado_por: null,
        comprobante_url: null,
        comprobante_path: null,
      }).eq('id', pagoId)
      await eliminarComprobante()
      throw error
    }

    await registrarHistorial(pago.polizaId, 'pago_registrado', 'recibo', pago.estatus, 'por_validar', {
      pagoId,
      numeroRecibo: pago.numeroRecibo,
      anualidad: pago.anualidad,
      monto: pago.monto,
      moneda: pago.moneda,
      valorUdi: esUdis ? valorUdi : undefined,
      fechaValorUdi: esUdis ? fechaPago : undefined,
      fechaPago,
      montoMxn,
      metodoPago: datos.metodoPago,
      referencia: datos.referencia,
      comprobanteUrl: comprobante?.url,
    })
    await Promise.all([refrescarPolizas([pago.polizaId]), fetchHistorialPolizas()])
    toast.success(`Pago del recibo ${pago.numeroRecibo}/${pago.totalRecibos} registrado; queda pendiente de validar`)
  }

  // ==================== COMISIONES ====================
  const generarComisionRecibo = async (pago: PagoPoliza): Promise<boolean> => {
    const poliza = polizas.find(item => item.id === pago.polizaId)
    const porcentaje = Number(poliza?.porcentajeComision || 0)
    if (!poliza || porcentaje <= 0 || pago.estatus !== 'pagado') return false
    // Una comisión por revertir no bloquea la nueva: el recibo se volvió a pagar y validar.
    if (comisiones.some(item => item.pagoId === pago.id && (item.estatus === 'pendiente' || item.estatus === 'pagada'))) return false
    const base = baseComisionRecibo(pago)
    const { error } = await supabase.from('comisiones').insert([{
      poliza_id: poliza.id,
      pago_id: pago.id,
      vendedor_id: poliza.vendedorId || null,
      numero_recibo: pago.numeroRecibo,
      anualidad: pago.anualidad,
      base,
      porcentaje,
      monto: calcularComision(base, porcentaje),
      estatus: 'pendiente',
    }])
    // 23505: el índice único ya tiene una comisión activa para este recibo.
    if (error && error.code !== '23505') throw error
    return !error
  }

  const ajustarComisionPorAnulacion = async (pago: PagoPoliza, motivo: string) => {
    const { data, error } = await supabase.from('comisiones').select('id, estatus').eq('pago_id', pago.id).neq('estatus', 'cancelada')
    if (error) {
      if (error.code === '42P01') return
      throw error
    }
    for (const comision of data || []) {
      const nuevoEstado = estadoComisionAlAnularPago(comision.estatus as EstadoComision)
      if (nuevoEstado === comision.estatus) continue
      const { error: updateError } = await supabase.from('comisiones').update({
        estatus: nuevoEstado,
        cancelada_en: nuevoEstado === 'cancelada' ? new Date().toISOString() : null,
        motivo_cancelacion: `Pago anulado: ${motivo}`,
      }).eq('id', comision.id).eq('estatus', comision.estatus)
      if (updateError) throw updateError
    }
  }

  const marcarComisionesPagadas = async (ids: string[], datos: { fecha: string; referencia?: string }) => {
    if (ids.length === 0) return
    const { error } = await supabase.from('comisiones').update({
      estatus: 'pagada',
      pagada_en: datos.fecha,
      referencia_pago: datos.referencia?.trim() || null,
    }).in('id', ids).eq('estatus', 'pendiente')
    if (error) throw error
    await fetchComisiones()
    toast.success(ids.length === 1 ? 'Comisión marcada como pagada' : `${ids.length} comisiones marcadas como pagadas`)
  }

  const resolverComisionPorRevertir = async (id: string, notas: string) => {
    if (!notas.trim()) throw new Error('Describe cómo se revirtió la comisión')
    const { error } = await supabase.from('comisiones').update({
      estatus: 'cancelada',
      cancelada_en: new Date().toISOString(),
      notas: notas.trim(),
    }).eq('id', id).eq('estatus', 'por_revertir')
    if (error) throw error
    await fetchComisiones()
    toast.success('Comisión revertida')
  }

  const generarComisionesFaltantes = async (): Promise<number> => {
    let creadas = 0
    for (const pago of pagos.filter(item => item.estatus === 'pagado')) {
      try {
        if (await generarComisionRecibo(pago)) creadas++
      } catch (error) {
        // Recibos UDIS antiguos sin importe en MXN: se omiten.
        console.warn('Comisión omitida para el recibo', pago.id, error)
      }
    }
    await fetchComisiones()
    return creadas
  }

  const validarPago = async (pagoId: string) => {
    const pago = pagos.find(item => item.id === pagoId)
    if (!pago || pago.estatus !== 'por_validar') throw new Error('Sólo se pueden validar pagos registrados pendientes de validación')
    const actor = getActor()
    const { data: pagoValidado, error } = await supabase.from('pagos').update({
      estatus: 'pagado',
      validado_en: new Date().toISOString(),
      validado_por: actor?.id || null,
    }).eq('id', pagoId).eq('estatus', 'por_validar').select('id').maybeSingle()
    if (error) throw error
    if (!pagoValidado) throw new Error('El pago ya fue validado o modificado por otro usuario')

    try {
      await sincronizarResumenCobranza(pago.polizaId)
    } catch (error) {
      await supabase.from('pagos').update({ estatus: 'por_validar', validado_en: null, validado_por: null }).eq('id', pagoId)
      throw error
    }

    // Con el pago validado, una póliza en rechazo bancario vuelve a quedar activa.
    const poliza = polizas.find(item => item.id === pago.polizaId)
    if (poliza?.estatus === 'rechazo-bancario') {
      const { error: estatusError } = await supabase.from('polizas').update({ estatus: 'activa' }).eq('id', pago.polizaId).eq('estatus', 'rechazo-bancario')
      if (estatusError) toast.warning('Pago validado, pero la póliza sigue en rechazo bancario: ' + estatusError.message)
      else await registrarHistorial(pago.polizaId, 'estatus_cambiado', 'estatus', 'rechazo-bancario', 'activa', { motivo: 'pago_validado', pagoId })
    }

    await registrarHistorial(pago.polizaId, 'pago_validado', 'recibo', 'por_validar', 'pagado', {
      pagoId,
      numeroRecibo: pago.numeroRecibo,
      anualidad: pago.anualidad,
      monto: pago.monto,
      moneda: pago.moneda,
      montoMxn: pago.montoMxn,
    })
    // La comisión no debe impedir la validación; si falla se puede regenerar desde Comisiones.
    try {
      await generarComisionRecibo({ ...pago, estatus: 'pagado' })
    } catch (error: any) {
      toast.warning('Pago validado, pero no se generó la comisión: ' + error.message)
    }
    await Promise.all([refrescarPolizas([pago.polizaId]), fetchHistorialPolizas(), fetchComisiones().catch(error => console.error('Error fetching comisiones:', error.message))])
    toast.success(`Pago del recibo ${pago.numeroRecibo}/${pago.totalRecibos} validado`)
  }

  const anularPago = async (pagoId: string, motivo: string) => {
    const pago = pagos.find(item => item.id === pagoId)
    if (!pago || !reciboComprometido(pago)) throw new Error('Sólo se puede anular un recibo pagado o por validar')
    if (!motivo.trim()) throw new Error('El motivo de anulación es obligatorio')
    const actor = getActor()
    // En una póliza cancelada el recibo no vuelve a cobranza: queda cancelado.
    const polizaCancelada = ESTATUS_POLIZA_CANCELADA.includes(polizas.find(item => item.id === pago.polizaId)?.estatus as Poliza['estatus'])
    const estatusFinal: EstadoRecibo = polizaCancelada ? 'cancelado' : 'pendiente'
    const { data: pagoAnulado, error } = await supabase.from('pagos').update({
      estatus: estatusFinal,
      ...(polizaCancelada ? {
        cancelado_en: new Date().toISOString(),
        cancelado_por: actor?.id || null,
        motivo_cancelacion: 'poliza_cancelada',
      } : {}),
      fecha_pago: null,
      metodo_pago: null,
      referencia: null,
      notas: null,
      valor_udi: null,
      fecha_valor_udi: null,
      monto_mxn: null,
      registrado_en: null,
      registrado_por: null,
      validado_en: null,
      validado_por: null,
      comprobante_url: null,
      comprobante_path: null,
      anulado_en: new Date().toISOString(),
      anulado_por: actor?.id || null,
      motivo_anulacion: motivo.trim(),
    }).eq('id', pagoId).eq('estatus', pago.estatus).select('id').maybeSingle()
    if (error) throw error
    if (!pagoAnulado) throw new Error('El pago ya fue modificado por otro usuario')

    try {
      await sincronizarResumenCobranza(pago.polizaId)
    } catch (error) {
      await supabase.from('pagos').update({
        estatus: pago.estatus,
        fecha_pago: pago.fechaPago || null,
        metodo_pago: pago.metodoPago || null,
        referencia: pago.referencia || null,
        notas: pago.notas || null,
        valor_udi: pago.valorUdi ?? null,
        fecha_valor_udi: pago.fechaValorUdi ?? null,
        monto_mxn: pago.montoMxn ?? null,
        registrado_en: pago.registradoEn || null,
        registrado_por: pago.registradoPor || null,
        validado_en: pago.validadoEn || null,
        validado_por: pago.validadoPor || null,
        comprobante_url: pago.comprobanteUrl || null,
        comprobante_path: pago.comprobantePath || null,
        cancelado_en: null,
        cancelado_por: null,
        motivo_cancelacion: null,
        anulado_en: null,
        anulado_por: null,
        motivo_anulacion: null,
      }).eq('id', pagoId)
      throw error
    }

    await registrarHistorial(pago.polizaId, pago.estatus === 'por_validar' ? 'pago_rechazado' : 'pago_anulado', 'recibo', pago.estatus, estatusFinal, {
      pagoId,
      numeroRecibo: pago.numeroRecibo,
      anualidad: pago.anualidad,
      monto: pago.monto,
      moneda: pago.moneda,
      fechaPago: pago.fechaPago,
      metodoPago: pago.metodoPago,
      referencia: pago.referencia,
      valorUdi: pago.valorUdi,
      montoMxn: pago.montoMxn,
      comprobanteUrl: pago.comprobanteUrl,
      validadoEn: pago.validadoEn,
      motivo: motivo.trim(),
    })
    if (pago.estatus === 'pagado') {
      try {
        await ajustarComisionPorAnulacion(pago, motivo.trim())
      } catch (error: any) {
        toast.warning('El pago se anuló, pero no se ajustó su comisión: ' + error.message)
      }
    }
    await Promise.all([refrescarPolizas([pago.polizaId]), fetchHistorialPolizas(), fetchComisiones().catch(error => console.error('Error fetching comisiones:', error.message))])
    toast.success(`Pago del recibo ${pago.numeroRecibo}/${pago.totalRecibos} ${pago.estatus === 'por_validar' ? 'rechazado' : 'anulado'}`)
  }

  const iniciarRenovacion = async (polizaId: string): Promise<string | null> => {
    const poliza = polizas.find(item => item.id === polizaId)
    if (!poliza) return null
    const activa = renovaciones.find(item => item.polizaOrigenId === polizaId && (item.estado === 'pendiente' || item.estado === 'en_proceso'))
    if (activa) return activa.id
    const siguienteEstado = iniciarEstadoRenovacion(poliza.renovacionEstado || (poliza.estatus === 'por-renovar' ? 'pendiente' : 'sin_iniciar'))
    const actor = getActor()
    const { data, error } = await supabase.from('renovaciones').insert([{
      poliza_origen_id: polizaId,
      estado: siguienteEstado,
      estatus_poliza_anterior: poliza.estatus,
      iniciada_por: actor?.id || null,
    }]).select().single()
    if (error) throw error
    const { error: polizaError } = await supabase.from('polizas').update({ renovacion_estado: siguienteEstado }).eq('id', polizaId)
    if (polizaError) {
      await supabase.from('renovaciones').update({
        estado: 'cancelada',
        cancelada_por: actor?.id || null,
        cancelada_en: new Date().toISOString(),
        motivo_cancelacion: 'error_inicio',
      }).eq('id', data.id)
      throw polizaError
    }
    await registrarHistorial(polizaId, 'renovacion_iniciada', 'renovacion_estado', poliza.renovacionEstado, siguienteEstado, { renovacionId: data.id })
    await Promise.all([fetchRenovaciones(), refrescarPolizas([polizaId]), fetchHistorialPolizas()])
    return data.id
  }

  const completarRenovacion = async (renovacionId: string, polizaRenovadaId: string) => {
    const renovacion = renovaciones.find(item => item.id === renovacionId)
    if (!renovacion) throw new Error('La renovación no está en proceso')
    const estadoCompletado = completarEstadoRenovacion(renovacion.estado)
    const actor = getActor()
    const completadaEn = new Date().toISOString()
    const { error } = await supabase.from('renovaciones').update({
      estado: estadoCompletado,
      poliza_renovada_id: polizaRenovadaId,
      completada_por: actor?.id || null,
      completada_en: completadaEn,
    }).eq('id', renovacionId).eq('estado', 'en_proceso')
    if (error) throw error
    const resultadosPolizas = await Promise.all([
      supabase.from('polizas').update({ estatus: 'renovada', renovacion_estado: estadoCompletado, renovada_a_id: polizaRenovadaId }).eq('id', renovacion.polizaOrigenId),
      supabase.from('polizas').update({ renovada_desde_id: renovacion.polizaOrigenId }).eq('id', polizaRenovadaId),
    ])
    const errorPolizas = resultadosPolizas.find(resultado => resultado.error)?.error
    if (errorPolizas) {
      await Promise.all([
        supabase.from('polizas').update({ estatus: renovacion.estatusPolizaAnterior, renovacion_estado: 'en_proceso', renovada_a_id: null }).eq('id', renovacion.polizaOrigenId),
        supabase.from('polizas').update({ renovada_desde_id: null }).eq('id', polizaRenovadaId),
      ])
      await supabase.from('renovaciones').update({
        estado: renovacion.estado,
        poliza_renovada_id: null,
        completada_por: null,
        completada_en: null,
      }).eq('id', renovacionId)
      throw errorPolizas
    }
    await registrarHistorial(renovacion.polizaOrigenId, 'renovacion_completada', 'renovacion_estado', renovacion.estado, estadoCompletado, {
      renovacionId,
      polizaRenovadaId,
    })
    await Promise.all([fetchRenovaciones(), refrescarPolizas([renovacion.polizaOrigenId, polizaRenovadaId]), fetchHistorialPolizas()])
  }

  const cancelarRenovacion = async (polizaId: string, motivo: string) => {
    const renovacion = renovaciones.find(item => item.polizaOrigenId === polizaId && (item.estado === 'pendiente' || item.estado === 'en_proceso'))
    if (!renovacion) throw new Error('No existe una renovación activa para cancelar')
    const estadoCancelado = cancelarEstadoRenovacion(renovacion.estado)
    const actor = getActor()
    const { error } = await supabase.from('renovaciones').update({
      estado: estadoCancelado,
      cancelada_por: actor?.id || null,
      cancelada_en: new Date().toISOString(),
      motivo_cancelacion: motivo,
    }).eq('id', renovacion.id)
    if (error) throw error
    const { error: polizaError } = await supabase.from('polizas').update({ renovacion_estado: estadoCancelado }).eq('id', polizaId)
    if (polizaError) {
      await supabase.from('renovaciones').update({
        estado: renovacion.estado,
        cancelada_por: null,
        cancelada_en: null,
        motivo_cancelacion: null,
      }).eq('id', renovacion.id)
      throw polizaError
    }
    await registrarHistorial(polizaId, 'renovacion_cancelada', 'renovacion_estado', renovacion.estado, estadoCancelado, {
      renovacionId: renovacion.id,
      motivo,
    })
    await Promise.all([fetchRenovaciones(), refrescarPolizas([polizaId]), fetchHistorialPolizas()])
  }

  const getOrCreateFlotilla = async (polizaId: string): Promise<string> => {
    const { data: existente, error: selectError } = await supabase.from('flotillas').select('id').eq('poliza_id', polizaId).maybeSingle()
    if (selectError) throw selectError
    if (existente) return existente.id
    const poliza = polizas.find(item => item.id === polizaId)
    const { data, error } = await supabase.from('flotillas').insert([{
      poliza_id: polizaId,
      nombre: `Flotilla ${poliza?.numeroPoliza || ''}`.trim(),
    }]).select('id').single()
    if (error) throw error
    return data.id
  }

  const agregarUnidadFlotilla = async (polizaId: string, unidad: Omit<FlotillaUnidad, 'id' | 'flotillaId' | 'polizaId'>) => {
    if (!validarNumeroInciso(unidad.numeroInciso)) throw new Error('El número de inciso es obligatorio')
    const incisos = flotillaUnidades.filter(item => item.polizaId === polizaId).map(item => item.numeroInciso)
    if (!numeroIncisoDisponible(unidad.numeroInciso, incisos)) throw new Error('El número de inciso ya existe en esta flotilla')
    const flotillaId = await getOrCreateFlotilla(polizaId)
    const { error } = await supabase.from('flotilla_unidades').insert([{
      flotilla_id: flotillaId,
      numero_inciso: normalizarNumeroInciso(unidad.numeroInciso),
      descripcion: unidad.descripcion || null,
      marca: unidad.marca || null,
      modelo: unidad.modelo || null,
      placas: unidad.placas || null,
      numero_serie: unidad.numeroSerie || null,
      prima_total: unidad.primaTotal ?? null,
      activa: unidad.activa,
    }])
    if (error) throw error
    await registrarHistorial(polizaId, 'unidad_flotilla_creada', 'numero_inciso', undefined, unidad.numeroInciso)
    await Promise.all([fetchFlotillaUnidades(), fetchHistorialPolizas()])
  }

  const actualizarUnidadFlotilla = async (id: string, unidad: Partial<Omit<FlotillaUnidad, 'id' | 'flotillaId' | 'polizaId'>>) => {
    const anterior = flotillaUnidades.find(item => item.id === id)
    if (!anterior) return
    const updateData: Record<string, unknown> = {}
    if (unidad.numeroInciso !== undefined) {
      if (!validarNumeroInciso(unidad.numeroInciso)) throw new Error('El número de inciso es obligatorio')
      const incisos = flotillaUnidades.filter(item => item.polizaId === anterior.polizaId).map(item => item.numeroInciso)
      if (!numeroIncisoDisponible(unidad.numeroInciso, incisos, anterior.numeroInciso)) throw new Error('El número de inciso ya existe en esta flotilla')
      updateData.numero_inciso = normalizarNumeroInciso(unidad.numeroInciso)
    }
    if (unidad.descripcion !== undefined) updateData.descripcion = unidad.descripcion || null
    if (unidad.marca !== undefined) updateData.marca = unidad.marca || null
    if (unidad.modelo !== undefined) updateData.modelo = unidad.modelo || null
    if (unidad.placas !== undefined) updateData.placas = unidad.placas || null
    if (unidad.numeroSerie !== undefined) updateData.numero_serie = unidad.numeroSerie || null
    if (unidad.primaTotal !== undefined) updateData.prima_total = unidad.primaTotal ?? null
    if (unidad.activa !== undefined) updateData.activa = unidad.activa
    const { error } = await supabase.from('flotilla_unidades').update(updateData).eq('id', id)
    if (error) throw error
    await registrarHistorial(anterior.polizaId, 'unidad_flotilla_actualizada', 'unidad', anterior, { ...anterior, ...unidad })
    await Promise.all([fetchFlotillaUnidades(), fetchHistorialPolizas()])
  }

  const desactivarUnidadFlotilla = async (id: string) => {
    const unidad = flotillaUnidades.find(item => item.id === id)
    if (!unidad) return
    const { error } = await supabase.from('flotilla_unidades').update({ activa: false }).eq('id', id)
    if (error) throw error
    await registrarHistorial(unidad.polizaId, 'unidad_flotilla_desactivada', 'activa', true, false, { unidadId: id, numeroInciso: unidad.numeroInciso })
    await Promise.all([fetchFlotillaUnidades(), fetchHistorialPolizas()])
  }

  const agregarPoliza = async (poliza: Omit<Poliza, 'id'>): Promise<string | null> => {
    let polizaCreadaId: string | null = null
    try {
      const vigencias = calcularVigenciasPoliza(
        poliza.vigenciaInicio,
        poliza.ramo === 'vida' ? poliza.vigenciaVidaPago : undefined,
        poliza.ramo === 'vida' ? poliza.vigenciaVidaProducto ?? poliza.anosVidaProducto : undefined,
      )
      // Fuera de Vida se respeta un fin de vigencia capturado (pólizas semestrales, a corto plazo...).
      const vigenciaFinCapturada = poliza.ramo !== 'vida' && poliza.vigenciaFin && compareDateOnly(poliza.vigenciaFin, poliza.vigenciaInicio) > 0
        ? poliza.vigenciaFin
        : undefined
      const vigenciaFin = vigenciaFinCapturada ?? vigencias.vigenciaAnualFin
      const primaTotalPlazo = poliza.ramo === 'vida'
        ? calcularPrimaTotalPlazo(poliza.prima, poliza.vigenciaVidaPago)
        : Number(poliza.primaTotal || poliza.prima)
      const recibos = generarRecibos({
        primaTotal: primaTotalPlazo,
        primaAnual: poliza.ramo === 'vida' ? poliza.prima : undefined,
        vigenciaInicio: poliza.vigenciaInicio,
        vigenciaFin: poliza.ramo === 'vida' ? vigencias.vigenciaPagoFin! : vigenciaFin,
        periodicidad: poliza.formaPago,
        primerRecibo: poliza.primerRecibo,
        diasGraciaPrimerRecibo: poliza.diasGraciaPrimerRecibo,
        diasGraciaSubsecuentes: poliza.diasGraciaSubsecuentes,
      })
      const { data, error } = await supabase
        .from('polizas')
        .insert([{
          cliente_id: poliza.clienteId,
          compania_id: poliza.companiaId,
          ramo: poliza.ramo,
          grupo: poliza.grupo || null,
          porcentaje_comision: poliza.porcentajeComision ?? null,
          numero_poliza: poliza.numeroPoliza,
          vigencia_inicio: poliza.vigenciaInicio,
          vigencia_fin: vigenciaFin,
          vigencia_pago_fin: vigencias.vigenciaPagoFin || null,
          vigencia_producto_fin: vigencias.vigenciaProductoFin || null,
          prima: poliza.prima,
          forma_pago: poliza.formaPago,
          estatus: poliza.estatus,
          renovacion_estado: poliza.renovacionEstado || 'sin_iniciar',
          renovada_desde_id: poliza.renovadaDesdeId || null,
          vendedor_id: poliza.vendedorId || null,
          folios: poliza.folios || null,
          tramites: poliza.tramites || 0,
          prima_emitida: primaTotalPlazo,
          prima_cobrada: poliza.primaCobrada || 0,
          fecha_emision: poliza.fechaEmision,
          periodo_gracia: poliza.periodoGracia || null,
          cancelacion_motivo: poliza.cancelacionMotivo || null,
          rehabilitacion_fecha: poliza.rehabilitacionFecha || null,
          agente: poliza.agente || null,
          inciso_endoso: poliza.incisoEndoso || null,
          nombre_asegurado: poliza.nombreAsegurado || null,
          ultimo_dia_pago: poliza.ultimoDiaPago || null,
          numero_recibo: poliza.numeroRecibo || null,
          prima_total_recibo: poliza.primaTotalRecibo || null,
          registro_sistema_cobranza: poliza.registroSistemaCobranza || false,
          fechas_recordatorio: poliza.fechasRecordatorio || null,
          comentarios: poliza.comentarios || null,
          notas: poliza.notas || null,
          marca_actualizacion: poliza.marcaActualizacion || false,
          ...(poliza.ramo === 'vida' ? {
            vigencia_vida_pago: poliza.vigenciaVidaPago ?? null,
            vigencia_vida_producto: poliza.vigenciaVidaProducto ?? poliza.anosVidaProducto ?? null,
            // Compatibilidad con registros y reportes que aún usan esta columna.
            anos_vida_producto: poliza.vigenciaVidaProducto ?? poliza.anosVidaProducto ?? null,
          } : {}),
          tipo_pago: poliza.tipoPago || null,
          primer_recibo: poliza.primerRecibo ?? null,
          recibos_subsecuentes: poliza.recibosSubsecuentes ?? null,
          dias_gracia_primer_recibo: poliza.diasGraciaPrimerRecibo ?? null,
          dias_gracia_subsecuentes: poliza.diasGraciaSubsecuentes ?? null,
          prima_total: primaTotalPlazo,
          divisas: poliza.divisas || null,
          valor_udi_inicial: poliza.divisas === 'UDIS' ? poliza.valorUdiInicial : null,
          vehiculo_amis: poliza.vehiculoAmis || null,
          vehiculo_clave: poliza.vehiculoClave || null,
          vehiculo_descripcion: poliza.vehiculoDescripcion || null,
          vehiculo_modelo: poliza.vehiculoModelo || null,
        }])
        .select()
        .single()

      if (error) throw error
      polizaCreadaId = data.id

      if (recibos.length > 0) {
        const { error: pagosError } = await supabase.from('pagos').insert(recibos.map(recibo => ({
          poliza_id: data.id,
          cliente_id: poliza.clienteId,
          monto: recibo.monto,
          numero_recibo: recibo.numeroRecibo,
          total_recibos: recibo.totalRecibos,
          anualidad: recibo.anualidad,
          moneda: poliza.divisas || 'MXN',
          monto_udis: poliza.divisas === 'UDIS' ? recibo.monto : null,
          fecha_emision: recibo.fechaEmision,
          fecha_limite: recibo.fechaLimite,
          estatus: recibo.estatus,
          metodo_pago: null,
        })))
        if (pagosError) throw pagosError
        const { error: polizaError } = await supabase.from('polizas').update({
          numero_recibo: `${recibos[0].numeroRecibo}/${recibos[0].totalRecibos}`,
          prima_total_recibo: recibos[0].monto,
          ultimo_dia_pago: recibos[0].fechaLimite,
        }).eq('id', data.id)
        if (polizaError) throw polizaError
      }
      await registrarHistorial(data.id, 'poliza_creada', undefined, undefined, {
        numeroPoliza: poliza.numeroPoliza,
        primaTotal: primaTotalPlazo,
        formaPago: poliza.formaPago,
      })
      toast.success('Póliza creada exitosamente')
      await Promise.all([refrescarPolizas([data.id]), fetchHistorialPolizas(), ...(poliza.ramo === 'flotilla' ? [fetchFlotillaUnidades()] : [])])
      return data.id
    } catch (err: any) {
      if (polizaCreadaId) {
        toast.error('La póliza fue creada, pero su configuración operativa quedó incompleta: ' + err.message)
        await Promise.all([refrescarPolizas([polizaCreadaId]), fetchHistorialPolizas()])
        return polizaCreadaId
      }
      toast.error('Error al crear póliza: ' + err.message)
      return null
    }
  }

  const actualizarPoliza = async (id: string, poliza: Partial<Poliza>) => {
    try {
      const anterior = polizas.find(item => item.id === id)
      if (anterior) {
        const ramo = poliza.ramo ?? anterior.ramo
        const vigenciaInicio = poliza.vigenciaInicio ?? anterior.vigenciaInicio
        const vigenciaVidaPago = poliza.vigenciaVidaPago ?? anterior.vigenciaVidaPago
        const vigenciaVidaProducto = poliza.vigenciaVidaProducto ?? anterior.vigenciaVidaProducto ?? anterior.anosVidaProducto
        const actualizaVigencias = poliza.vigenciaInicio !== undefined || poliza.vigenciaFin !== undefined || poliza.ramo !== undefined || poliza.vigenciaVidaPago !== undefined || poliza.vigenciaVidaProducto !== undefined
        const actualizaPrimaPlazo = ramo === 'vida' && (poliza.prima !== undefined || poliza.primaTotal !== undefined || poliza.vigenciaVidaPago !== undefined)
        if (actualizaVigencias) {
          const vigencias = calcularVigenciasPoliza(
            vigenciaInicio,
            ramo === 'vida' ? vigenciaVidaPago : undefined,
            ramo === 'vida' ? vigenciaVidaProducto : undefined,
          )
          const vigenciaFinCapturada = ramo !== 'vida' ? poliza.vigenciaFin : undefined
          if (vigenciaFinCapturada && compareDateOnly(vigenciaFinCapturada, vigenciaInicio) <= 0) {
            throw new Error('El fin de vigencia debe ser posterior al inicio')
          }
          poliza = {
            ...poliza,
            vigenciaFin: vigenciaFinCapturada ?? vigencias.vigenciaAnualFin,
            vigenciaPagoFin: vigencias.vigenciaPagoFin,
            vigenciaProductoFin: vigencias.vigenciaProductoFin,
          }
        }
        if (actualizaPrimaPlazo) {
          const primaTotalPlazo = calcularPrimaTotalPlazo(poliza.prima ?? anterior.prima, vigenciaVidaPago)
          poliza = { ...poliza, primaTotal: primaTotalPlazo, primaEmitida: primaTotalPlazo }
        }
        const divisas = poliza.divisas ?? anterior.divisas
        if (poliza.divisas !== undefined && poliza.divisas !== anterior.divisas && pagos.some(item => item.polizaId === id && reciboComprometido(item))) {
          throw new Error('No se puede cambiar la divisa porque la póliza ya tiene recibos pagados o por validar')
        }
      }
      const updateData: any = {}
      if (poliza.clienteId !== undefined) updateData.cliente_id = poliza.clienteId
      if (poliza.companiaId !== undefined) updateData.compania_id = poliza.companiaId
      if (poliza.ramo !== undefined) updateData.ramo = poliza.ramo
      if (poliza.grupo !== undefined) updateData.grupo = poliza.grupo.trim() || null
      // La clave presente con valor vacío borra el % (deja de generar comisiones).
      if ('porcentajeComision' in poliza) updateData.porcentaje_comision = poliza.porcentajeComision ?? null
      if (poliza.numeroPoliza !== undefined) updateData.numero_poliza = poliza.numeroPoliza
      if (poliza.vigenciaInicio !== undefined) updateData.vigencia_inicio = poliza.vigenciaInicio
      if (poliza.vigenciaFin !== undefined) updateData.vigencia_fin = poliza.vigenciaFin
      if (poliza.vigenciaPagoFin !== undefined) updateData.vigencia_pago_fin = poliza.vigenciaPagoFin || null
      if (poliza.vigenciaProductoFin !== undefined) updateData.vigencia_producto_fin = poliza.vigenciaProductoFin || null
      if (poliza.prima !== undefined) {
        updateData.prima = poliza.prima
        // Mantiene Cobranza sincronizada incluso si otro formulario sólo actualiza prima.
        if (poliza.primaEmitida === undefined) updateData.prima_emitida = poliza.prima
        if (poliza.primaTotalRecibo === undefined) updateData.prima_total_recibo = poliza.prima
      }
      if (poliza.primaEmitida !== undefined) updateData.prima_emitida = poliza.primaEmitida
      if (poliza.formaPago !== undefined) updateData.forma_pago = poliza.formaPago
      if (poliza.estatus !== undefined) updateData.estatus = poliza.estatus
      if (poliza.renovacionEstado !== undefined) updateData.renovacion_estado = poliza.renovacionEstado
      if (poliza.renovadaDesdeId !== undefined) updateData.renovada_desde_id = poliza.renovadaDesdeId || null
      if (poliza.renovadaAId !== undefined) updateData.renovada_a_id = poliza.renovadaAId || null
      if (poliza.vendedorId !== undefined) updateData.vendedor_id = poliza.vendedorId || null
      if (poliza.primaCobrada !== undefined) updateData.prima_cobrada = poliza.primaCobrada
      if (poliza.registroSistemaCobranza !== undefined) updateData.registro_sistema_cobranza = poliza.registroSistemaCobranza
      if (poliza.fechasRecordatorio !== undefined) updateData.fechas_recordatorio = poliza.fechasRecordatorio
      if (poliza.comentarios !== undefined) updateData.comentarios = poliza.comentarios
      if (poliza.notas !== undefined) updateData.notas = poliza.notas
      if (poliza.marcaActualizacion !== undefined) updateData.marca_actualizacion = poliza.marcaActualizacion
      if (poliza.cancelacionMotivo !== undefined) updateData.cancelacion_motivo = poliza.cancelacionMotivo || null
      if (poliza.tipoPago !== undefined) updateData.tipo_pago = poliza.tipoPago || null
      if (poliza.agente !== undefined) updateData.agente = poliza.agente || null
      if (poliza.incisoEndoso !== undefined) updateData.inciso_endoso = poliza.incisoEndoso || null
      if (poliza.nombreAsegurado !== undefined) updateData.nombre_asegurado = poliza.nombreAsegurado || null
      // Campos exclusivos de pólizas de vida: solo enviar si el ramo es vida.
      if (poliza.ramo === 'vida' || (poliza.ramo === undefined && poliza.vigenciaVidaPago !== undefined)) {
        if (poliza.vigenciaVidaPago !== undefined) updateData.vigencia_vida_pago = poliza.vigenciaVidaPago ?? null
      }
      if (poliza.ramo === 'vida' || (poliza.ramo === undefined && poliza.vigenciaVidaProducto !== undefined)) {
        if (poliza.vigenciaVidaProducto !== undefined) {
          updateData.vigencia_vida_producto = poliza.vigenciaVidaProducto ?? null
          updateData.anos_vida_producto = poliza.vigenciaVidaProducto ?? null
        }
      }
      if (poliza.numeroRecibo !== undefined) updateData.numero_recibo = poliza.numeroRecibo || null
      if (poliza.primaTotalRecibo !== undefined) updateData.prima_total_recibo = poliza.primaTotalRecibo ?? null
      if (poliza.ultimoDiaPago !== undefined) updateData.ultimo_dia_pago = poliza.ultimoDiaPago || null
      if (poliza.periodoGracia !== undefined) updateData.periodo_gracia = poliza.periodoGracia || null
      if (poliza.primerRecibo !== undefined) updateData.primer_recibo = poliza.primerRecibo ?? null
      if (poliza.recibosSubsecuentes !== undefined) updateData.recibos_subsecuentes = poliza.recibosSubsecuentes ?? null
      if (poliza.diasGraciaPrimerRecibo !== undefined) updateData.dias_gracia_primer_recibo = poliza.diasGraciaPrimerRecibo ?? null
      if (poliza.diasGraciaSubsecuentes !== undefined) updateData.dias_gracia_subsecuentes = poliza.diasGraciaSubsecuentes ?? null
      if (poliza.primaTotal !== undefined) {
        updateData.prima_total = poliza.primaTotal ?? null
        // La facturación siempre refleja el total vigente del plazo.
        updateData.prima_emitida = poliza.primaTotal ?? null
      }
      if (poliza.divisas !== undefined) updateData.divisas = poliza.divisas || null
      if (poliza.valorUdiInicial !== undefined) updateData.valor_udi_inicial = poliza.divisas === 'UDIS' || (poliza.divisas === undefined && anterior?.divisas === 'UDIS') ? poliza.valorUdiInicial : null
      if (poliza.vehiculoAmis !== undefined) updateData.vehiculo_amis = poliza.vehiculoAmis || null
      if (poliza.vehiculoClave !== undefined) updateData.vehiculo_clave = poliza.vehiculoClave || null
      if (poliza.vehiculoDescripcion !== undefined) updateData.vehiculo_descripcion = poliza.vehiculoDescripcion || null
      if (poliza.vehiculoModelo !== undefined) updateData.vehiculo_modelo = poliza.vehiculoModelo || null
      const { error } = await supabase
        .from('polizas')
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      if (anterior) {
        const camposRelevantes: Array<keyof Poliza> = [
          'numeroPoliza', 'ramo', 'grupo', 'porcentajeComision', 'vigenciaInicio', 'vigenciaFin', 'vigenciaPagoFin', 'vigenciaProductoFin', 'prima', 'primaTotal',
          'formaPago', 'estatus', 'renovacionEstado', 'vendedorId', 'nombreAsegurado',
          'agente', 'incisoEndoso', 'tipoPago', 'divisas', 'valorUdiInicial', 'comentarios', 'notas',
        ]
        const cambios = camposRelevantes.filter(campo =>
          poliza[campo] !== undefined && JSON.stringify(anterior[campo]) !== JSON.stringify(poliza[campo]),
        )
        const cancelada = poliza.estatus !== undefined && ESTATUS_POLIZA_CANCELADA.includes(poliza.estatus) && !ESTATUS_POLIZA_CANCELADA.includes(anterior.estatus)
        const reactivada = poliza.estatus !== undefined && !ESTATUS_POLIZA_CANCELADA.includes(poliza.estatus) && ESTATUS_POLIZA_CANCELADA.includes(anterior.estatus)
        const requiereRegeneracion = reactivada || ['prima', 'primaTotal', 'formaPago', 'vigenciaInicio', 'vigenciaFin', 'vigenciaPagoFin', 'primerRecibo', 'divisas', 'diasGraciaPrimerRecibo', 'diasGraciaSubsecuentes']
          .some(campo => poliza[campo as keyof Poliza] !== undefined && poliza[campo as keyof Poliza] !== anterior[campo as keyof Poliza])
        if (cancelada) {
          // Una póliza cancelada deja de generar cobranza: sus recibos por cobrar se cancelan.
          // Los pagos por validar se conservan para validarlos o rechazarlos.
          const { data: recibosCancelados, error: cancelarError } = await supabase.from('pagos').update({
            estatus: 'cancelado',
            cancelado_en: new Date().toISOString(),
            cancelado_por: getActor()?.id || null,
            motivo_cancelacion: 'poliza_cancelada',
          }).eq('poliza_id', id).in('estatus', ['pendiente', 'vencido']).select('id, fecha_limite')
          try {
            if (cancelarError) throw cancelarError
            await sincronizarResumenCobranza(id)
          } catch (error) {
            // Sin recibos cancelados la póliza no puede quedar cancelada: se revierte todo.
            const hoyRollback = todayDateOnly()
            await Promise.all((recibosCancelados || []).map((item: any) => supabase.from('pagos').update({
              estatus: compareDateOnly(item.fecha_limite, hoyRollback) < 0 ? 'vencido' : 'pendiente',
              cancelado_en: null,
              cancelado_por: null,
              motivo_cancelacion: null,
            }).eq('id', item.id)))
            await supabase.from('polizas').update({ estatus: anterior.estatus }).eq('id', id)
            await refrescarPolizas([id])
            throw error
          }
          await refrescarPolizas([id])
        } else if (requiereRegeneracion) {
          try {
            await regenerarRecibosPoliza(id, {
              prima: poliza.prima,
              primaTotal: poliza.primaTotal,
              formaPago: poliza.formaPago,
              vigenciaInicio: poliza.vigenciaInicio,
              vigenciaFin: poliza.vigenciaFin,
              vigenciaPagoFin: poliza.vigenciaPagoFin,
              primerRecibo: poliza.primerRecibo,
              divisas: poliza.divisas,
              diasGraciaPrimerRecibo: poliza.diasGraciaPrimerRecibo,
              diasGraciaSubsecuentes: poliza.diasGraciaSubsecuentes,
            })
          } catch (error) {
            const { error: rollbackError } = await supabase.from('polizas').update({
              prima: anterior.prima,
              prima_total: anterior.primaTotal ?? null,
              prima_emitida: anterior.primaEmitida,
              forma_pago: anterior.formaPago,
              vigencia_inicio: anterior.vigenciaInicio,
              vigencia_fin: anterior.vigenciaFin,
              vigencia_pago_fin: anterior.vigenciaPagoFin ?? null,
              vigencia_producto_fin: anterior.vigenciaProductoFin ?? null,
              vigencia_vida_pago: anterior.vigenciaVidaPago ?? null,
              vigencia_vida_producto: anterior.vigenciaVidaProducto ?? anterior.anosVidaProducto ?? null,
              anos_vida_producto: anterior.vigenciaVidaProducto ?? anterior.anosVidaProducto ?? null,
              divisas: anterior.divisas || null,
              valor_udi_inicial: anterior.valorUdiInicial ?? null,
              primer_recibo: anterior.primerRecibo ?? null,
              dias_gracia_primer_recibo: anterior.diasGraciaPrimerRecibo ?? null,
              dias_gracia_subsecuentes: anterior.diasGraciaSubsecuentes ?? null,
              estatus: anterior.estatus,
              numero_recibo: anterior.numeroRecibo || null,
              prima_total_recibo: anterior.primaTotalRecibo ?? null,
              ultimo_dia_pago: anterior.ultimoDiaPago || null,
            }).eq('id', id)
            if (rollbackError) throw rollbackError
            throw error
          }
        }
        await Promise.all(cambios.map(campo => registrarHistorial(
          id,
          campo === 'formaPago' ? 'periodicidad_cambiada' : `${String(campo)}_cambiado`,
          String(campo),
          anterior[campo],
          poliza[campo],
        )))
      }

      toast.success('Póliza actualizada')
      await Promise.all([refrescarPolizas([id]), fetchHistorialPolizas()])
    } catch (err: any) {
      toast.error('Error al actualizar póliza: ' + err.message)
      throw err
    }
  }

  const eliminarPoliza = async (id: string) => {
    try {
      const { error } = await supabase.from('polizas').delete().eq('id', id)
      if (error) throw error
      toast.success('Póliza eliminada')
      await refrescarPolizas([id])
    } catch (err: any) {
      toast.error('Error al eliminar póliza: ' + err.message)
    }
  }

  // ==================== VEHÍCULOS AXA ====================
  const buscarVehiculos = async (query: string): Promise<VehiculoAxa[]> => {
    if (!query || query.trim().length < 2) return []
    try {
      const { data, error } = await supabase
        .from('vehiculos_axa')
        .select('*')
        .or(`marca_descripcion.ilike.%${query}%,amis.ilike.%${query}%,clave_cot.ilike.%${query}%`)
        .limit(50)

      if (error) {
        if (error.code === '42P01') return []
        throw error
      }

      return (data || []).map((v: any) => ({
        id: v.id,
        amis: v.amis || undefined,
        claveCot: v.clave_cot || undefined,
        marcaDescripcion: v.marca_descripcion || undefined,
        modelos: v.modelos || undefined,
        tipo: v.tipo || undefined,
        ocupantes: v.ocupantes || undefined,
        equipamiento: v.equipamiento || undefined,
        descripcionDetallada: v.descripcion_detallada || undefined,
      }))
    } catch (err: any) {
      console.error('Error buscando vehículos:', err.message)
      return []
    }
  }

  // ==================== PROSPECTOS ====================
  const fetchProspectos = async () => {
    try {
      setLoadingProspectos(true)
      const { data, error } = await supabase
        .from('prospectos')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const mapped: Prospecto[] = (data || []).map((p: any) => ({
        id: p.id,
        nombre: p.nombre,
        email: p.email || '',
        telefono: p.telefono,
        empresa: p.empresa || undefined,
        origen: p.origen,
        interes: p.interes,
        prioridad: p.prioridad as Prospecto['prioridad'],
        estatus: p.estatus as Prospecto['estatus'],
        fechaContacto: p.fecha_contacto,
        notas: p.notas || undefined,
        asignadoA: p.asignado_a || undefined,
      }))

      setProspectos(mapped)
    } catch (err: any) {
      console.error('Error fetching prospectos:', err.message)
    } finally {
      setLoadingProspectos(false)
    }
  }

  const agregarProspecto = async (prospecto: Omit<Prospecto, 'id'>): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('prospectos')
        .insert([{
          nombre: prospecto.nombre,
          email: prospecto.email || null,
          telefono: prospecto.telefono,
          empresa: prospecto.empresa || null,
          origen: prospecto.origen,
          interes: prospecto.interes,
          prioridad: prospecto.prioridad,
          estatus: prospecto.estatus,
          fecha_contacto: prospecto.fechaContacto,
          notas: prospecto.notas || null,
          asignado_a: prospecto.asignadoA || null,
        }])
        .select()
        .single()

      if (error) throw error

      toast.success('Prospecto creado exitosamente')
      await fetchProspectos()
      return data.id
    } catch (err: any) {
      toast.error('Error al crear prospecto: ' + err.message)
      return null
    }
  }

  const actualizarProspecto = async (id: string, prospecto: Partial<Prospecto>) => {
    try {
      const updateData: any = {}
      if (prospecto.nombre !== undefined) updateData.nombre = prospecto.nombre
      if (prospecto.email !== undefined) updateData.email = prospecto.email || null
      if (prospecto.telefono !== undefined) updateData.telefono = prospecto.telefono
      if (prospecto.empresa !== undefined) updateData.empresa = prospecto.empresa || null
      if (prospecto.origen !== undefined) updateData.origen = prospecto.origen
      if (prospecto.interes !== undefined) updateData.interes = prospecto.interes
      if (prospecto.prioridad !== undefined) updateData.prioridad = prospecto.prioridad
      if (prospecto.estatus !== undefined) updateData.estatus = prospecto.estatus
      if (prospecto.notas !== undefined) updateData.notas = prospecto.notas || null
      if (prospecto.asignadoA !== undefined) updateData.asignado_a = prospecto.asignadoA || null

      const { error } = await supabase
        .from('prospectos')
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      toast.success('Prospecto actualizado')
      await fetchProspectos()
    } catch (err: any) {
      toast.error('Error al actualizar prospecto: ' + err.message)
    }
  }

  const eliminarProspecto = async (id: string) => {
    try {
      const { error } = await supabase.from('prospectos').delete().eq('id', id)
      if (error) throw error
      toast.success('Prospecto eliminado')
      await fetchProspectos()
    } catch (err: any) {
      toast.error('Error al eliminar prospecto: ' + err.message)
    }
  }

  // ==================== FOLIOS ====================
  const fetchFolios = async () => {
    try {
      setLoadingFolios(true)
      const { data, error } = await supabase
        .from('folios')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        if (error.code === '42P01') { setFoliosRegistro([]); return }
        throw error
      }

      const mapped: FolioRegistro[] = (data || []).map((f: any) => ({
        id: f.id,
        numeroFolio: f.numero_folio,
        categoria: f.categoria,
        subcategoria: f.subcategoria,
        movimiento: f.movimiento as FolioRegistro['movimiento'],
        fechaIngreso: f.fecha_ingreso,
        compania: f.compania,
        comentarios: f.comentarios || undefined,
        responsable: f.responsable || undefined,
      }))
      setFoliosRegistro(mapped)
    } catch (err: any) {
      console.error('Error fetching folios:', err.message)
      setFoliosRegistro([])
    } finally {
      setLoadingFolios(false)
    }
  }

  const agregarFolio = async (folio: Omit<FolioRegistro, 'id'>): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('folios')
        .insert([{
          numero_folio: folio.numeroFolio,
          categoria: folio.categoria,
          subcategoria: folio.subcategoria,
          movimiento: folio.movimiento,
          fecha_ingreso: folio.fechaIngreso,
          compania: folio.compania,
          comentarios: folio.comentarios || null,
          responsable: folio.responsable || null,
        }])
        .select()
        .single()
      if (error) throw error
      toast.success('Folio creado exitosamente')
      await fetchFolios()
      return data.id
    } catch (err: any) {
      toast.error('Error al crear folio: ' + err.message)
      return null
    }
  }

  const actualizarFolio = async (id: string, folio: Partial<FolioRegistro>) => {
    try {
      const u: any = {}
      if (folio.numeroFolio !== undefined) u.numero_folio = folio.numeroFolio
      if (folio.categoria !== undefined) u.categoria = folio.categoria
      if (folio.subcategoria !== undefined) u.subcategoria = folio.subcategoria
      if (folio.movimiento !== undefined) u.movimiento = folio.movimiento
      if (folio.fechaIngreso !== undefined) u.fecha_ingreso = folio.fechaIngreso
      if (folio.compania !== undefined) u.compania = folio.compania
      if (folio.comentarios !== undefined) u.comentarios = folio.comentarios || null
      if (folio.responsable !== undefined) u.responsable = folio.responsable || null
      const { error } = await supabase.from('folios').update(u).eq('id', id)
      if (error) throw error
      toast.success('Folio actualizado')
      await fetchFolios()
    } catch (err: any) {
      toast.error('Error al actualizar folio: ' + err.message)
    }
  }

  const eliminarFolio = async (id: string) => {
    try {
      const { error } = await supabase.from('folios').delete().eq('id', id)
      if (error) throw error
      toast.success('Folio eliminado')
      await fetchFolios()
    } catch (err: any) {
      toast.error('Error al eliminar folio: ' + err.message)
    }
  }

  // ==================== SINIESTROS ====================
  const fetchSiniestros = async () => {
    try {
      setLoadingSiniestros(true)
      const { data, error } = await supabase
        .from('siniestros')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        if (error.code === '42P01') { setSiniestrosRegistro([]); return }
        throw error
      }

      const mapped: SiniestroRegistro[] = (data || []).map((s: any) => ({
        id: s.id,
        numeroFolio: s.numero_folio,
        tipo: s.tipo as SiniestroRegistro['tipo'],
        movimiento: s.movimiento as SiniestroRegistro['movimiento'],
        fechaIngreso: s.fecha_ingreso,
        compania: s.compania,
        comentarios: s.comentarios || undefined,
        responsable: s.responsable || undefined,
        vistoBueno: s.visto_bueno || false,
        fechaVistoBueno: s.fecha_visto_bueno || undefined,
      }))
      setSiniestrosRegistro(mapped)
    } catch (err: any) {
      console.error('Error fetching siniestros:', err.message)
      setSiniestrosRegistro([])
    } finally {
      setLoadingSiniestros(false)
    }
  }

  const agregarSiniestro = async (siniestro: Omit<SiniestroRegistro, 'id'>): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('siniestros')
        .insert([{
          numero_folio: siniestro.numeroFolio,
          tipo: siniestro.tipo,
          movimiento: siniestro.movimiento,
          fecha_ingreso: siniestro.fechaIngreso,
          compania: siniestro.compania,
          comentarios: siniestro.comentarios || null,
          responsable: siniestro.responsable || null,
          visto_bueno: siniestro.vistoBueno || false,
          fecha_visto_bueno: siniestro.fechaVistoBueno || null,
        }])
        .select()
        .single()
      if (error) throw error
      toast.success('Siniestro registrado exitosamente')
      await fetchSiniestros()
      return data.id
    } catch (err: any) {
      toast.error('Error al registrar siniestro: ' + err.message)
      return null
    }
  }

  const actualizarSiniestro = async (id: string, siniestro: Partial<SiniestroRegistro>) => {
    try {
      const u: any = {}
      if (siniestro.numeroFolio !== undefined) u.numero_folio = siniestro.numeroFolio
      if (siniestro.tipo !== undefined) u.tipo = siniestro.tipo
      if (siniestro.movimiento !== undefined) u.movimiento = siniestro.movimiento
      if (siniestro.fechaIngreso !== undefined) u.fecha_ingreso = siniestro.fechaIngreso
      if (siniestro.compania !== undefined) u.compania = siniestro.compania
      if (siniestro.comentarios !== undefined) u.comentarios = siniestro.comentarios || null
      if (siniestro.responsable !== undefined) u.responsable = siniestro.responsable || null
      if (siniestro.vistoBueno !== undefined) u.visto_bueno = siniestro.vistoBueno
      if (siniestro.fechaVistoBueno !== undefined) u.fecha_visto_bueno = siniestro.fechaVistoBueno || null
      const { error } = await supabase.from('siniestros').update(u).eq('id', id)
      if (error) throw error
      toast.success('Siniestro actualizado')
      await fetchSiniestros()
    } catch (err: any) {
      toast.error('Error al actualizar siniestro: ' + err.message)
    }
  }

  const eliminarSiniestro = async (id: string) => {
    try {
      const { error } = await supabase.from('siniestros').delete().eq('id', id)
      if (error) throw error
      toast.success('Siniestro eliminado')
      await fetchSiniestros()
    } catch (err: any) {
      toast.error('Error al eliminar siniestro: ' + err.message)
    }
  }

  const darVistoBueno = async (id: string) => {
    try {
      const hoy = todayDateOnly()
      const { error } = await supabase
        .from('siniestros')
        .update({ visto_bueno: true, fecha_visto_bueno: hoy })
        .eq('id', id)
      if (error) throw error
      toast.success('Visto bueno registrado correctamente')
      await fetchSiniestros()
    } catch (err: any) {
      toast.error('Error al registrar visto bueno: ' + err.message)
    }
  }

  // ==================== VENCIDOS ====================
  // Una póliza vencida sale de Pólizas pendientes de pago; la justificación queda en
  // comentarios y en el historial.
  const marcarComoVencido = async (polizaId: string, motivo: string) => {
    const justificacion = motivo.trim()
    if (!justificacion) throw new Error('La justificación es obligatoria')
    const anterior = polizas.find(item => item.id === polizaId)
    try {
      const hoy = todayDateOnly()
      const fecha = new Date().toLocaleDateString('es-MX')
      const linea = `[${fecha}] VENCIDA: ${justificacion}`
      const { error } = await supabase
        .from('polizas')
        .update({
          estatus: 'vencida',
          fecha_vencimiento_real: hoy,
          comentarios: anterior?.comentarios ? `${anterior.comentarios}\n${linea}` : linea,
        })
        .eq('id', polizaId)
      if (error) throw error
      await registrarHistorial(polizaId, 'estatus_cambiado', 'estatus', anterior?.estatus, 'vencida', { motivo: justificacion })
      toast.success('Póliza marcada como vencida')
      await Promise.all([refrescarPolizas([polizaId]), fetchHistorialPolizas()])
    } catch (err: any) {
      toast.error('Error al marcar póliza como vencida: ' + err.message)
      throw err
    }
  }

  // ==================== EVENTOS ====================
  const fetchEventos = async () => {
    try {
      setLoadingEventos(true)
      const { data, error } = await supabase
        .from('eventos')
        .select('*')
        .order('fecha', { ascending: true })

      if (error) {
        // Si la tabla no existe, usar array vacío
        if (error.code === '42P01') {
          setEventos([])
          return
        }
        throw error
      }

      const mapped: Evento[] = (data || []).map((e: any) => ({
        id: e.id,
        titulo: e.titulo,
        descripcion: e.descripcion || undefined,
        fecha: e.fecha,
        hora: e.hora || undefined,
        tipo: e.tipo as Evento['tipo'],
        prioridad: e.prioridad as Evento['prioridad'],
        polizaId: e.poliza_id || undefined,
        clienteId: e.cliente_id || undefined,
        completado: e.completado || false,
      }))

      setEventos(mapped)
    } catch (err: any) {
      console.error('Error fetching eventos:', err.message)
      setEventos([])
    } finally {
      setLoadingEventos(false)
    }
  }

  const agregarEvento = async (evento: Omit<Evento, 'id'>): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('eventos')
        .insert([{
          titulo: evento.titulo,
          descripcion: evento.descripcion || null,
          fecha: evento.fecha,
          hora: evento.hora || null,
          tipo: evento.tipo,
          prioridad: evento.prioridad,
          poliza_id: evento.polizaId || null,
          cliente_id: evento.clienteId || null,
          completado: evento.completado || false,
        }])
        .select()
        .single()

      if (error) throw error

      toast.success('Evento creado exitosamente')
      await fetchEventos()
      return data.id
    } catch (err: any) {
      toast.error('Error al crear evento: ' + err.message)
      return null
    }
  }

  const actualizarEvento = async (id: string, evento: Partial<Evento>) => {
    try {
      const updateData: any = {}
      if (evento.titulo !== undefined) updateData.titulo = evento.titulo
      if (evento.descripcion !== undefined) updateData.descripcion = evento.descripcion || null
      if (evento.fecha !== undefined) updateData.fecha = evento.fecha
      if (evento.hora !== undefined) updateData.hora = evento.hora || null
      if (evento.tipo !== undefined) updateData.tipo = evento.tipo
      if (evento.prioridad !== undefined) updateData.prioridad = evento.prioridad
      if (evento.completado !== undefined) updateData.completado = evento.completado

      const { error } = await supabase
        .from('eventos')
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      toast.success('Evento actualizado')
      await fetchEventos()
    } catch (err: any) {
      toast.error('Error al actualizar evento: ' + err.message)
    }
  }

  const eliminarEvento = async (id: string) => {
    try {
      const { error } = await supabase.from('eventos').delete().eq('id', id)
      if (error) throw error
      toast.success('Evento eliminado')
      await fetchEventos()
    } catch (err: any) {
      toast.error('Error al eliminar evento: ' + err.message)
    }
  }

  // ==================== DOCUMENTOS CLIENTES ====================
  const BUCKET = 'documentos-clientes'

  const uploadDocumentoCliente = async (clienteId: string, file: File): Promise<DocumentoCliente | null> => {
    try {
      const ext = file.name.split('.').pop() ?? 'bin'
      const storagePath = `${clienteId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, { upsert: false, contentType: file.type || 'application/octet-stream' })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)

      const { data, error: dbError } = await supabase
        .from('cliente_documentos')
        .insert({
          cliente_id: clienteId,
          nombre: file.name,
          tipo: file.type || ext,
          tamano: file.size,
          url: urlData.publicUrl,
          storage_path: storagePath,
        })
        .select()
        .single()

      if (dbError) throw dbError

      toast.success(`"${file.name}" subido correctamente`)
      return {
        id: data.id,
        clienteId: data.cliente_id,
        nombre: data.nombre,
        tipo: data.tipo,
        tamaño: data.tamano,
        url: data.url,
        storagePath: data.storage_path,
        creadoEn: data.created_at,
      }
    } catch (err: any) {
      toast.error('Error al subir documento: ' + err.message)
      return null
    }
  }

  const getDocumentosCliente = async (clienteId: string): Promise<DocumentoCliente[]> => {
    try {
      const { data, error } = await supabase
        .from('cliente_documentos')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data || []).map((d: any) => ({
        id: d.id,
        clienteId: d.cliente_id,
        nombre: d.nombre,
        tipo: d.tipo,
        tamaño: d.tamano,
        url: d.url,
        storagePath: d.storage_path,
        creadoEn: d.created_at,
      }))
    } catch (err: any) {
      console.error('Error al obtener documentos:', err.message)
      return []
    }
  }

  const eliminarDocumentoCliente = async (doc: DocumentoCliente): Promise<void> => {
    try {
      const { error: storageErr } = await supabase.storage
        .from(BUCKET)
        .remove([doc.storagePath])

      if (storageErr) throw storageErr

      const { error: dbErr } = await supabase
        .from('cliente_documentos')
        .delete()
        .eq('id', doc.id)

      if (dbErr) throw dbErr

      toast.success(`"${doc.nombre}" eliminado`)
    } catch (err: any) {
      toast.error('Error al eliminar documento: ' + err.message)
    }
  }

  const polizasPorId = useMemo(() => new Map(polizas.map(poliza => [poliza.id, poliza])), [polizas])
  const clientesPorId = useMemo(() => new Map(clientes.map(cliente => [cliente.id, cliente])), [clientes])
  const companiasPorId = useMemo(() => new Map(companias.map(compania => [compania.id, compania])), [companias])
  const pagosPorPoliza = useMemo(() => {
    const indice = new Map<string, PagoPoliza[]>()
    for (const pago of pagos) {
      const lista = indice.get(pago.polizaId)
      if (lista) lista.push(pago)
      else indice.set(pago.polizaId, [pago])
    }
    return indice
  }, [pagos])
  const textoBusquedaPoliza = useMemo(() => new Map(polizas.map(poliza => [
    poliza.id,
    textoBuscablePoliza(poliza, clientesPorId.get(poliza.clienteId), companiasPorId.get(poliza.companiaId)?.nombre),
  ])), [polizas, clientesPorId, companiasPorId])

  // ==================== REFETCH ALL ====================
  const refetchAll = async () => {
    await Promise.all([
      fetchClientes(),
      fetchCompanias(),
      fetchPolizas(),
      fetchUsuariosSistema(),
      fetchPagos(),
      fetchRenovaciones(),
      fetchComisiones().catch(error => console.error('Error fetching comisiones:', error.message)),
      fetchHistorialPolizas(),
      fetchFlotillaUnidades(),
      fetchProspectos(),
      fetchEventos(),
      fetchFolios(),
      fetchSiniestros(),
    ])
  }

  // Cargar datos al montar
  useEffect(() => {
    refetchAll()
  }, [])

  return (
    <SupabaseContext.Provider value={{
      clientes,
      loadingClientes,
      agregarCliente,
      actualizarCliente,
      eliminarCliente,
      
      companias,
      loadingCompanias,
      
      polizas,
      loadingPolizas,
      polizasPorId,
      clientesPorId,
      companiasPorId,
      pagosPorPoliza,
      textoBusquedaPoliza,
      agregarPoliza,
      actualizarPoliza,
      eliminarPoliza,
      usuariosSistema,
      pagos,
      loadingPagos,
      registrarPago,
      validarPago,
      anularPago,
      regenerarRecibosPoliza,
      comisiones,
      marcarComisionesPagadas,
      resolverComisionPorRevertir,
      generarComisionesFaltantes,
      renovaciones,
      iniciarRenovacion,
      completarRenovacion,
      cancelarRenovacion,
      historialPolizas,
      flotillaUnidades,
      agregarUnidadFlotilla,
      actualizarUnidadFlotilla,
      desactivarUnidadFlotilla,
      buscarVehiculos,
      
      prospectos,
      loadingProspectos,
      agregarProspecto,
      actualizarProspecto,
      eliminarProspecto,

      foliosRegistro,
      loadingFolios,
      agregarFolio,
      actualizarFolio,
      eliminarFolio,

      siniestrosRegistro,
      loadingSiniestros,
      agregarSiniestro,
      actualizarSiniestro,
      eliminarSiniestro,
      darVistoBueno,
      marcarComoVencido,
      
      eventos,
      loadingEventos,
      agregarEvento,
      actualizarEvento,
      eliminarEvento,
      
      uploadDocumentoCliente,
      getDocumentosCliente,
      eliminarDocumentoCliente,

      refetchAll,
    }}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabase() {
  const context = useContext(SupabaseContext)
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return context
}
