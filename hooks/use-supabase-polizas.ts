import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Poliza } from '@/data/polizas'
import { toast } from 'sonner'

export function useSupabasePolizas() {
  const [polizas, setPolizas] = useState<Poliza[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar pólizas
  const fetchPolizas = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('polizas')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Mapear datos de Supabase a formato local
      const polizasMapeadas: Poliza[] = (data || []).map((p: any) => ({
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
      }))

      setPolizas(polizasMapeadas)
      setError(null)
    } catch (err: any) {
      setError(err.message)
      toast.error('Error al cargar pólizas: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Agregar póliza
  const agregarPoliza = async (poliza: Omit<Poliza, 'id'>) => {
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
        }])
        .select()
        .single()

      if (error) throw error

      toast.success('Póliza creada exitosamente')
      await fetchPolizas()
      return data.id
    } catch (err: any) {
      toast.error('Error al crear póliza: ' + err.message)
      throw err
    }
  }

  // Actualizar póliza
  const actualizarPoliza = async (id: string, poliza: Partial<Poliza>) => {
    try {
      const updateData: any = {}
      
      if (poliza.clienteId) updateData.cliente_id = poliza.clienteId
      if (poliza.companiaId) updateData.compania_id = poliza.companiaId
      if (poliza.ramo) updateData.ramo = poliza.ramo
      if (poliza.numeroPoliza) updateData.numero_poliza = poliza.numeroPoliza
      if (poliza.vigenciaInicio) updateData.vigencia_inicio = poliza.vigenciaInicio
      if (poliza.vigenciaFin) updateData.vigencia_fin = poliza.vigenciaFin
      if (poliza.prima !== undefined) updateData.prima = poliza.prima
      if (poliza.formaPago) updateData.forma_pago = poliza.formaPago
      if (poliza.estatus) updateData.estatus = poliza.estatus
      if (poliza.folios) updateData.folios = poliza.folios
      if (poliza.tramites !== undefined) updateData.tramites = poliza.tramites
      if (poliza.primaEmitida !== undefined) updateData.prima_emitida = poliza.primaEmitida
      if (poliza.primaCobrada !== undefined) updateData.prima_cobrada = poliza.primaCobrada
      if (poliza.fechaEmision) updateData.fecha_emision = poliza.fechaEmision
      if (poliza.periodoGracia) updateData.periodo_gracia = poliza.periodoGracia
      if (poliza.cancelacionMotivo) updateData.cancelacion_motivo = poliza.cancelacionMotivo
      if (poliza.rehabilitacionFecha) updateData.rehabilitacion_fecha = poliza.rehabilitacionFecha
      if (poliza.agente) updateData.agente = poliza.agente
      if (poliza.incisoEndoso) updateData.inciso_endoso = poliza.incisoEndoso
      if (poliza.nombreAsegurado) updateData.nombre_asegurado = poliza.nombreAsegurado
      if (poliza.ultimoDiaPago) updateData.ultimo_dia_pago = poliza.ultimoDiaPago
      if (poliza.numeroRecibo) updateData.numero_recibo = poliza.numeroRecibo
      if (poliza.primaTotalRecibo !== undefined) updateData.prima_total_recibo = poliza.primaTotalRecibo
      if (poliza.registroSistemaCobranza !== undefined) updateData.registro_sistema_cobranza = poliza.registroSistemaCobranza
      if (poliza.fechasRecordatorio) updateData.fechas_recordatorio = poliza.fechasRecordatorio
      if (poliza.comentarios) updateData.comentarios = poliza.comentarios
      if (poliza.notas) updateData.notas = poliza.notas
      if (poliza.marcaActualizacion !== undefined) updateData.marca_actualizacion = poliza.marcaActualizacion

      const { error } = await supabase
        .from('polizas')
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      toast.success('Póliza actualizada exitosamente')
      await fetchPolizas()
    } catch (err: any) {
      toast.error('Error al actualizar póliza: ' + err.message)
      throw err
    }
  }

  // Eliminar póliza
  const eliminarPoliza = async (id: string) => {
    try {
      const { error } = await supabase
        .from('polizas')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Póliza eliminada exitosamente')
      await fetchPolizas()
    } catch (err: any) {
      toast.error('Error al eliminar póliza: ' + err.message)
      throw err
    }
  }

  useEffect(() => {
    fetchPolizas()
  }, [])

  return {
    polizas,
    loading,
    error,
    agregarPoliza,
    actualizarPoliza,
    eliminarPoliza,
    refetch: fetchPolizas,
  }
}
