import 'server-only'
import type Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"
import { supabaseServidor, type SupabaseServidor } from "@/lib/supabase-servidor"
import { compareDateOnly, formatDateOnly, todayDateOnly } from "@/lib/date-only"
import { calcularMontoMxnUdis, reciboPorCobrar } from "@/lib/payment-schedule"
import { valorUdiDelDia } from "@/lib/udi-dof"
import { descargarArchivo } from "@/lib/telegram/api"
import type { HerramientasExtra } from "@/lib/asistente/agente"

/**
 * Tareas que Coni puede hacer desde Telegram. Coni sólo PROPONE (valida y arma un resumen);
 * la tarea se ejecuta hasta que el usuario toca ✅ Confirmar. Las reglas son las mismas de las
 * pantallas del CRM (Pólizas pendientes, Calendario).
 */
const VIGENCIA_PROPUESTA_MS = 30 * 60_000
const BUCKET_COMPROBANTES = "documentos-clientes"
const METODOS_PAGO = ["efectivo", "transferencia", "tarjeta", "domiciliacion", "cheque"] as const
const FECHA = /^\d{4}-\d{2}-\d{2}$/

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
  proponer_recordatorio: z.object({
    titulo: z.string().min(1).max(200),
    fecha: z.string().regex(FECHA),
    hora: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    descripcion: z.string().max(1000).optional(),
    numero_poliza: z.string().optional(),
    prioridad: z.enum(["alta", "media", "baja"]).optional(),
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
    description: "Prepara un comentario de seguimiento en una póliza (p. ej. 'le marqué, paga el viernes'). No lo guarda: el usuario lo confirma con un botón. Úsala cuando pidan anotar, comentar o dejar seguimiento.",
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
    name: "proponer_recordatorio",
    description: "Prepara un recordatorio en el Calendario del CRM (llamadas, citas, seguimientos). No lo guarda: el usuario lo confirma con un botón. Convierte fechas relativas ('el jueves', 'mañana') a AAAA-MM-DD usando la fecha de hoy.",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: {
        titulo: { type: "string", description: "Qué hay que hacer, p. ej. 'Llamar a Lozano por el recibo 6/12'." },
        fecha: { type: "string", description: "AAAA-MM-DD" },
        hora: { type: "string", description: "HH:MM en 24 horas (opcional)." },
        descripcion: { type: "string", description: "Detalle opcional." },
        numero_poliza: { type: "string", description: "Póliza relacionada (opcional)." },
        prioridad: { type: "string", enum: ["alta", "media", "baja"] },
      },
      required: ["titulo", "fecha"],
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
  if (!data?.length) throw new Error(`No encontré la póliza ${numero}.`)
  if (data.length > 1) throw new Error(`Hay más de una póliza que coincide con ${numero}; dime el número completo.`)
  return data[0] as any
}

async function proponer(db: SupabaseServidor, solicitante: Solicitante, tipo: "comentario" | "recordatorio" | "pago", datos: object, resumen: string): Promise<Propuesta> {
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
    estados: { proponer_comentario: "Preparando el comentario…", proponer_recordatorio: "Preparando el recordatorio…", proponer_registro_pago: "Preparando el registro del pago…" },
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
        } else if (nombre === "proponer_recordatorio") {
          const d = validada.data as z.infer<typeof esquemas.proponer_recordatorio>
          if (compareDateOnly(d.fecha, todayDateOnly()) < 0) throw new Error("La fecha del recordatorio ya pasó.")
          const poliza = d.numero_poliza ? await buscarPoliza(db, d.numero_poliza) : null
          propuesta = await proponer(db, solicitante, "recordatorio", {
            titulo: d.titulo, fecha: d.fecha, hora: d.hora ?? null, descripcion: d.descripcion ?? null,
            prioridad: d.prioridad ?? "media", polizaId: poliza?.id ?? null, clienteId: poliza?.cliente_id ?? null,
          }, `⏰ Recordatorio: ${d.titulo}\n${formatDateOnly(d.fecha)}${d.hora ? ` a las ${d.hora}` : ""}${poliza ? ` · póliza ${poliza.numero_poliza}` : ""}`)
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
      : accion.tipo === "recordatorio" ? await guardarRecordatorio(db, accion.datos)
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

async function guardarRecordatorio(db: SupabaseServidor, datos: any) {
  const { error } = await db.from("eventos").insert([{
    titulo: datos.titulo, descripcion: datos.descripcion, fecha: datos.fecha, hora: datos.hora,
    tipo: "recordatorio", prioridad: datos.prioridad, poliza_id: datos.polizaId, cliente_id: datos.clienteId, completado: false,
  }])
  if (error) throw error
  return `✅ Recordatorio creado para el ${formatDateOnly(datos.fecha)}${datos.hora ? ` a las ${datos.hora}` : ""}. Lo verás en el Calendario del CRM.`
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
