import 'server-only'
import type Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"
import { supabaseServidor, type SupabaseServidor } from "@/lib/supabase-servidor"
import { compareDateOnly, formatDateOnly, todayDateOnly } from "@/lib/date-only"
import { calcularMontoMxnUdis, reciboPorCobrar } from "@/lib/payment-schedule"
import { valorUdiDelDia } from "@/lib/udi-dof"
import { descargarArchivo } from "@/lib/telegram/api"
import type { HerramientasExtra } from "@/lib/asistente/agente"
import { patronAproximado } from "@/lib/busqueda"

/**
 * Tareas que Coni puede hacer desde Telegram. Coni sólo PROPONE (valida y arma un resumen);
 * la tarea se ejecuta hasta que el usuario toca ✅ Confirmar. Las reglas son las mismas de las
 * pantallas del CRM (Pólizas pendientes, Calendario, Prospección, Editar póliza).
 *
 * Cambios de prima, forma de pago, vigencias o días de gracia NO se hacen aquí: recalculan los
 * recibos y esa lógica vive en "Editar póliza" del CRM.
 */
const VIGENCIA_PROPUESTA_MS = 30 * 60_000
const BUCKET_COMPROBANTES = "documentos-clientes"
const METODOS_PAGO = ["efectivo", "transferencia", "tarjeta", "domiciliacion", "cheque"] as const
const FECHA = /^\d{4}-\d{2}-\d{2}$/
const TIPOS_EVENTO = ["cita", "recordatorio", "pago", "renovacion", "otro"] as const
const RAMOS_PROSPECTO = ["autos", "vida", "gastos-medicos", "empresa", "hogar", "flotilla"] as const
const ORIGENES = ["directo", "referido", "redes-sociales", "telefono", "web"] as const
const ESTATUS_PROSPECTO = ["nuevo", "contactado", "en-seguimiento", "convertido", "perdido", "aprobado", "rechazado"] as const
const ESTATUS_POLIZA = ["activa", "vigente", "en-movimientos", "por-renovar", "renovada", "gracia", "vencida", "cancelada", "cancelada-cliente", "cancelada-falta-pago", "espera-formato", "rechazo-bancario", "rehabilitada"] as const
const ESTATUS_CANCELADA = ["cancelada", "cancelada-cliente", "cancelada-falta-pago"]
const PRIORIDADES = ["alta", "media", "baja"] as const

export interface Solicitante {
  chatId: number
  email: string
  nombre: string
  /** Foto más reciente que mandó al chat (comprobante), si la hay. */
  fotoFileId?: string | null
}

export interface Propuesta { id: string; resumen: string }

const esquemas = {
  proponer_comentario: z.object({ numero_poliza: z.string().min(1), comentario: z.string().min(1).max(1000) }),
  proponer_evento: z.object({
    titulo: z.string().min(1).max(200),
    fecha: z.string().regex(FECHA),
    tipo: z.enum(TIPOS_EVENTO).optional(),
    hora: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    descripcion: z.string().max(1000).optional(),
    numero_poliza: z.string().optional(),
    prioridad: z.enum(PRIORIDADES).optional(),
  }),
  proponer_prospecto: z.object({
    nombre: z.string().min(2).max(200),
    telefono: z.string().min(7).max(40),
    interes: z.enum(RAMOS_PROSPECTO),
    origen: z.enum(ORIGENES),
    email: z.string().email().optional(),
    empresa: z.string().max(200).optional(),
    prioridad: z.enum(PRIORIDADES).optional(),
    asignado_a: z.string().max(100).optional(),
    notas: z.string().max(2000).optional(),
  }),
  proponer_actualizar_prospecto: z.object({
    prospecto: z.string().min(2),
    estatus: z.enum(ESTATUS_PROSPECTO).optional(),
    prioridad: z.enum(PRIORIDADES).optional(),
    asignado_a: z.string().max(100).optional(),
    comentario: z.string().max(1000).optional(),
  }),
  proponer_actualizar_poliza: z.object({
    numero_poliza: z.string().min(1),
    estatus: z.enum(ESTATUS_POLIZA).optional(),
    motivo: z.string().max(500).optional(),
    vendedor: z.string().max(100).optional(),
    grupo: z.string().max(100).optional(),
    porcentaje_comision: z.number().min(0).max(100).optional(),
    tipo_pago: z.enum(METODOS_PAGO).optional(),
    agente: z.string().max(100).optional(),
    nombre_asegurado: z.string().max(200).optional(),
  }),
  proponer_registro_pago: z.object({
    numero_poliza: z.string().min(1),
    metodo_pago: z.enum(METODOS_PAGO),
    fecha_pago: z.string().regex(FECHA).optional(),
    numero_recibo: z.number().int().positive().optional(),
    referencia: z.string().max(200).optional(),
  }),
}

export const DEFINICIONES_ACCIONES: Anthropic.Tool[] = [
  {
    name: "proponer_comentario",
    description: "Prepara un comentario de seguimiento en una PÓLIZA (p. ej. 'le marqué, paga el viernes'). No lo guarda: el usuario lo confirma con un botón. Para comentar a un PROSPECTO usa proponer_actualizar_prospecto con 'comentario'.",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: {
        numero_poliza: { type: "string", description: "Número exacto de la póliza." },
        comentario: { type: "string", description: "Texto del comentario, redactado claro y breve." },
      },
      required: ["numero_poliza", "comentario"],
    },
  },
  {
    name: "proponer_evento",
    description: "Prepara un evento en el Calendario del CRM: cita, recordatorio, pago, renovación u otro. No lo guarda: el usuario lo confirma con un botón. Convierte fechas relativas ('el jueves', 'mañana') a AAAA-MM-DD con la fecha de hoy.",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: {
        titulo: { type: "string", description: "Qué hay que hacer, p. ej. 'Llamar a Lozano por el recibo 6/12'." },
        fecha: { type: "string", description: "AAAA-MM-DD" },
        tipo: { type: "string", enum: [...TIPOS_EVENTO], description: "Por defecto recordatorio." },
        hora: { type: "string", description: "HH:MM en 24 horas (opcional)." },
        descripcion: { type: "string", description: "Detalle opcional." },
        numero_poliza: { type: "string", description: "Póliza relacionada (opcional)." },
        prioridad: { type: "string", enum: [...PRIORIDADES] },
      },
      required: ["titulo", "fecha"],
    },
  },
  {
    name: "proponer_prospecto",
    description: "Prepara el alta de un prospecto en Prospección (estatus 'nuevo', fecha de contacto hoy). No lo guarda: el usuario lo confirma con un botón. Si faltan nombre, teléfono, ramo de interés u origen, pregúntalos antes.",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: {
        nombre: { type: "string" },
        telefono: { type: "string" },
        interes: { type: "string", enum: [...RAMOS_PROSPECTO], description: "Ramo que le interesa." },
        origen: { type: "string", enum: [...ORIGENES], description: "Cómo llegó." },
        email: { type: "string" },
        empresa: { type: "string" },
        prioridad: { type: "string", enum: [...PRIORIDADES] },
        asignado_a: { type: "string", description: "Responsable (nombre de un usuario del CRM). Por defecto, quien lo pide." },
        notas: { type: "string" },
      },
      required: ["nombre", "telefono", "interes", "origen"],
    },
  },
  {
    name: "proponer_actualizar_prospecto",
    description: "Prepara cambios a un prospecto o le agrega un comentario de seguimiento (se guarda en los Comentarios del prospecto, igual que el botón 'Comentar' de Prospección): estatus (nuevo, contactado, en-seguimiento, convertido, perdido, aprobado, rechazado), prioridad, responsable y/o comentario. Úsala cuando pidan comentar, anotar o dar seguimiento a un prospecto. No lo guarda: el usuario lo confirma con un botón.",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: {
        prospecto: { type: "string", description: "Nombre, teléfono o correo del prospecto." },
        estatus: { type: "string", enum: [...ESTATUS_PROSPECTO] },
        prioridad: { type: "string", enum: [...PRIORIDADES] },
        asignado_a: { type: "string", description: "Nuevo responsable (nombre de un usuario del CRM)." },
        comentario: { type: "string", description: "Comentario de seguimiento, p. ej. 'le llamé, pide cotización el lunes'." },
      },
      required: ["prospecto"],
    },
  },
  {
    name: "proponer_actualizar_poliza",
    description: "Prepara cambios a una póliza: estatus, vendedor, grupo, % de comisión, tipo de pago, agente de cobranza o nombre del asegurado. Para marcarla vencida o cancelarla se requiere un motivo; cancelarla también cancela sus recibos pendientes. No sirve para prima, forma de pago, vigencias, primer recibo ni días de gracia (recalculan recibos): para eso indica usar 'Editar póliza' en el CRM. No lo guarda: el usuario lo confirma con un botón.",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: {
        numero_poliza: { type: "string" },
        estatus: { type: "string", enum: [...ESTATUS_POLIZA] },
        motivo: { type: "string", description: "Obligatorio al marcar vencida o cancelar." },
        vendedor: { type: "string", description: "Nombre de un usuario del CRM." },
        grupo: { type: "string" },
        porcentaje_comision: { type: "number" },
        tipo_pago: { type: "string", enum: [...METODOS_PAGO] },
        agente: { type: "string" },
        nombre_asegurado: { type: "string" },
      },
      required: ["numero_poliza"],
    },
  },
  {
    name: "proponer_registro_pago",
    description: "Prepara el registro de un pago con la foto del comprobante que el usuario mandó al chat. El recibo queda 'por validar' (alguien lo valida en el CRM). No lo guarda: el usuario lo confirma con un botón. Requiere que haya una foto reciente; si no la hay, pídela. Si no dicen el recibo, se usa el siguiente por cobrar.",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: {
        numero_poliza: { type: "string", description: "Número exacto de la póliza." },
        metodo_pago: { type: "string", enum: [...METODOS_PAGO], description: "Cómo pagó el cliente." },
        fecha_pago: { type: "string", description: "AAAA-MM-DD en que pagó el cliente (por defecto hoy; no puede ser futura)." },
        numero_recibo: { type: "integer", description: "Número del recibo, si lo indican." },
        referencia: { type: "string", description: "Folio o referencia del pago, si aparece." },
      },
      required: ["numero_poliza", "metodo_pago"],
    },
  },
]

const mxn = (monto: number, moneda = "MXN") => `${moneda === "MXN" ? "$" : ""}${monto.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${moneda === "MXN" ? "" : ` ${moneda}`}`

async function buscarPoliza(db: SupabaseServidor, numero: string) {
  const { data, error } = await db.from("polizas")
    .select("id, numero_poliza, cliente_id, comentarios, estatus, clientes(nombre)")
    .ilike("numero_poliza", numero.trim()).limit(2)
  if (error) throw error
  if (data?.length === 1) return data[0] as any
  if (data && data.length > 1) throw new Error(`Hay más de una póliza que coincide con ${numero}; dime el número completo.`)
  // Número dictado por voz (p. ej. "9669504" por "96695U04"): sólo si el parecido es único.
  // El resumen de confirmación muestra el número real, así que el usuario lo valida.
  const patron = patronAproximado(numero)
  if (patron) {
    const { data: parecidas } = await db.from("polizas").select("id, numero_poliza, cliente_id, comentarios, estatus, clientes(nombre)").ilike("numero_poliza", patron).limit(3)
    if (parecidas?.length === 1) return parecidas[0] as any
    if (parecidas && parecidas.length > 1) throw new Error(`No encontré ${numero}; números parecidos: ${parecidas.map(p => p.numero_poliza).join(", ")}. ¿Cuál es?`)
  }
  throw new Error(`No encontré la póliza ${numero}.`)
}

type TipoAccion = "comentario" | "evento" | "pago" | "prospecto" | "prospecto_cambio" | "poliza_cambio"

async function proponer(db: SupabaseServidor, solicitante: Solicitante, tipo: TipoAccion, datos: object, resumen: string): Promise<Propuesta> {
  const { data, error } = await db.from("telegram_acciones")
    .insert([{ telegram_chat_id: solicitante.chatId, usuario_email: solicitante.email, tipo, datos, resumen }])
    .select("id").single()
  if (error) throw error
  return { id: data.id, resumen }
}

/** Herramientas de tareas para el agente; las propuestas creadas se acumulan en `propuestas`. */
export function herramientasDeAcciones(solicitante: Solicitante, propuestas: Propuesta[]): HerramientasExtra {
  const db = supabaseServidor(solicitante.email)
  return {
    definiciones: DEFINICIONES_ACCIONES,
    estados: {
      proponer_comentario: "Preparando el comentario…", proponer_evento: "Preparando el evento…", proponer_registro_pago: "Preparando el registro del pago…",
      proponer_prospecto: "Preparando el prospecto…", proponer_actualizar_prospecto: "Preparando los cambios…", proponer_actualizar_poliza: "Preparando los cambios a la póliza…",
    },
    async ejecutar(nombre, entrada) {
      if (!(nombre in esquemas)) return null
      const validada = esquemas[nombre as keyof typeof esquemas].safeParse(entrada ?? {})
      if (!validada.success) return { contenido: JSON.stringify({ INVALID_JSON: JSON.stringify(entrada) }), error: true }
      try {
        let propuesta: Propuesta
        if (nombre === "proponer_comentario") {
          const d = validada.data as z.infer<typeof esquemas.proponer_comentario>
          const poliza = await buscarPoliza(db, d.numero_poliza)
          propuesta = await proponer(db, solicitante, "comentario", { polizaId: poliza.id, comentario: d.comentario },
            `📝 Comentario en la póliza ${poliza.numero_poliza} (${poliza.clientes?.nombre ?? "sin cliente"}):\n"${d.comentario}"`)
        } else if (nombre === "proponer_evento") {
          const d = validada.data as z.infer<typeof esquemas.proponer_evento>
          if (compareDateOnly(d.fecha, todayDateOnly()) < 0) throw new Error("La fecha del evento ya pasó.")
          const poliza = d.numero_poliza ? await buscarPoliza(db, d.numero_poliza) : null
          const tipo = d.tipo ?? "recordatorio"
          propuesta = await proponer(db, solicitante, "evento", {
            titulo: d.titulo, fecha: d.fecha, hora: d.hora ?? null, descripcion: d.descripcion ?? null, tipo,
            prioridad: d.prioridad ?? "media", polizaId: poliza?.id ?? null, clienteId: poliza?.cliente_id ?? null,
          }, `📅 ${ETIQUETA_EVENTO[tipo]}: ${d.titulo}\n${formatDateOnly(d.fecha)}${d.hora ? ` a las ${d.hora}` : ""}${poliza ? ` · póliza ${poliza.numero_poliza}` : ""} · prioridad ${d.prioridad ?? "media"}`)
        } else if (nombre === "proponer_prospecto") {
          const d = validada.data as z.infer<typeof esquemas.proponer_prospecto>
          const responsable = d.asignado_a ? await usuarioPorNombre(db, d.asignado_a) : { nombre: solicitante.nombre }
          propuesta = await proponer(db, solicitante, "prospecto", { ...d, asignado_a: responsable.nombre }, [
            `🆕 Nuevo prospecto: ${d.nombre}`,
            `📞 ${d.telefono}${d.email ? ` · ${d.email}` : ""}${d.empresa ? ` · ${d.empresa}` : ""}`,
            `Interés: ${d.interes} · origen: ${d.origen} · prioridad ${d.prioridad ?? "media"} · responsable ${responsable.nombre}`,
            d.notas ? `Notas: ${d.notas}` : "",
          ].filter(Boolean).join("\n"))
        } else if (nombre === "proponer_actualizar_prospecto") {
          const d = validada.data as z.infer<typeof esquemas.proponer_actualizar_prospecto>
          const prospecto = await buscarProspecto(db, d.prospecto)
          const responsable = d.asignado_a ? (await usuarioPorNombre(db, d.asignado_a)).nombre : undefined
          const cambios: string[] = []
          if (d.estatus && d.estatus !== prospecto.estatus) cambios.push(`Estatus: ${prospecto.estatus} → ${d.estatus}`)
          if (d.prioridad && d.prioridad !== prospecto.prioridad) cambios.push(`Prioridad: ${prospecto.prioridad} → ${d.prioridad}`)
          if (responsable && responsable !== prospecto.asignado_a) cambios.push(`Responsable: ${prospecto.asignado_a || "sin asignar"} → ${responsable}`)
          if (d.comentario) cambios.push(`💬 Comentario: "${d.comentario}"`)
          if (!cambios.length) throw new Error("No hay cambios: el prospecto ya tiene esos datos.")
          propuesta = await proponer(db, solicitante, "prospecto_cambio", { prospectoId: prospecto.id, estatus: d.estatus, prioridad: d.prioridad, asignadoA: responsable, nota: d.comentario },
            `✏️ Prospecto ${prospecto.nombre}\n${cambios.join("\n")}`)
        } else if (nombre === "proponer_actualizar_poliza") {
          const d = validada.data as z.infer<typeof esquemas.proponer_actualizar_poliza>
          const { data: poliza, error } = await db.from("polizas")
            .select("id, numero_poliza, estatus, vendedor_id, grupo, porcentaje_comision, tipo_pago, agente, nombre_asegurado, clientes(nombre)")
            .ilike("numero_poliza", d.numero_poliza.trim()).limit(2)
          if (error) throw error
          if (!poliza?.length) throw new Error(`No encontré la póliza ${d.numero_poliza}.`)
          if (poliza.length > 1) throw new Error(`Hay más de una póliza que coincide con ${d.numero_poliza}; dime el número completo.`)
          const p: any = poliza[0]
          const cambios: Record<string, { antes: unknown; despues: unknown }> = {}
          const anotar = (campo: string, antes: unknown, despues: unknown) => {
            if (despues !== undefined && despues !== (antes ?? undefined)) cambios[campo] = { antes: antes ?? null, despues }
          }
          if (d.estatus && d.estatus !== p.estatus) {
            if (ESTATUS_CANCELADA.includes(p.estatus)) throw new Error("La póliza está cancelada: reactivarla recalcula sus recibos, hazlo desde Editar póliza en el CRM.")
            if ((d.estatus === "vencida" || ESTATUS_CANCELADA.includes(d.estatus)) && !d.motivo?.trim()) throw new Error("Para marcarla vencida o cancelarla necesito el motivo.")
            anotar("estatus", p.estatus, d.estatus)
          }
          let vendedorNombre: string | undefined
          if (d.vendedor) {
            const vendedor = await usuarioPorNombre(db, d.vendedor)
            vendedorNombre = vendedor.nombre
            anotar("vendedor_id", p.vendedor_id, vendedor.id)
          }
          anotar("grupo", p.grupo, d.grupo)
          anotar("porcentaje_comision", p.porcentaje_comision == null ? null : Number(p.porcentaje_comision), d.porcentaje_comision)
          anotar("tipo_pago", p.tipo_pago, d.tipo_pago)
          anotar("agente", p.agente, d.agente)
          anotar("nombre_asegurado", p.nombre_asegurado, d.nombre_asegurado)
          if (!Object.keys(cambios).length) throw new Error("No hay cambios: la póliza ya tiene esos datos.")
          const etiquetas: Record<string, string> = { estatus: "Estatus", vendedor_id: "Vendedor", grupo: "Grupo", porcentaje_comision: "% comisión", tipo_pago: "Tipo de pago", agente: "Agente", nombre_asegurado: "Asegurado" }
          const lineas = Object.entries(cambios).map(([campo, c]) => `${etiquetas[campo]}: ${campo === "vendedor_id" ? "(actual)" : c.antes ?? "—"} → ${campo === "vendedor_id" ? vendedorNombre : c.despues}`)
          if (cambios.estatus && ESTATUS_CANCELADA.includes(String(cambios.estatus.despues))) lineas.push("⚠️ Se cancelarán sus recibos pendientes y vencidos.")
          propuesta = await proponer(db, solicitante, "poliza_cambio", { polizaId: p.id, estatusAnterior: p.estatus, cambios, motivo: d.motivo?.trim() || null },
            `✏️ Póliza ${p.numero_poliza} (${p.clientes?.nombre ?? "sin cliente"})\n${lineas.join("\n")}${d.motivo ? `\nMotivo: ${d.motivo}` : ""}`)
        } else {
          const d = validada.data as z.infer<typeof esquemas.proponer_registro_pago>
          if (!solicitante.fotoFileId) throw new Error("Falta la foto del comprobante: pide al usuario que la mande al chat.")
          const fechaPago = d.fecha_pago ?? todayDateOnly()
          if (compareDateOnly(fechaPago, todayDateOnly()) > 0) throw new Error("La fecha de pago no puede ser futura.")
          const poliza = await buscarPoliza(db, d.numero_poliza)
          const { data: recibos, error } = await db.from("pagos")
            .select("id, numero_recibo, total_recibos, estatus, monto, moneda, fecha_limite")
            .eq("poliza_id", poliza.id).in("estatus", ["pendiente", "vencido"]).order("numero_recibo")
          if (error) throw error
          const recibo = d.numero_recibo ? recibos?.find(r => r.numero_recibo === d.numero_recibo) : recibos?.[0]
          if (!recibo) throw new Error(d.numero_recibo ? `El recibo ${d.numero_recibo} no está pendiente de pago.` : "Esa póliza no tiene recibos pendientes de pago.")
          propuesta = await proponer(db, solicitante, "pago", {
            pagoId: recibo.id, polizaId: poliza.id, fotoFileId: solicitante.fotoFileId, metodoPago: d.metodo_pago,
            fechaPago, referencia: d.referencia ?? null,
          }, `💳 Registrar pago de la póliza ${poliza.numero_poliza} (${poliza.clientes?.nombre ?? "sin cliente"})\nRecibo ${recibo.numero_recibo}/${recibo.total_recibos}: ${mxn(Number(recibo.monto), recibo.moneda)}${recibo.moneda === "UDIS" ? " (se convierte con la UDI del día de pago)" : ""}\nPagado el ${formatDateOnly(fechaPago)} por ${d.metodo_pago}${d.referencia ? ` · ref. ${d.referencia}` : ""}\nCon la foto que mandaste como comprobante. Quedará por validar.`)
        }
        propuestas.push(propuesta)
        return { contenido: JSON.stringify({ propuesta_lista: true, resumen: propuesta.resumen, nota: "Ya se le mostró al usuario con botones para confirmar. No digas que quedó hecho: dile que confirme." }), error: false }
      } catch (error: any) {
        return { contenido: error?.message || "No se pudo preparar la tarea.", error: true }
      }
    },
  }
}

/** Ejecuta una propuesta confirmada. Devuelve el texto para el usuario. */
export async function ejecutarAccion(accionId: string, chatId: number): Promise<string> {
  const admin = supabaseServidor()
  const { data: accion, error } = await admin.from("telegram_acciones").select("*").eq("id", accionId).maybeSingle()
  if (error) throw error
  if (!accion || accion.telegram_chat_id !== chatId) return "No encontré esa tarea."
  if (accion.estado !== "pendiente") return `Esa tarea ya estaba ${accion.estado}.`
  if (Date.now() - new Date(accion.creado_en).getTime() > VIGENCIA_PROPUESTA_MS) {
    await admin.from("telegram_acciones").update({ estado: "expirada", resuelto_en: new Date().toISOString() }).eq("id", accionId)
    return "Esta propuesta expiró (pasaron más de 30 minutos). Pídemela de nuevo."
  }
  // Se marca primero para que un doble toque no la ejecute dos veces.
  const { data: tomada } = await admin.from("telegram_acciones").update({ estado: "confirmada", resuelto_en: new Date().toISOString() })
    .eq("id", accionId).eq("estado", "pendiente").select("id").maybeSingle()
  if (!tomada) return "Esa tarea ya se estaba procesando."

  const db = supabaseServidor(accion.usuario_email)
  const { data: usuario } = await db.from("usuarios").select("id, nombre").ilike("email", accion.usuario_email).maybeSingle()
  try {
    const resultado = accion.tipo === "comentario" ? await guardarComentario(db, accion.datos, usuario)
      : accion.tipo === "evento" || accion.tipo === "recordatorio" ? await guardarEvento(db, accion.datos)
      : accion.tipo === "prospecto" ? await guardarProspecto(db, accion.datos)
      : accion.tipo === "prospecto_cambio" ? await actualizarProspecto(db, accion.datos, usuario)
      : accion.tipo === "poliza_cambio" ? await actualizarPoliza(db, accion.datos, usuario)
      : await registrarPago(db, accion.datos, usuario)
    await admin.from("telegram_acciones").update({ resultado }).eq("id", accionId)
    return resultado
  } catch (error: any) {
    const mensaje = error?.message || "error desconocido"
    await admin.from("telegram_acciones").update({ estado: "fallida", resultado: mensaje }).eq("id", accionId)
    return `No se pudo completar: ${mensaje}`
  }
}

export async function cancelarAccion(accionId: string, chatId: number) {
  await supabaseServidor().from("telegram_acciones").update({ estado: "cancelada", resuelto_en: new Date().toISOString() })
    .eq("id", accionId).eq("telegram_chat_id", chatId).eq("estado", "pendiente")
}

async function historial(db: SupabaseServidor, polizaId: string, tipo: string, campo: string, antes: unknown, despues: unknown, usuario: any, metadata: object) {
  await db.from("poliza_historial").insert([{
    poliza_id: polizaId, tipo_cambio: tipo, campo, valor_anterior: antes ?? null, valor_nuevo: despues ?? null,
    usuario_id: usuario?.id ?? null, usuario_nombre: usuario?.nombre ?? null, metadata: { ...metadata, canal: "telegram" },
  }])
}

async function guardarComentario(db: SupabaseServidor, datos: any, usuario: any) {
  const { data: poliza, error } = await db.from("polizas").select("numero_poliza, comentarios").eq("id", datos.polizaId).single()
  if (error) throw error
  const linea = `[${new Date().toLocaleDateString("es-MX", { timeZone: "America/Mexico_City" })}] ${datos.comentario}${usuario?.nombre ? ` — ${usuario.nombre}` : ""}`
  const comentarios = poliza.comentarios ? `${poliza.comentarios}\n${linea}` : linea
  const { error: e2 } = await db.from("polizas").update({ comentarios }).eq("id", datos.polizaId)
  if (e2) throw e2
  await historial(db, datos.polizaId, "comentarios_cambiado", "comentarios", poliza.comentarios, comentarios, usuario, {})
  return `✅ Comentario guardado en la póliza ${poliza.numero_poliza}.`
}

const ETIQUETA_EVENTO: Record<string, string> = { cita: "Cita", recordatorio: "Recordatorio", pago: "Pago", renovacion: "Renovación", otro: "Evento" }

async function usuarioPorNombre(db: SupabaseServidor, nombre: string) {
  const { data, error } = await db.from("usuarios").select("id, nombre").eq("activo", true).ilike("nombre", `%${nombre.trim()}%`)
  if (error) throw error
  if (!data?.length) throw new Error(`No hay un usuario del CRM llamado ${nombre}.`)
  if (data.length > 1) throw new Error(`Hay varios usuarios que coinciden con ${nombre}: ${data.map(u => u.nombre).join(", ")}.`)
  return data[0]
}

async function buscarProspecto(db: SupabaseServidor, busqueda: string) {
  const t = busqueda.trim().replace(/[%,()]/g, " ")
  const { data, error } = await db.from("prospectos").select("id, nombre, estatus, prioridad, asignado_a, notas")
    .or([`nombre.ilike.%${t}%`, `telefono.ilike.%${t}%`, `email.ilike.%${t}%`].join(",")).limit(3)
  if (error) throw error
  if (!data?.length) throw new Error(`No encontré un prospecto que coincida con ${busqueda}.`)
  if (data.length > 1) throw new Error(`Hay varios prospectos que coinciden: ${data.map(p => p.nombre).join(", ")}. ¿Cuál?`)
  return data[0] as any
}

async function guardarEvento(db: SupabaseServidor, datos: any) {
  const tipo = datos.tipo ?? "recordatorio"
  const { error } = await db.from("eventos").insert([{
    titulo: datos.titulo, descripcion: datos.descripcion, fecha: datos.fecha, hora: datos.hora,
    tipo, prioridad: datos.prioridad, poliza_id: datos.polizaId, cliente_id: datos.clienteId, completado: false,
  }])
  if (error) throw error
  return `✅ ${ETIQUETA_EVENTO[tipo] ?? "Evento"} creado para el ${formatDateOnly(datos.fecha)}${datos.hora ? ` a las ${datos.hora}` : ""}. Lo verás en el Calendario del CRM.`
}

async function guardarProspecto(db: SupabaseServidor, datos: any) {
  const { error } = await db.from("prospectos").insert([{
    nombre: datos.nombre, telefono: datos.telefono, email: datos.email ?? null, empresa: datos.empresa ?? null,
    origen: datos.origen, interes: datos.interes, prioridad: datos.prioridad ?? "media", estatus: "nuevo",
    fecha_contacto: todayDateOnly(), notas: datos.notas ?? null, asignado_a: datos.asignado_a ?? null,
  }])
  if (error) throw error
  return `✅ Prospecto ${datos.nombre} dado de alta en Prospección.`
}

async function actualizarProspecto(db: SupabaseServidor, datos: any, usuario: any) {
  const { data: actual, error } = await db.from("prospectos").select("nombre, notas").eq("id", datos.prospectoId).single()
  if (error) throw error
  const cambios: Record<string, unknown> = {}
  if (datos.estatus) cambios.estatus = datos.estatus
  if (datos.prioridad) cambios.prioridad = datos.prioridad
  if (datos.asignadoA) cambios.asignado_a = datos.asignadoA
  if (datos.nota) {
    const linea = `[${new Date().toLocaleDateString("es-MX", { timeZone: "America/Mexico_City" })}] ${datos.nota}${usuario?.nombre ? ` — ${usuario.nombre}` : ""}`
    cambios.notas = actual.notas ? `${actual.notas}\n${linea}` : linea
  }
  const { error: e2 } = await db.from("prospectos").update(cambios).eq("id", datos.prospectoId)
  if (e2) throw e2
  return datos.nota && !datos.estatus && !datos.prioridad && !datos.asignadoA
    ? `✅ Comentario guardado en el prospecto ${actual.nombre}. Lo verás en Prospección.`
    : `✅ Prospecto ${actual.nombre} actualizado.`
}

/** Cambios sin recálculo de recibos. Cancelar cancela los recibos por cobrar, como en el CRM. */
async function actualizarPoliza(db: SupabaseServidor, datos: any, usuario: any) {
  const cambios: Record<string, { antes: unknown; despues: unknown }> = datos.cambios
  const actualizacion: Record<string, unknown> = Object.fromEntries(Object.entries(cambios).map(([campo, c]) => [campo, c.despues]))
  const nuevoEstatus = cambios.estatus?.despues as string | undefined
  const hoy = todayDateOnly()
  const fecha = new Date().toLocaleDateString("es-MX", { timeZone: "America/Mexico_City" })
  const { data: poliza, error } = await db.from("polizas").select("numero_poliza, comentarios").eq("id", datos.polizaId).single()
  if (error) throw error
  if (nuevoEstatus === "vencida" || (nuevoEstatus && ESTATUS_CANCELADA.includes(nuevoEstatus))) {
    const linea = `[${fecha}] ${nuevoEstatus === "vencida" ? "VENCIDA" : "CANCELADA"}: ${datos.motivo}${usuario?.nombre ? ` — ${usuario.nombre}` : ""}`
    actualizacion.comentarios = poliza.comentarios ? `${poliza.comentarios}\n${linea}` : linea
    if (nuevoEstatus === "vencida") actualizacion.fecha_vencimiento_real = hoy
  }
  // Sólo si nadie cambió el estatus desde que se propuso.
  const { data: actualizada, error: e2 } = await db.from("polizas").update(actualizacion).eq("id", datos.polizaId).eq("estatus", datos.estatusAnterior).select("id").maybeSingle()
  if (e2) throw e2
  if (!actualizada) throw new Error("la póliza cambió de estatus mientras tanto; pídemelo de nuevo")

  let recibosCancelados = 0
  if (nuevoEstatus && ESTATUS_CANCELADA.includes(nuevoEstatus)) {
    const { data: cancelados, error: e3 } = await db.from("pagos").update({
      estatus: "cancelado", cancelado_en: new Date().toISOString(), cancelado_por: usuario?.id ?? null, motivo_cancelacion: "poliza_cancelada",
    }).eq("poliza_id", datos.polizaId).in("estatus", ["pendiente", "vencido"]).select("id")
    if (e3) throw e3
    recibosCancelados = cancelados?.length ?? 0
    await sincronizarResumenCobranza(db, datos.polizaId)
  }
  const nombresApp: Record<string, string> = { estatus: "estatus", vendedor_id: "vendedorId", grupo: "grupo", porcentaje_comision: "porcentajeComision", tipo_pago: "tipoPago", agente: "agente", nombre_asegurado: "nombreAsegurado" }
  for (const [campo, c] of Object.entries(cambios)) {
    await historial(db, datos.polizaId, `${nombresApp[campo] ?? campo}_cambiado`, nombresApp[campo] ?? campo, c.antes, c.despues, usuario, datos.motivo ? { motivo: datos.motivo } : {})
  }
  return `✅ Póliza ${poliza.numero_poliza} actualizada.${recibosCancelados ? ` Se cancelaron ${recibosCancelados} recibo${recibosCancelados === 1 ? "" : "s"} por cobrar.` : ""}`
}

/** Mismo flujo que "Registrar pago" en Pólizas pendientes: el recibo queda por validar. */
async function registrarPago(db: SupabaseServidor, datos: any, usuario: any) {
  const { data: pago, error } = await db.from("pagos").select("*").eq("id", datos.pagoId).single()
  if (error) throw error
  if (!reciboPorCobrar(pago)) throw new Error("ese recibo ya tiene un pago registrado o fue cancelado")
  const esUdis = pago.moneda === "UDIS"
  let valorUdi: number | null = null
  if (esUdis) {
    valorUdi = await valorUdiDelDia(datos.fechaPago)
    if (!valorUdi) throw new Error(`Banco de México no tiene el valor UDI del ${formatDateOnly(datos.fechaPago)}; regístralo desde el CRM`)
  }
  const montoMxn = esUdis ? calcularMontoMxnUdis(Number(pago.monto_udis || pago.monto), valorUdi!) : pago.moneda === "MXN" ? Number(pago.monto) : null

  const archivo = await descargarArchivo(datos.fotoFileId)
  const extension = archivo.ruta.split(".").pop()?.toLowerCase() || "jpg"
  const ruta = `comprobantes-pagos/${pago.poliza_id}/${pago.id}/${Date.now()}_telegram.${extension}`
  const { error: errorSubida } = await db.storage.from(BUCKET_COMPROBANTES)
    .upload(ruta, archivo.datos, { upsert: false, contentType: extension === "png" ? "image/png" : "image/jpeg" })
  if (errorSubida) throw new Error("no se pudo guardar el comprobante: " + errorSubida.message)
  const comprobanteUrl = db.storage.from(BUCKET_COMPROBANTES).getPublicUrl(ruta).data.publicUrl

  const { data: actualizado, error: e2 } = await db.from("pagos").update({
    estatus: "por_validar", fecha_pago: datos.fechaPago, metodo_pago: datos.metodoPago, referencia: datos.referencia,
    valor_udi: valorUdi, fecha_valor_udi: esUdis ? datos.fechaPago : null, monto_mxn: montoMxn,
    registrado_en: new Date().toISOString(), registrado_por: usuario?.id ?? null, validado_en: null, validado_por: null,
    comprobante_url: comprobanteUrl, comprobante_path: ruta,
  }).eq("id", pago.id).in("estatus", ["pendiente", "vencido"]).select("id").maybeSingle()
  if (e2 || !actualizado) {
    await db.storage.from(BUCKET_COMPROBANTES).remove([ruta])
    throw e2 || new Error("el recibo ya fue registrado por otra persona")
  }
  await sincronizarResumenCobranza(db, pago.poliza_id, datos.metodoPago)
  await historial(db, pago.poliza_id, "pago_registrado", "recibo", pago.estatus, "por_validar", usuario, {
    pagoId: pago.id, numeroRecibo: pago.numero_recibo, anualidad: pago.anualidad, monto: Number(pago.monto), moneda: pago.moneda,
    valorUdi, fechaValorUdi: esUdis ? datos.fechaPago : undefined, fechaPago: datos.fechaPago, montoMxn,
    metodoPago: datos.metodoPago, referencia: datos.referencia, comprobanteUrl,
  })
  return `✅ Pago registrado: recibo ${pago.numero_recibo}/${pago.total_recibos} queda <b>por validar</b>.${montoMxn && esUdis ? ` Equivale a ${mxn(montoMxn)} con la UDI ${valorUdi!.toFixed(6)}.` : ""} Alguien del equipo lo valida en Pólizas pendientes.`
}

/** Igual que en el CRM: prima cobrada (sólo validado) y recibo en curso de la póliza. */
async function sincronizarResumenCobranza(db: SupabaseServidor, polizaId: string, metodoPago?: string) {
  const { data, error } = await db.from("pagos").select("monto, estatus, numero_recibo, total_recibos, fecha_limite").eq("poliza_id", polizaId).neq("estatus", "cancelado")
  if (error) throw error
  const activos = data || []
  const pagados = activos.filter(item => item.estatus === "pagado")
  const cobrado = Math.round(pagados.reduce((suma, item) => suma + Number(item.monto), 0) * 100) / 100
  const porNumero = (a: any, b: any) => a.numero_recibo - b.numero_recibo
  const siguiente = activos.filter(item => reciboPorCobrar(item as any) || item.estatus === "por_validar").sort(porNumero)[0]
  const ultimoPagado = [...pagados].sort((a, b) => b.numero_recibo - a.numero_recibo)[0]
  const { error: e2 } = await db.from("polizas").update({
    prima_cobrada: cobrado,
    registro_sistema_cobranza: pagados.length > 0,
    numero_recibo: siguiente ? `${siguiente.numero_recibo}/${siguiente.total_recibos}` : ultimoPagado ? `${ultimoPagado.numero_recibo}/${ultimoPagado.total_recibos}` : null,
    prima_total_recibo: siguiente ? Number(siguiente.monto) : 0,
    ultimo_dia_pago: siguiente?.fecha_limite || null,
    ...(metodoPago !== undefined ? { tipo_pago: metodoPago || null } : {}),
  }).eq("id", polizaId)
  if (e2) throw e2
}
