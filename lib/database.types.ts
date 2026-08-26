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
          vigencia_pago_fin: string | null
          vigencia_producto_fin: string | null
          prima: number
          forma_pago: string
          estatus: string
          renovacion_estado: string
          renovada_desde_id: string | null
          renovada_a_id: string | null
          vendedor_id: string | null
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
          vigencia_vida_pago: number | null
          vigencia_vida_producto: number | null
          anos_vida_producto: number | null
          tipo_pago: string | null
          valor_udi_inicial: number | null
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
          vigencia_pago_fin?: string | null
          vigencia_producto_fin?: string | null
          prima: number
          forma_pago: string
          estatus?: string
          renovacion_estado?: string
          renovada_desde_id?: string | null
          renovada_a_id?: string | null
          vendedor_id?: string | null
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
          vigencia_vida_pago?: number | null
          vigencia_vida_producto?: number | null
          anos_vida_producto?: number | null
          tipo_pago?: string | null
          valor_udi_inicial?: number | null
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
          vigencia_pago_fin?: string | null
          vigencia_producto_fin?: string | null
          prima?: number
          forma_pago?: string
          estatus?: string
          renovacion_estado?: string
          renovada_desde_id?: string | null
          renovada_a_id?: string | null
          vendedor_id?: string | null
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
          vigencia_vida_pago?: number | null
          vigencia_vida_producto?: number | null
          anos_vida_producto?: number | null
          tipo_pago?: string | null
          valor_udi_inicial?: number | null
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
          metodo_pago: string | null
          referencia: string | null
          estatus: string
          notas: string | null
          numero_recibo: number | null
          total_recibos: number | null
          anualidad: number
          moneda: string
          monto_udis: number | null
          valor_udi: number | null
          monto_mxn: number | null
          fecha_emision: string | null
          fecha_limite: string | null
          cancelado_en: string | null
          cancelado_por: string | null
          motivo_cancelacion: string | null
          anulado_en: string | null
          anulado_por: string | null
          motivo_anulacion: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          poliza_id: string
          cliente_id: string
          monto: number
          fecha_pago?: string | null
          metodo_pago?: string | null
          referencia?: string | null
          estatus?: string
          notas?: string | null
          numero_recibo?: number | null
          total_recibos?: number | null
          anualidad?: number
          moneda?: string
          monto_udis?: number | null
          valor_udi?: number | null
          monto_mxn?: number | null
          fecha_emision?: string | null
          fecha_limite?: string | null
          cancelado_en?: string | null
          cancelado_por?: string | null
          motivo_cancelacion?: string | null
          anulado_en?: string | null
          anulado_por?: string | null
          motivo_anulacion?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          poliza_id?: string
          cliente_id?: string
          monto?: number
          fecha_pago?: string | null
          metodo_pago?: string | null
          referencia?: string | null
          estatus?: string
          notas?: string | null
          numero_recibo?: number | null
          total_recibos?: number | null
          anualidad?: number
          moneda?: string
          monto_udis?: number | null
          valor_udi?: number | null
          monto_mxn?: number | null
          fecha_emision?: string | null
          fecha_limite?: string | null
          cancelado_en?: string | null
          cancelado_por?: string | null
          motivo_cancelacion?: string | null
          anulado_en?: string | null
          anulado_por?: string | null
          motivo_anulacion?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      renovaciones: {
        Row: {
          id: string
          poliza_origen_id: string
          poliza_renovada_id: string | null
          estado: string
          estatus_poliza_anterior: string
          iniciada_por: string | null
          completada_por: string | null
          cancelada_por: string | null
          motivo_cancelacion: string | null
          iniciada_en: string
          completada_en: string | null
          cancelada_en: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          poliza_origen_id: string
          poliza_renovada_id?: string | null
          estado?: string
          estatus_poliza_anterior: string
          iniciada_por?: string | null
          completada_por?: string | null
          cancelada_por?: string | null
          motivo_cancelacion?: string | null
          iniciada_en?: string
          completada_en?: string | null
          cancelada_en?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          poliza_origen_id?: string
          poliza_renovada_id?: string | null
          estado?: string
          estatus_poliza_anterior?: string
          iniciada_por?: string | null
          completada_por?: string | null
          cancelada_por?: string | null
          motivo_cancelacion?: string | null
          iniciada_en?: string
          completada_en?: string | null
          cancelada_en?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      poliza_historial: {
        Row: {
          id: string
          poliza_id: string
          tipo_cambio: string
          campo: string | null
          valor_anterior: Json | null
          valor_nuevo: Json | null
          usuario_id: string | null
          usuario_nombre: string | null
          usuario_email: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          poliza_id: string
          tipo_cambio: string
          campo?: string | null
          valor_anterior?: Json | null
          valor_nuevo?: Json | null
          usuario_id?: string | null
          usuario_nombre?: string | null
          usuario_email?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          poliza_id?: string
          tipo_cambio?: string
          campo?: string | null
          valor_anterior?: Json | null
          valor_nuevo?: Json | null
          usuario_id?: string | null
          usuario_nombre?: string | null
          usuario_email?: string | null
          metadata?: Json
          created_at?: string
        }
      }
      flotillas: {
        Row: {
          id: string
          poliza_id: string
          nombre: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          poliza_id: string
          nombre?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          poliza_id?: string
          nombre?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      flotilla_unidades: {
        Row: {
          id: string
          flotilla_id: string
          numero_inciso: string
          descripcion: string | null
          marca: string | null
          modelo: string | null
          placas: string | null
          numero_serie: string | null
          prima_total: number | null
          activa: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          flotilla_id: string
          numero_inciso: string
          descripcion?: string | null
          marca?: string | null
          modelo?: string | null
          placas?: string | null
          numero_serie?: string | null
          prima_total?: number | null
          activa?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          flotilla_id?: string
          numero_inciso?: string
          descripcion?: string | null
          marca?: string | null
          modelo?: string | null
          placas?: string | null
          numero_serie?: string | null
          prima_total?: number | null
          activa?: boolean
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
