export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      clientes: {
        Row: {
          id: string
          nombre: string
          email: string | null
          telefono: string
          empresa: string | null
          rfc: string | null
          direccion: string | null
          ciudad: string | null
          estado: string | null
          codigo_postal: string | null
          fecha_registro: string
          estatus: string
          notas: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          email?: string | null
          telefono: string
          empresa?: string | null
          rfc?: string | null
          direccion?: string | null
          ciudad?: string | null
          estado?: string | null
          codigo_postal?: string | null
          fecha_registro?: string
          estatus?: string
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          email?: string | null
          telefono?: string
          empresa?: string | null
          rfc?: string | null
          direccion?: string | null
          ciudad?: string | null
          estado?: string | null
          codigo_postal?: string | null
          fecha_registro?: string
          estatus?: string
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      polizas: {
        Row: {
          id: string
          cliente_id: string
          compania_id: string
          ramo: string
          numero_poliza: string
          vigencia_inicio: string
          vigencia_fin: string
          prima: number
          forma_pago: string
          estatus: string
          folios: string[] | null
          tramites: number
          prima_emitida: number
          prima_cobrada: number
          fecha_emision: string
          periodo_gracia: string | null
          cancelacion_motivo: string | null
          rehabilitacion_fecha: string | null
          agente: string | null
          inciso_endoso: string | null
          nombre_asegurado: string | null
          ultimo_dia_pago: string | null
          numero_recibo: string | null
          prima_total_recibo: number | null
          registro_sistema_cobranza: boolean
          fechas_recordatorio: Json | null
          comentarios: string | null
          notas: string | null
          marca_actualizacion: boolean
          anos_vida_producto: number | null
          tipo_pago: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cliente_id: string
          compania_id: string
          ramo: string
          numero_poliza: string
          vigencia_inicio: string
          vigencia_fin: string
          prima: number
          forma_pago: string
          estatus?: string
          folios?: string[] | null
          tramites?: number
          prima_emitida: number
          prima_cobrada?: number
          fecha_emision: string
          periodo_gracia?: string | null
          cancelacion_motivo?: string | null
          rehabilitacion_fecha?: string | null
          agente?: string | null
          inciso_endoso?: string | null
          nombre_asegurado?: string | null
          ultimo_dia_pago?: string | null
          numero_recibo?: string | null
          prima_total_recibo?: number | null
          registro_sistema_cobranza?: boolean
          fechas_recordatorio?: Json | null
          comentarios?: string | null
          notas?: string | null
          marca_actualizacion?: boolean
          anos_vida_producto?: number | null
          tipo_pago?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cliente_id?: string
          compania_id?: string
          ramo?: string
          numero_poliza?: string
          vigencia_inicio?: string
          vigencia_fin?: string
          prima?: number
          forma_pago?: string
          estatus?: string
          folios?: string[] | null
          tramites?: number
          prima_emitida?: number
          prima_cobrada?: number
          fecha_emision?: string
          periodo_gracia?: string | null
          cancelacion_motivo?: string | null
          rehabilitacion_fecha?: string | null
          agente?: string | null
          inciso_endoso?: string | null
          nombre_asegurado?: string | null
          ultimo_dia_pago?: string | null
          numero_recibo?: string | null
          prima_total_recibo?: number | null
          registro_sistema_cobranza?: boolean
          fechas_recordatorio?: Json | null
          comentarios?: string | null
          notas?: string | null
          marca_actualizacion?: boolean
          anos_vida_producto?: number | null
          tipo_pago?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      prospectos: {
        Row: {
          id: string
          nombre: string
          email: string | null
          telefono: string
          empresa: string | null
          origen: string
          interes: string
          prioridad: string
          estatus: string
          fecha_contacto: string
          notas: string | null
          asignado_a: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          email?: string | null
          telefono: string
          empresa?: string | null
          origen: string
          interes: string
          prioridad?: string
          estatus?: string
          fecha_contacto: string
          notas?: string | null
          asignado_a?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          email?: string | null
          telefono?: string
          empresa?: string | null
          origen?: string
          interes?: string
          prioridad?: string
          estatus?: string
          fecha_contacto?: string
          notas?: string | null
          asignado_a?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      companias: {
        Row: {
          id: string
          nombre: string
          color: string
          logo: string | null
          contacto: string | null
          telefono: string | null
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          color: string
          logo?: string | null
          contacto?: string | null
          telefono?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          color?: string
          logo?: string | null
          contacto?: string | null
          telefono?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      pagos: {
        Row: {
          id: string
          poliza_id: string
          cliente_id: string
          monto: number
          fecha_pago: string | null
          metodo_pago: string
          referencia: string | null
          estatus: string
          notas: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          poliza_id: string
          cliente_id: string
          monto: number
          fecha_pago?: string | null
          metodo_pago: string
          referencia?: string | null
          estatus?: string
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          poliza_id?: string
          cliente_id?: string
          monto?: number
          fecha_pago?: string | null
          metodo_pago?: string
          referencia?: string | null
          estatus?: string
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      usuarios: {
        Row: {
          id: string
          nombre: string
          email: string
          rol: string
          avatar: string | null
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          email: string
          rol: string
          avatar?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          email?: string
          rol?: string
          avatar?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
