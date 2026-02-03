import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Prospecto } from '@/data/prospectos'
import { toast } from 'sonner'

export function useSupabaseProspectos() {
  const [prospectos, setProspectos] = useState<Prospecto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar prospectos
  const fetchProspectos = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('prospectos')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Mapear datos de Supabase a formato local
      const prospectosMapeados: Prospecto[] = (data || []).map((p: any) => ({
        id: p.id,
        nombre: p.nombre,
        email: p.email || '',
        telefono: p.telefono,
        empresa: p.empresa || undefined,
        origen: p.origen as Prospecto['origen'],
        interes: p.interes as Prospecto['interes'],
        prioridad: p.prioridad as Prospecto['prioridad'],
        estatus: p.estatus as Prospecto['estatus'],
        fechaContacto: p.fecha_contacto,
        notas: p.notas || undefined,
        asignadoA: p.asignado_a || undefined,
      }))

      setProspectos(prospectosMapeados)
      setError(null)
    } catch (err: any) {
      setError(err.message)
      toast.error('Error al cargar prospectos: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Agregar prospecto
  const agregarProspecto = async (prospecto: Omit<Prospecto, 'id'>) => {
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
      throw err
    }
  }

  // Actualizar prospecto
  const actualizarProspecto = async (id: string, prospecto: Partial<Prospecto>) => {
    try {
      const updateData: any = {}
      
      if (prospecto.nombre) updateData.nombre = prospecto.nombre
      if (prospecto.email !== undefined) updateData.email = prospecto.email || null
      if (prospecto.telefono) updateData.telefono = prospecto.telefono
      if (prospecto.empresa !== undefined) updateData.empresa = prospecto.empresa || null
      if (prospecto.origen) updateData.origen = prospecto.origen
      if (prospecto.interes) updateData.interes = prospecto.interes
      if (prospecto.prioridad) updateData.prioridad = prospecto.prioridad
      if (prospecto.estatus) updateData.estatus = prospecto.estatus
      if (prospecto.fechaContacto) updateData.fecha_contacto = prospecto.fechaContacto
      if (prospecto.notas !== undefined) updateData.notas = prospecto.notas || null
      if (prospecto.asignadoA !== undefined) updateData.asignado_a = prospecto.asignadoA || null

      const { error } = await supabase
        .from('prospectos')
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      toast.success('Prospecto actualizado exitosamente')
      await fetchProspectos()
    } catch (err: any) {
      toast.error('Error al actualizar prospecto: ' + err.message)
      throw err
    }
  }

  // Eliminar prospecto
  const eliminarProspecto = async (id: string) => {
    try {
      const { error } = await supabase
        .from('prospectos')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Prospecto eliminado exitosamente')
      await fetchProspectos()
    } catch (err: any) {
      toast.error('Error al eliminar prospecto: ' + err.message)
      throw err
    }
  }

  useEffect(() => {
    fetchProspectos()
  }, [])

  return {
    prospectos,
    loading,
    error,
    agregarProspecto,
    actualizarProspecto,
    eliminarProspecto,
    refetch: fetchProspectos,
  }
}
