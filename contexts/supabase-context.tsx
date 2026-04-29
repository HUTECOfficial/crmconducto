"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

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
  ramo: 'autos' | 'vida' | 'gastos-medicos' | 'empresa' | 'hogar' | 'flotilla'
  numeroPoliza: string
  vigenciaInicio: string
  vigenciaFin: string
  prima: number
  formaPago: 'mensual' | 'trimestral' | 'semestral' | 'anual'
  estatus: 'activa' | 'por-renovar' | 'vencida' | 'cancelada' | 'gracia' | 'rehabilitada'
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
  }
  comentarios?: string
  notas?: string
  marcaActualizacion?: boolean
  anosVidaProducto?: number
  tipoPago?: string
  primerRecibo?: number
  recibosSubsecuentes?: number
  primaTotal?: number
  diasGraciaPrimerRecibo?: number
  diasGraciaSubsecuentes?: number
  divisas?: string
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
  agregarPoliza: (poliza: Omit<Poliza, 'id'>) => Promise<string | null>
  actualizarPoliza: (id: string, poliza: Partial<Poliza>) => Promise<void>
  eliminarPoliza: (id: string) => Promise<void>
  
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
  // Estados
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loadingClientes, setLoadingClientes] = useState(true)
  
  const [companias, setCompanias] = useState<Compania[]>([])
  const [loadingCompanias, setLoadingCompanias] = useState(true)
  
  const [polizas, setPolizas] = useState<Poliza[]>([])
  const [loadingPolizas, setLoadingPolizas] = useState(true)
  
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
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

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
      const { data, error } = await supabase
        .from('polizas')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const mapped: Poliza[] = (data || []).map((p: any) => ({
        id: p.id,
        clienteId: p.cliente_id,
        companiaId: p.compania_id,
        ramo: p.ramo as Poliza['ramo'],
        numeroPoliza: p.numero_poliza,
        vigenciaInicio: p.vigencia_inicio,
        vigenciaFin: p.vigencia_fin,
        prima: p.prima,
        formaPago: p.forma_pago as Poliza['formaPago'],
        estatus: p.estatus as Poliza['estatus'],
        folios: p.folios || [],
        tramites: p.tramites || 0,
        primaEmitida: p.prima_emitida,
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
        primaTotalRecibo: p.prima_total_recibo || undefined,
        registroSistemaCobranza: p.registro_sistema_cobranza || false,
        fechasRecordatorio: p.fechas_recordatorio || undefined,
        comentarios: p.comentarios || undefined,
        notas: p.notas || undefined,
        marcaActualizacion: p.marca_actualizacion || false,
        anosVidaProducto: p.anos_vida_producto || undefined,
        primerRecibo: p.primer_recibo ?? undefined,
        recibosSubsecuentes: p.recibos_subsecuentes ?? undefined,
        diasGraciaPrimerRecibo: p.dias_gracia_primer_recibo ?? undefined,
        diasGraciaSubsecuentes: p.dias_gracia_subsecuentes ?? undefined,
        tipoPago: p.tipo_pago || undefined,
      }))

      setPolizas(mapped)
    } catch (err: any) {
      console.error('Error fetching polizas:', err.message)
    } finally {
      setLoadingPolizas(false)
    }
  }

  const agregarPoliza = async (poliza: Omit<Poliza, 'id'>): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('polizas')
        .insert([{
          cliente_id: poliza.clienteId,
          compania_id: poliza.companiaId,
          ramo: poliza.ramo,
          numero_poliza: poliza.numeroPoliza,
          vigencia_inicio: poliza.vigenciaInicio,
          vigencia_fin: poliza.vigenciaFin,
          prima: poliza.prima,
          forma_pago: poliza.formaPago,
          estatus: poliza.estatus,
          folios: poliza.folios || null,
          tramites: poliza.tramites || 0,
          prima_emitida: poliza.primaEmitida,
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
          anos_vida_producto: poliza.anosVidaProducto || null,
          tipo_pago: poliza.tipoPago || null,
          primer_recibo: poliza.primerRecibo ?? null,
          recibos_subsecuentes: poliza.recibosSubsecuentes ?? null,
          dias_gracia_primer_recibo: poliza.diasGraciaPrimerRecibo ?? null,
          dias_gracia_subsecuentes: poliza.diasGraciaSubsecuentes ?? null,
        }])
        .select()
        .single()

      if (error) throw error

      toast.success('Póliza creada exitosamente')
      await fetchPolizas()
      return data.id
    } catch (err: any) {
      toast.error('Error al crear póliza: ' + err.message)
      return null
    }
  }

  const actualizarPoliza = async (id: string, poliza: Partial<Poliza>) => {
    try {
      const updateData: any = {}
      if (poliza.clienteId !== undefined) updateData.cliente_id = poliza.clienteId
      if (poliza.companiaId !== undefined) updateData.compania_id = poliza.companiaId
      if (poliza.ramo !== undefined) updateData.ramo = poliza.ramo
      if (poliza.numeroPoliza !== undefined) updateData.numero_poliza = poliza.numeroPoliza
      if (poliza.vigenciaInicio !== undefined) updateData.vigencia_inicio = poliza.vigenciaInicio
      if (poliza.vigenciaFin !== undefined) updateData.vigencia_fin = poliza.vigenciaFin
      if (poliza.prima !== undefined) updateData.prima = poliza.prima
      if (poliza.formaPago !== undefined) updateData.forma_pago = poliza.formaPago
      if (poliza.estatus !== undefined) updateData.estatus = poliza.estatus
      if (poliza.primaCobrada !== undefined) updateData.prima_cobrada = poliza.primaCobrada
      if (poliza.fechasRecordatorio !== undefined) updateData.fechas_recordatorio = poliza.fechasRecordatorio
      if (poliza.comentarios !== undefined) updateData.comentarios = poliza.comentarios
      if (poliza.notas !== undefined) updateData.notas = poliza.notas
      if (poliza.marcaActualizacion !== undefined) updateData.marca_actualizacion = poliza.marcaActualizacion      if (poliza.cancelacionMotivo !== undefined) updateData.cancelacion_motivo = poliza.cancelacionMotivo || null
      if (poliza.tipoPago !== undefined) updateData.tipo_pago = poliza.tipoPago || null
      if (poliza.numeroRecibo !== undefined) updateData.numero_recibo = poliza.numeroRecibo || null
      if (poliza.ultimoDiaPago !== undefined) updateData.ultimo_dia_pago = poliza.ultimoDiaPago || null
      if (poliza.periodoGracia !== undefined) updateData.periodo_gracia = poliza.periodoGracia || null
      if (poliza.primerRecibo !== undefined) updateData.primer_recibo = poliza.primerRecibo ?? null
      if (poliza.recibosSubsecuentes !== undefined) updateData.recibos_subsecuentes = poliza.recibosSubsecuentes ?? null
      if (poliza.diasGraciaPrimerRecibo !== undefined) updateData.dias_gracia_primer_recibo = poliza.diasGraciaPrimerRecibo ?? null
      if (poliza.diasGraciaSubsecuentes !== undefined) updateData.dias_gracia_subsecuentes = poliza.diasGraciaSubsecuentes ?? null
      const { error } = await supabase
        .from('polizas')
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      toast.success('Póliza actualizada')
      await fetchPolizas()
    } catch (err: any) {
      toast.error('Error al actualizar póliza: ' + err.message)
    }
  }

  const eliminarPoliza = async (id: string) => {
    try {
      const { error } = await supabase.from('polizas').delete().eq('id', id)
      if (error) throw error
      toast.success('Póliza eliminada')
      await fetchPolizas()
    } catch (err: any) {
      toast.error('Error al eliminar póliza: ' + err.message)
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
      const hoy = new Date().toISOString().split('T')[0]
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

  // ==================== REFETCH ALL ====================
  const refetchAll = async () => {
    await Promise.all([
      fetchClientes(),
      fetchCompanias(),
      fetchPolizas(),
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
      agregarPoliza,
      actualizarPoliza,
      eliminarPoliza,
      
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
