import type Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"
import { supabase } from "@/lib/supabase"
import { ESTATUS_EN_COBRANZA } from "@/lib/cobranza"
import { addDaysDateOnly, todayDateOnly } from "@/lib/date-only"
import { etiquetaRamo } from "@/lib/ramos"

/**
 * Herramientas de Coni, el asistente del CRM. Todas son de SÓLO LECTURA: consultan Supabase y
 * devuelven datos resumidos con la ruta de la pantalla donde verlos. Ninguna modifica nada.
 */

const POLIZA_CAMPOS = "id, numero_poliza, ramo, grupo, estatus, vigencia_inicio, vigencia_fin, prima, forma_pago, divisas, nombre_asegurado, clientes(id, nombre, telefono), companias(nombre)"

const texto = (valor: string) => valor.trim().replace(/[%,()]/g, " ").replace(/\s+/g, " ")

function resumirPoliza(p: any) {
  return {
    numero: p.numero_poliza,
    cliente: p.clientes?.nombre ?? null,
    asegurado: p.nombre_asegurado ?? null,
    telefono: p.clientes?.telefono ?? null,
    aseguradora: p.companias?.nombre ?? null,
    ramo: etiquetaRamo(p.ramo),
    grupo: p.grupo || null,
    estatus: p.estatus,
    vigencia: `${p.vigencia_inicio} a ${p.vigencia_fin}`,
    prima: Number(p.prima || 0),
    moneda: p.divisas || "MXN",
    forma_pago: p.forma_pago,
    ruta: `/polizas?poliza=${p.id}`,
  }
}

const esquemas = {
  buscar_polizas: z.object({
    busqueda: z.string().min(1),
    solo_en_cobranza: z.boolean().optional(),
  }),
  cobranza_poliza: z.object({ numero_poliza: z.string().min(1) }),
  buscar_clientes: z.object({ busqueda: z.string().min(1) }),
  recibos_por_cobrar: z.object({
    dias: z.number().int().min(0).max(120).optional(),
    incluir_vencidos: z.boolean().optional(),
  }),
  renovaciones_proximas: z.object({ dias: z.number().int().min(1).max(180).optional() }),
  resumen_cartera: z.object({}),
}

export type NombreHerramienta = keyof typeof esquemas

export const HERRAMIENTAS: Anthropic.Tool[] = [
  {
    name: "buscar_polizas",
    description: "Busca pólizas por número de póliza, nombre del cliente o del asegurado. Devuelve hasta 10 con su aseguradora, ramo, vigencia, prima, estatus y la ruta para abrirla en el CRM. Úsala cuando pregunten por una póliza o por las pólizas de alguien.",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: {
        busqueda: { type: "string", description: "Número de póliza o parte del nombre del cliente/asegurado, p. ej. '96695U04' o 'Lozano'." },
        solo_en_cobranza: { type: "boolean", description: "true para excluir canceladas y renovadas." },
      },
      required: ["busqueda"],
    },
  },
  {
    name: "cobranza_poliza",
    description: "Recibos de una póliza: número, importe, moneda, inicio, fecha límite, estatus (pendiente, vencido, por validar, pagado) y fecha de pago. Úsala para saber qué debe un cliente, cuándo vence su próximo pago o si ya pagó.",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: { numero_poliza: { type: "string", description: "Número exacto de la póliza." } },
      required: ["numero_poliza"],
    },
  },
  {
    name: "buscar_clientes",
    description: "Busca clientes por nombre, teléfono, correo o RFC. Devuelve hasta 10 con sus datos de contacto, cuántas pólizas tienen y la ruta a su expediente.",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: { busqueda: { type: "string", description: "Nombre, teléfono, correo o RFC (o parte)." } },
      required: ["busqueda"],
    },
  },
  {
    name: "recibos_por_cobrar",
    description: "Recibos pendientes de pólizas en cobranza que vencen en los próximos días (y, si se pide, los ya vencidos), del más urgente al menos urgente, con totales. Úsala para '¿qué cobramos esta semana?', '¿qué está vencido?'.",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: {
        dias: { type: "integer", description: "Días hacia adelante a revisar (por defecto 7)." },
        incluir_vencidos: { type: "boolean", description: "Incluir recibos cuya fecha límite ya pasó (por defecto true)." },
      },
      required: [],
    },
  },
  {
    name: "renovaciones_proximas",
    description: "Pólizas cuya vigencia termina en los próximos días y aún no se renuevan. Úsala para planear renovaciones.",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: { dias: { type: "integer", description: "Días hacia adelante (por defecto 60, la regla del CRM)." } },
      required: [],
    },
  },
  {
    name: "resumen_cartera",
    description: "Números generales de la cartera: clientes, pólizas por estatus y por ramo, y recibos pendientes, vencidos y por validar.",
    eager_input_streaming: true,
    input_schema: { type: "object", properties: {}, required: [] },
  },
]

async function buscarPolizas({ busqueda, solo_en_cobranza }: z.infer<typeof esquemas.buscar_polizas>) {
  const t = texto(busqueda)
  const { data: clientes } = await supabase.from("clientes").select("id").ilike("nombre", `%${t}%`).limit(50)
  const filtros = [`numero_poliza.ilike.%${t}%`, `nombre_asegurado.ilike.%${t}%`]
  if (clientes?.length) filtros.push(`cliente_id.in.(${clientes.map(c => c.id).join(",")})`)
  let consulta = supabase.from("polizas").select(POLIZA_CAMPOS).or(filtros.join(",")).order("vigencia_fin", { ascending: false }).limit(10)
  if (solo_en_cobranza) consulta = consulta.in("estatus", [...ESTATUS_EN_COBRANZA])
  const { data, error } = await consulta
  if (error) throw error
  return { encontradas: data.length, polizas: data.map(resumirPoliza) }
}

async function cobranzaPoliza({ numero_poliza }: z.infer<typeof esquemas.cobranza_poliza>) {
  const { data: polizas, error } = await supabase.from("polizas").select(POLIZA_CAMPOS).ilike("numero_poliza", texto(numero_poliza)).limit(3)
  if (error) throw error
  if (!polizas.length) return { error: `No encontré la póliza ${numero_poliza}. Prueba con buscar_polizas.` }
  const hoy = todayDateOnly()
  return {
    polizas: await Promise.all(polizas.map(async poliza => {
      const { data: recibos } = await supabase.from("pagos")
        .select("numero_recibo, total_recibos, estatus, monto, moneda, fecha_emision, fecha_limite, fecha_pago")
        .eq("poliza_id", poliza.id).neq("estatus", "cancelado").order("numero_recibo")
      return {
        ...resumirPoliza(poliza),
        recibos: (recibos || []).map(r => ({
          recibo: `${r.numero_recibo}/${r.total_recibos}`,
          importe: Number(r.monto),
          moneda: r.moneda,
          inicia: r.fecha_emision,
          fecha_limite: r.fecha_limite,
          estatus: r.estatus === "pendiente" && r.fecha_limite < hoy ? "vencido" : r.estatus,
          pagado_el: r.fecha_pago,
        })),
      }
    })),
  }
}

async function buscarClientes({ busqueda }: z.infer<typeof esquemas.buscar_clientes>) {
  const t = texto(busqueda)
  const { data, error } = await supabase.from("clientes")
    .select("id, nombre, telefono, email, rfc, estatus, polizas(count)")
    .or([`nombre.ilike.%${t}%`, `telefono.ilike.%${t}%`, `email.ilike.%${t}%`, `rfc.ilike.%${t}%`].join(","))
    .order("nombre").limit(10)
  if (error) throw error
  return {
    encontrados: data.length,
    clientes: data.map((c: any) => ({
      nombre: c.nombre, telefono: c.telefono, correo: c.email || null, rfc: c.rfc || null, estatus: c.estatus,
      polizas: c.polizas?.[0]?.count ?? 0, ruta: `/clientes?cliente=${c.id}`,
    })),
  }
}

async function recibosPorCobrar({ dias = 7, incluir_vencidos = true }: z.infer<typeof esquemas.recibos_por_cobrar>) {
  const hoy = todayDateOnly()
  const hasta = addDaysDateOnly(hoy, dias)
  let consulta = supabase.from("pagos")
    .select("numero_recibo, total_recibos, monto, moneda, fecha_limite, polizas!inner(id, numero_poliza, estatus, clientes(nombre, telefono), companias(nombre))")
    .in("estatus", ["pendiente", "vencido"])
    .in("polizas.estatus", [...ESTATUS_EN_COBRANZA])
    .lte("fecha_limite", hasta)
    .order("fecha_limite")
    .limit(1000)
  if (!incluir_vencidos) consulta = consulta.gte("fecha_limite", hoy)
  const { data, error } = await consulta
  if (error) throw error
  const totales: Record<string, number> = {}
  for (const r of data) totales[r.moneda || "MXN"] = (totales[r.moneda || "MXN"] || 0) + Number(r.monto)
  const vencidos = data.filter(r => r.fecha_limite < hoy).length
  return {
    periodo: `${incluir_vencidos ? "vencidos y " : ""}por vencer hasta ${hasta}`,
    total_recibos: data.length,
    vencidos,
    por_vencer: data.length - vencidos,
    importe_por_moneda: totales,
    mostrando: Math.min(data.length, 25),
    recibos: data.slice(0, 25).map((r: any) => ({
      poliza: r.polizas.numero_poliza,
      cliente: r.polizas.clientes?.nombre ?? null,
      telefono: r.polizas.clientes?.telefono ?? null,
      aseguradora: r.polizas.companias?.nombre ?? null,
      recibo: `${r.numero_recibo}/${r.total_recibos}`,
      importe: Number(r.monto),
      moneda: r.moneda,
      fecha_limite: r.fecha_limite,
      vencido: r.fecha_limite < hoy,
      ruta: `/polizas?poliza=${r.polizas.id}`,
    })),
    pantalla_completa: "/polizas-pendientes",
  }
}

async function renovacionesProximas({ dias = 60 }: z.infer<typeof esquemas.renovaciones_proximas>) {
  const hoy = todayDateOnly()
  const { data, error } = await supabase.from("polizas").select(POLIZA_CAMPOS)
    .gte("vigencia_fin", hoy).lte("vigencia_fin", addDaysDateOnly(hoy, dias))
    .in("estatus", [...ESTATUS_EN_COBRANZA])
    .not("renovacion_estado", "in", "(renovada,en_proceso)")
    .order("vigencia_fin").limit(30)
  if (error) throw error
  return { dias, encontradas: data.length, polizas: data.map(resumirPoliza), pantalla_completa: "/polizas?filtro=renovaciones" }
}

async function resumenCartera() {
  const contar = async (tabla: string, filtro?: (q: any) => any) => {
    let q: any = supabase.from(tabla).select("*", { count: "exact", head: true })
    if (filtro) q = filtro(q)
    const { count } = await q
    return count ?? 0
  }
  const hoy = todayDateOnly()
  const [clientes, polizas, porRamo, pendientes, vencidos, porValidar] = await Promise.all([
    contar("clientes"),
    supabase.from("polizas").select("estatus").limit(10000),
    supabase.from("polizas").select("ramo").in("estatus", [...ESTATUS_EN_COBRANZA]).limit(10000),
    contar("pagos", q => q.eq("estatus", "pendiente").gte("fecha_limite", hoy)),
    contar("pagos", q => q.in("estatus", ["pendiente", "vencido"]).lt("fecha_limite", hoy)),
    contar("pagos", q => q.eq("estatus", "por_validar")),
  ])
  const agrupar = (filas: any[] | null, campo: string, etiqueta = (v: string) => v) =>
    (filas || []).reduce((acc: Record<string, number>, fila) => {
      const clave = etiqueta(fila[campo] || "sin dato")
      acc[clave] = (acc[clave] || 0) + 1
      return acc
    }, {})
  return {
    clientes,
    polizas_por_estatus: agrupar(polizas.data, "estatus"),
    polizas_en_cobranza_por_ramo: agrupar(porRamo.data, "ramo", etiquetaRamo),
    recibos: { pendientes_por_vencer: pendientes, vencidos, por_validar: porValidar },
  }
}

/** Ejecuta una herramienta validando antes su entrada (puede llegar truncada por el streaming). */
export async function ejecutarHerramienta(nombre: string, entrada: unknown): Promise<{ contenido: string; error: boolean }> {
  if (!(nombre in esquemas)) return { contenido: `Herramienta desconocida: ${nombre}`, error: true }
  const validada = esquemas[nombre as NombreHerramienta].safeParse(entrada ?? {})
  if (!validada.success) return { contenido: JSON.stringify({ INVALID_JSON: JSON.stringify(entrada) }), error: true }
  try {
    const datos = validada.data as any
    const resultado = nombre === "buscar_polizas" ? await buscarPolizas(datos)
      : nombre === "cobranza_poliza" ? await cobranzaPoliza(datos)
      : nombre === "buscar_clientes" ? await buscarClientes(datos)
      : nombre === "recibos_por_cobrar" ? await recibosPorCobrar(datos)
      : nombre === "renovaciones_proximas" ? await renovacionesProximas(datos)
      : await resumenCartera()
    return { contenido: JSON.stringify(resultado), error: false }
  } catch (error: any) {
    return { contenido: `No se pudo consultar: ${error?.message || "error desconocido"}`, error: true }
  }
}

/** Texto que ve el usuario mientras corre cada herramienta. */
export const ESTADO_HERRAMIENTA: Record<NombreHerramienta, string> = {
  buscar_polizas: "Buscando pólizas…",
  cobranza_poliza: "Revisando los recibos…",
  buscar_clientes: "Buscando clientes…",
  recibos_por_cobrar: "Revisando la cobranza…",
  renovaciones_proximas: "Revisando renovaciones…",
  resumen_cartera: "Contando la cartera…",
}
