"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

// Tipos
export interface Cliente {
  id: string
  nombre: string
  email: string
  telefono: string
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
  
  // Eventos del calendario
  eventos: Evento[]
  loadingEventos: boolean
  agregarEvento: (evento: Omit<Evento, 'id'>) => Promise<string | null>
  actualizarEvento: (id: string, evento: Partial<Evento>) => Promise<void>
  eliminarEvento: (id: string) => Promise<void>
  
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
      if (poliza.marcaActualizacion !== undefined) updateData.marca_actualizacion = poliza.marcaActualizacion

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

  // ==================== REFETCH ALL ====================
  const refetchAll = async () => {
    await Promise.all([
      fetchClientes(),
      fetchCompanias(),
      fetchPolizas(),
      fetchProspectos(),
      fetchEventos(),
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
      
      eventos,
      loadingEventos,
      agregarEvento,
      actualizarEvento,
      eliminarEvento,
      
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
