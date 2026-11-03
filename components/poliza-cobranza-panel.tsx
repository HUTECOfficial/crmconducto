"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Check, FileText, X } from "lucide-react"
import { toast } from "sonner"
import { useSupabase, type PagoPoliza, type Poliza } from "@/contexts/supabase-context"
import { formatDateOnly, todayDateOnly } from "@/lib/date-only"
import { estadoCobranzaRecibo, reciboPorCobrar } from "@/lib/payment-schedule"
import { situacionCobranzaPoliza } from "@/lib/cobranza"
import { ETIQUETA_RENOVACION, situacionRenovacion } from "@/lib/renovaciones"
import { resumirComisiones } from "@/lib/comisiones"
import { useUdiPorFecha } from "@/hooks/use-udi-por-fecha"
import { EquivalenteUdi } from "@/components/equivalente-udi"
import { SemaforoPill } from "@/components/semaforo-cobranza"

const ETIQUETA_MOVIMIENTO: Record<string, string> = {
  pago_registrado: "Pago registrado",
  pago_validado: "Pago validado",
  pago_rechazado: "Pago rechazado",
  pago_anulado: "Pago anulado",
}

const ETIQUETA_COMISION: Record<string, string> = {
  pendiente: "Pendiente",
  pagada: "Pagada",
  cancelada: "Cancelada",
  por_revertir: "Por revertir",
}

function mxn(monto: number) {
  return `$${monto.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function importe(monto: number, moneda: string) {
  return moneda === "MXN" ? mxn(monto) : `${monto.toLocaleString("es-MX", { maximumFractionDigits: 2 })} ${moneda}`
}

interface PolizaCobranzaPanelProps {
  poliza: Poliza
  /** Permite validar y rechazar pagos desde el panel. */
  conAcciones?: boolean
}

/**
 * Cobranza, recibos, historial de pagos, renovación y comisiones de una póliza.
 * Se usa en Detalle y en Editar póliza para que ambos muestren la misma información.
 */
export function PolizaCobranzaPanel({ poliza, conAcciones = false }: PolizaCobranzaPanelProps) {
  const { historialPolizas, renovaciones, comisiones, usuariosSistema, validarPago, anularPago, pagosPorPoliza, polizasPorId } = useSupabase()
  const [rechazandoId, setRechazandoId] = useState<string | null>(null)
  const [motivoRechazo, setMotivoRechazo] = useState("")
  const [procesandoId, setProcesandoId] = useState<string | null>(null)

  const hoy = todayDateOnly()
  const recibos = useMemo(
    () => (pagosPorPoliza.get(poliza.id) || []).filter(item => item.estatus !== "cancelado").sort((left, right) => left.numeroRecibo - right.numeroRecibo),
    [pagosPorPoliza, poliza.id],
  )
  const situacion = situacionCobranzaPoliza(recibos, {
    primaTotal: Number(poliza.primaTotal || poliza.primaEmitida || poliza.prima || 0),
    primaCobrada: Number(poliza.primaCobrada || 0),
    fechaVencimiento: poliza.ultimoDiaPago || poliza.vigenciaFin,
  }, hoy)
  const moneda = poliza.divisas || "MXN"
  const esUdis = moneda === "UDIS"
  const renovacion = situacionRenovacion(poliza, hoy)
  const renovacionActiva = renovaciones.find(item => item.polizaOrigenId === poliza.id)
  const polizaAnterior = polizasPorId.get(poliza.renovadaDesdeId ?? "")
  const polizaNueva = polizasPorId.get(poliza.renovadaAId ?? "")
  const movimientos = historialPolizas.filter(item => item.polizaId === poliza.id && item.tipoCambio.startsWith("pago_")).slice(0, 15)
  const comisionesPoliza = comisiones.filter(item => item.polizaId === poliza.id)
  const resumenComisiones = resumirComisiones(comisionesPoliza)
  const cobradoMxn = esUdis ? recibos.filter(item => item.estatus === "pagado").reduce((sum, item) => sum + (item.montoMxn ?? 0), 0) : situacion.cobrado

  // Pendientes en UDIS: en pesos con la UDI del día en que se pagará cada recibo.
  const { udiParaRecibo } = useUdiPorFecha(esUdis && recibos.some(reciboPorCobrar))
  const pendienteMxn = esUdis
    ? recibos.filter(reciboPorCobrar).reduce((sum, item) => sum + item.monto * (udiParaRecibo(item.fechaLimite)?.valor ?? 0), 0)
    : 0

  const validar = async (pago: PagoPoliza) => {
    setProcesandoId(pago.id)
    try {
      await validarPago(pago.id)
    } catch (error: any) {
      toast.error(error.message || "No fue posible validar el pago")
    } finally {
      setProcesandoId(null)
    }
  }

  const rechazar = async (pago: PagoPoliza) => {
    if (!motivoRechazo.trim()) {
      toast.error("Indica el motivo del rechazo")
      return
    }
    setProcesandoId(pago.id)
    try {
      await anularPago(pago.id, motivoRechazo.trim())
      setRechazandoId(null)
      setMotivoRechazo("")
    } catch (error: any) {
      toast.error(error.message || "No fue posible rechazar el pago")
    } finally {
      setProcesandoId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Cobranza */}
      <div className="rounded-xl border border-border/50 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Cobranza</p>
            <p className="text-xs text-muted-foreground capitalize">Periodicidad {poliza.formaPago} · {moneda}</p>
          </div>
          <SemaforoPill situacion={situacion} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div><p className="text-xs text-muted-foreground">Prima total</p><p className="font-semibold">{importe(situacion.total, moneda)}</p></div>
          <div>
            <p className="text-xs text-muted-foreground">Cobrado</p>
            <p className="font-semibold text-green-600">{importe(situacion.cobrado, moneda)}</p>
            {esUdis && <p className="text-xs text-muted-foreground">{mxn(cobradoMxn)}</p>}
          </div>
          <div><p className="text-xs text-muted-foreground">Por validar</p><p className="font-semibold text-purple-600">{importe(situacion.porValidar, moneda)}</p></div>
          <div>
            <p className="text-xs text-muted-foreground">Pendiente</p>
            <p className="font-semibold text-orange-600">{importe(situacion.pendiente, moneda)}</p>
            {esUdis && pendienteMxn > 0 && <p className="text-xs text-muted-foreground">≈ {mxn(pendienteMxn)} con la UDI de cada fecha de pago</p>}
          </div>
        </div>

        {recibos.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin recibos generados. Se crean al guardar la prima, la periodicidad y las vigencias.</p>
        ) : (
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {recibos.map(recibo => {
              const estado = estadoCobranzaRecibo(recibo, hoy)
              return (
                <div key={recibo.id} className="rounded-lg bg-muted/30 p-2 text-xs space-y-2">
                  <div className="grid grid-cols-[56px_1fr_auto] sm:grid-cols-[56px_1fr_1fr_auto] gap-2 items-start">
                    <span className="font-mono font-semibold">{recibo.numeroRecibo}/{recibo.totalRecibos}</span>
                    <div>
                      <p className="font-medium">{importe(recibo.monto, recibo.moneda)}</p>
                      {recibo.moneda === "UDIS" && recibo.montoMxn != null && !reciboPorCobrar(recibo) && (
                        <p className="text-muted-foreground">{mxn(recibo.montoMxn)} · UDI {recibo.valorUdi?.toFixed(6)}{recibo.fechaValorUdi ? ` del ${formatDateOnly(recibo.fechaValorUdi)}` : ""}</p>
                      )}
                      {recibo.moneda === "UDIS" && reciboPorCobrar(recibo) && (
                        <EquivalenteUdi udis={recibo.monto} udi={udiParaRecibo(recibo.fechaLimite)} className="text-muted-foreground" />
                      )}
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-muted-foreground">Inicia {formatDateOnly(recibo.fechaEmision)}</p>
                      <p>Vence {formatDateOnly(recibo.fechaLimite)}</p>
                      {recibo.fechaPago && <p className="text-muted-foreground">Pagado {formatDateOnly(recibo.fechaPago)}{recibo.metodoPago ? ` · ${recibo.metodoPago}` : ""}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant={estado === "pagado" ? "default" : estado === "vencido" ? "destructive" : "outline"}
                        className={estado === "por_validar" ? "bg-purple-600 text-white border-purple-600" : undefined}
                      >
                        {estado.replace("_", " ")}
                      </Badge>
                      {recibo.comprobanteUrl && (
                        <a href={recibo.comprobanteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                          <FileText className="h-3 w-3" />Comprobante
                        </a>
                      )}
                    </div>
                  </div>
                  {conAcciones && recibo.estatus === "por_validar" && (
                    rechazandoId === recibo.id ? (
                      <div className="flex items-center gap-2">
                        <Input value={motivoRechazo} onChange={event => setMotivoRechazo(event.target.value)} placeholder="Motivo del rechazo" className="h-7 text-xs" />
                        <Button size="sm" variant="destructive" className="h-7 text-xs" disabled={procesandoId === recibo.id} onClick={() => void rechazar(recibo)}>Rechazar</Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setRechazandoId(null)}><X className="h-4 w-4" /></Button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs text-red-600" onClick={() => { setRechazandoId(recibo.id); setMotivoRechazo("") }}>Rechazar</Button>
                        <Button size="sm" className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white" disabled={procesandoId === recibo.id} onClick={() => void validar(recibo)}>
                          <Check className="mr-1 h-3 w-3" />Validar pago
                        </Button>
                      </div>
                    )
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Historial de pagos */}
      <div className="rounded-xl border border-border/50 p-4 space-y-2">
        <p className="text-sm font-semibold">Historial de pagos</p>
        {movimientos.length === 0 ? <p className="text-xs text-muted-foreground">Sin movimientos de pago.</p> : movimientos.map(item => {
          const datos = item.metadata as Record<string, any>
          return (
            <div key={item.id} className="border-b border-border/30 pb-2 last:border-0 text-xs">
              <div className="flex justify-between gap-3">
                <span className="font-medium">{ETIQUETA_MOVIMIENTO[item.tipoCambio] || item.tipoCambio.replaceAll("_", " ")}{datos.numeroRecibo ? ` · recibo ${datos.numeroRecibo}` : ""}</span>
                <span className="text-muted-foreground">{new Date(item.createdAt).toLocaleString("es-MX")}</span>
              </div>
              <p className="text-muted-foreground">
                {item.usuarioNombre || item.usuarioEmail || "Sistema"}
                {datos.monto ? ` · ${importe(Number(datos.monto), datos.moneda || "MXN")}` : ""}
                {datos.montoMxn && datos.moneda === "UDIS" ? ` (${mxn(Number(datos.montoMxn))})` : ""}
                {datos.metodoPago ? ` · ${datos.metodoPago}` : ""}
                {datos.motivo ? ` · ${datos.motivo}` : ""}
              </p>
            </div>
          )
        })}
      </div>

      {/* Renovación */}
      <div className="rounded-xl border border-border/50 p-4 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold">Renovación</p>
          <Badge variant="outline" className={renovacion.generaAviso ? "border-orange-500 text-orange-700 dark:text-orange-300" : renovacion.estado === "renovada" ? "border-green-600 text-green-700 dark:text-green-300" : ""}>
            {ETIQUETA_RENOVACION[renovacion.estado]}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div><p className="text-muted-foreground">Fecha de renovación</p><p className="font-medium">{formatDateOnly(renovacion.fecha)} ({renovacion.dias >= 0 ? `en ${renovacion.dias} días` : `hace ${Math.abs(renovacion.dias)} días`})</p></div>
          <div><p className="text-muted-foreground">Avisos al cliente</p><p className="font-medium">{renovacion.generaAviso ? "Activos" : "Detenidos"}</p></div>
          {polizaAnterior && <div><p className="text-muted-foreground">Renovación de</p><p className="font-mono font-medium [overflow-wrap:anywhere]">{polizaAnterior.numeroPoliza}</p></div>}
          {polizaNueva && <div><p className="text-muted-foreground">Renovada con</p><p className="font-mono font-medium [overflow-wrap:anywhere]">{polizaNueva.numeroPoliza}</p></div>}
          {renovacionActiva && (
            <div className="col-span-2">
              <p className="text-muted-foreground">Último trámite</p>
              <p className="font-medium">
                {renovacionActiva.estado.replace("_", " ")} · iniciado {new Date(renovacionActiva.iniciadaEn).toLocaleDateString("es-MX")}
                {renovacionActiva.completadaEn ? ` · completado ${new Date(renovacionActiva.completadaEn).toLocaleDateString("es-MX")}` : ""}
                {renovacionActiva.motivoCancelacion ? ` · ${renovacionActiva.motivoCancelacion}` : ""}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Comisiones */}
      <div className="rounded-xl border border-border/50 p-4 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold">Comisiones</p>
          <span className="text-xs text-muted-foreground">{poliza.porcentajeComision ? `${poliza.porcentajeComision}% por recibo validado` : "Sin % de comisión capturado"}</span>
        </div>
        {comisionesPoliza.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin comisiones generadas.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div><p className="text-muted-foreground">Pendiente</p><p className="font-semibold text-orange-600">{mxn(resumenComisiones.pendiente)}</p></div>
              <div><p className="text-muted-foreground">Pagada</p><p className="font-semibold text-green-600">{mxn(resumenComisiones.pagada)}</p></div>
              <div><p className="text-muted-foreground">Por revertir</p><p className="font-semibold text-red-600">{mxn(resumenComisiones.porRevertir)}</p></div>
            </div>
            <div className="space-y-1">
              {comisionesPoliza.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 p-2 text-xs">
                  <span>Recibo {item.numeroRecibo} · {item.porcentaje}% de {mxn(item.base)}</span>
                  <span className="font-semibold">{mxn(item.monto)}</span>
                  <Badge variant="outline">{ETIQUETA_COMISION[item.estatus]}</Badge>
                </div>
              ))}
            </div>
            {poliza.vendedorId && <p className="text-xs text-muted-foreground">Vendedor: {usuariosSistema.find(item => item.id === poliza.vendedorId)?.nombre || "—"}</p>}
          </>
        )}
      </div>
    </div>
  )
}
