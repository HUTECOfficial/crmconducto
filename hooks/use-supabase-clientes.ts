import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Cliente } from '@/data/clientes'
import { toast } from 'sonner'

export function useSupabaseClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar clientes
  const fetchClientes = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Mapear datos de Supabase a formato local
      const clientesMapeados: Cliente[] = (data || []).map((c: any) => ({
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

      setClientes(clientesMapeados)
      setError(null)
    } catch (err: any) {
      setError(err.message)
      toast.error('Error al cargar clientes: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Agregar cliente
  const agregarCliente = async (cliente: Omit<Cliente, 'id'>) => {
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
      throw err
    }
  }

  // Actualizar cliente
  const actualizarCliente = async (id: string, cliente: Partial<Cliente>) => {
    try {
      const { error } = await supabase
        .from('clientes')
        .update({
          nombre: cliente.nombre,
          email: cliente.email || null,
          telefono: cliente.telefono,
          empresa: cliente.empresa || null,
          rfc: cliente.rfc || null,
          direccion: cliente.direccion || null,
          ciudad: cliente.ciudad || null,
          estado: cliente.estado || null,
          codigo_postal: cliente.codigoPostal || null,
          estatus: cliente.estatus,
          notas: cliente.notas || null,
        })
        .eq('id', id)

      if (error) throw error

      toast.success('Cliente actualizado exitosamente')
      await fetchClientes()
    } catch (err: any) {
      toast.error('Error al actualizar cliente: ' + err.message)
      throw err
    }
  }

  // Eliminar cliente
  const eliminarCliente = async (id: string) => {
    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Cliente eliminado exitosamente')
      await fetchClientes()
    } catch (err: any) {
      toast.error('Error al eliminar cliente: ' + err.message)
      throw err
    }
  }

  useEffect(() => {
    fetchClientes()
  }, [])

  return {
    clientes,
    loading,
    error,
    agregarCliente,
    actualizarCliente,
    eliminarCliente,
    refetch: fetchClientes,
  }
}
