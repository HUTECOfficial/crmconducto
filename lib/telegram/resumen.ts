import 'server-only'
import { ejecutarHerramienta } from "@/lib/asistente/herramientas"
import { formatDateOnly, todayDateOnly } from "@/lib/date-only"
import { escaparHtml, urlApp } from "@/lib/telegram/api"

const monto = (valor: number) => `$${valor.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

async function consultar(nombre: string, entrada: object) {
  const { contenido, error } = await ejecutarHerramienta(nombre, entrada)
  if (error) throw new Error(contenido)
  return JSON.parse(contenido)
}

/** Resumen de la mañana: qué cobrar hoy, lo vencido, por validar y renovaciones de la semana. */
export async function resumenDiario(nombre: string): Promise<string> {
  const hoy = todayDateOnly()
  const [proximos, cartera, renovaciones] = await Promise.all([
    consultar("recibos_por_cobrar", { dias: 3, incluir_vencidos: false }),
    consultar("resumen_cartera", {}),
    consultar("renovaciones_proximas", { dias: 7 }),
  ])
  const deHoy = proximos.recibos.filter((r: any) => r.fecha_limite === hoy)
  const fecha = new Date().toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", weekday: "long", day: "numeric", month: "long" })
  const totalMxn = proximos.importe_por_moneda?.MXN ?? 0

  const lineas = [
    `☀️ <b>Buenos días, ${escaparHtml(nombre.split(" ")[0])}.</b> Esto es lo de hoy, ${fecha}:`,
    "",
    `💰 <b>Vencen hoy:</b> ${deHoy.length} recibo${deHoy.length === 1 ? "" : "s"}`,
    `⏰ <b>Próximos 3 días:</b> ${proximos.total_recibos} recibos${totalMxn ? ` (${monto(totalMxn)} MXN)` : ""}`,
    `🔴 <b>Vencidos:</b> ${cartera.recibos.vencidos}`,
    `🟣 <b>Por validar:</b> ${cartera.recibos.por_validar}`,
    `🔁 <b>Renuevan en 7 días:</b> ${renovaciones.encontradas}`,
  ]
  const urgentes = proximos.recibos.slice(0, 5)
  if (urgentes.length) {
    lineas.push("", "<b>Lo más urgente:</b>")
    for (const r of urgentes) {
      lineas.push(`• <a href="${urlApp(r.ruta)}">${escaparHtml(r.poliza)}</a> · ${escaparHtml(r.cliente ?? "")} · ${r.moneda === "MXN" ? monto(r.importe) : `${r.importe} ${r.moneda}`} · vence ${formatDateOnly(r.fecha_limite)}`)
    }
  }
  lineas.push("", `<a href="${urlApp("/polizas-pendientes")}">Abrir Pólizas pendientes</a> · Pregúntame lo que necesites.`)
  return lineas.join("\n")
}
