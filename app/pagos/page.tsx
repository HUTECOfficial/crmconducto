"use client"

import { useState, useMemo, useRef } from "react"
import { Sidebar } from "@/components/sidebar"
import { PageHeader } from "@/components/page-header"
import { coincideTerminos, normalizarBusqueda, terminosBusqueda } from "@/lib/busqueda"
import { GlassCard } from "@/components/glass-card"
import { NeoButton } from "@/components/neo-button"
import { useSupabase, type PagoPoliza } from "@/contexts/supabase-context"
import { useListaPorTandas } from "@/hooks/use-lista-por-tandas"
import { CargarMas } from "@/components/cargar-mas"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion } from "framer-motion"
import { Check, ChevronLeft, ChevronRight, FileText, Plus, Undo2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ProtectedRoute } from "@/components/protected-route"
import { differenceInCalendarDays, formatDateOnly, toDateOnly, todayDateOnly } from "@/lib/date-only"
import { estadoCobranzaRecibo, reciboPorCobrar } from "@/lib/payment-schedule"
import { obtenerValorUdi } from "@/lib/udi"
import { useUdiPorFecha } from "@/hooks/use-udi-por-fecha"
import { EquivalenteUdi } from "@/components/equivalente-udi"
import { toast } from "sonner"

interface PagoView extends PagoPoliza {
  clienteNombre: string
  numeroPoliza: string
  companiaNombre: string
  companiaColor: string
  periodicidad: string
  estatusCobranza: string
}

export default function PagosPage() {
  const { pagos, registrarPago, validarPago, anularPago, clientesPorId, companiasPorId, polizasPorId } = useSupabase()
  const [vistaActual, setVistaActual] = useState<"mes" | "semana" | "lista">("mes")
  const [mesActual, setMesActual] = useState(new Date())
  const [pagoSeleccionado, setPagoSeleccionado] = useState<PagoView | null>(null)
  const [pagoAnular, setPagoAnular] = useState<PagoView | null>(null)
  const [metodoPago, setMetodoPago] = useState("")
  const [referencia, setReferencia] = useState("")
  const [valorUdi, setValorUdi] = useState("")
  const [fechaValorUdi, setFechaValorUdi] = useState("")
  const [cargandoUdi, setCargandoUdi] = useState(false)
  const [errorUdi, setErrorUdi] = useState("")
  const [motivoAnulacion, setMotivoAnulacion] = useState("")
  const [comprobante, setComprobante] = useState<File | null>(null)
  const [fechaPago, setFechaPago] = useState(todayDateOnly())
  const [guardando, setGuardando] = useState(false)
  const [busqueda, setBusqueda] = useState("")

  // Sin fecha consulta el valor de hoy (vista previa); con fecha, el valor de la fecha de pago.
  const fechaUdiSolicitada = useRef<string | undefined>(undefined)
  const cargarValorUdi = async (fecha?: string) => {
    fechaUdiSolicitada.current = fecha
    setCargandoUdi(true)
    setErrorUdi("")
    if (fecha) {
      setValorUdi("")
      setFechaValorUdi("")
    }
    try {
      const udi = await obtenerValorUdi(fecha)
      // Ignora respuestas de una fecha que el usuario ya cambió.
      if (fechaUdiSolicitada.current === fecha) {
        setValorUdi(udi.valor.toString())
        setFechaValorUdi(udi.fecha || "")
      }
    } catch (error: any) {
      if (fechaUdiSolicitada.current === fecha) {
        setValorUdi("")
        setErrorUdi(error.message || "No fue posible consultar el valor UDI")
      }
    } finally {
      if (fechaUdiSolicitada.current === fecha) setCargandoUdi(false)
    }
  }

  // Recibos por cobrar en UDIS: en pesos con la UDI del día en que se pagará cada uno.
  const { udiParaRecibo } = useUdiPorFecha(pagos.some(pago => pago.moneda === "UDIS"))

  // Generar vista de pagos desde pólizas activas
  const pagosView = useMemo(() => pagos
    .filter(pago => pago.estatus !== "cancelado")
    .map(pago => {
      const poliza = polizasPorId.get(pago.polizaId)
      const cliente = clientesPorId.get(pago.clienteId)
      const compania = companiasPorId.get(poliza?.companiaId ?? "")
      return {
        ...pago,
        clienteNombre: cliente?.nombre || "Cliente",
        numeroPoliza: poliza?.numeroPoliza || "Póliza",
        companiaNombre: compania?.nombre || "Compañía",
        companiaColor: compania?.color || "#6366f1",
        periodicidad: poliza?.formaPago || "—",
        estatusCobranza: estadoCobranzaRecibo(pago),
      }
    }), [pagos, polizasPorId, clientesPorId, companiasPorId])

  // Agrupar pagos por fecha
  // El buscador filtra el calendario y la lista: cliente, póliza, aseguradora o referencia.
  const pagosFiltrados = useMemo(() => {
    const terminos = terminosBusqueda(busqueda)
    if (!terminos.length) return pagosView
    return pagosView.filter(pago => coincideTerminos(normalizarBusqueda([pago.clienteNombre, pago.numeroPoliza, pago.companiaNombre, pago.referencia].filter(Boolean).join(" ")), terminos))
  }, [pagosView, busqueda])
  const pagosPorFecha = useMemo(() => pagosFiltrados.reduce((acc, pago) => {
    const fecha = pago.fechaLimite
    if (!acc[fecha]) acc[fecha] = []
    acc[fecha].push(pago)
    return acc
  }, {} as Record<string, PagoView[]>), [pagosFiltrados])
  const { visibles: pagosVisibles, restantes, mostrarMas } = useListaPorTandas(pagosFiltrados, busqueda)

  const getDiasDelMes = () => {
    const year = mesActual.getFullYear()
    const month = mesActual.getMonth()
    const primerDia = new Date(year, month, 1)
    const ultimoDia = new Date(year, month + 1, 0)
    const dias = []

    // Días del mes anterior para completar la primera semana
    const primerDiaSemana = primerDia.getDay()
    for (let i = primerDiaSemana - 1; i >= 0; i--) {
      const dia = new Date(year, month, -i)
      dias.push({ fecha: dia, esDelMes: false })
    }

    // Días del mes actual
    for (let i = 1; i <= ultimoDia.getDate(); i++) {
      dias.push({ fecha: new Date(year, month, i), esDelMes: true })
    }

    return dias
  }

  const cambiarMes = (direccion: number) => {
    setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + direccion, 1))
  }

  const getDiasRestantes = (fechaLimite: string) => differenceInCalendarDays(fechaLimite, todayDateOnly())

  const abrirRegistro = (pago?: PagoView) => {
    const seleccionado = pago || pagosView.find(reciboPorCobrar)
    if (!seleccionado) {
      toast.info("No hay recibos pendientes")
      return
    }
    setPagoSeleccionado(seleccionado)
    setMetodoPago("")
    setReferencia("")
    setComprobante(null)
    setFechaPago(todayDateOnly())
    if (seleccionado.moneda === "UDIS") {
      void cargarValorUdi(todayDateOnly())
    } else {
      setValorUdi("")
    }
  }

  const confirmarPago = async () => {
    if (!pagoSeleccionado || !metodoPago) {
      toast.error("Selecciona el método de pago")
      return
    }
    if (!fechaPago) {
      toast.error("Indica la fecha de pago")
      return
    }
    if (pagoSeleccionado.moneda === "UDIS" && (!valorUdi || Number(valorUdi) <= 0 || fechaValorUdi !== fechaPago)) {
      toast.error("Falta el valor UDI de la fecha de pago; espera a que cargue o reintenta")
      return
    }
    setGuardando(true)
    try {
      await registrarPago(pagoSeleccionado.id, {
        metodoPago,
        fechaPago,
        referencia: referencia || undefined,
        valorUdi: pagoSeleccionado.moneda === "UDIS" ? Number(valorUdi) : undefined,
        fechaValorUdi: pagoSeleccionado.moneda === "UDIS" ? fechaValorUdi : undefined,
        comprobante,
      })
      setPagoSeleccionado(null)
    } catch (error: any) {
      toast.error(error.message || "No fue posible registrar el pago")
    } finally {
      setGuardando(false)
    }
  }

  const confirmarValidacion = async (pago: PagoView) => {
    setGuardando(true)
    try {
      await validarPago(pago.id)
    } catch (error: any) {
      toast.error(error.message || "No fue posible validar el pago")
    } finally {
      setGuardando(false)
    }
  }

  const confirmarAnulacion = async () => {
    if (!pagoAnular || !motivoAnulacion.trim()) {
      toast.error("Indica el motivo de anulación")
      return
    }
    setGuardando(true)
    try {
      await anularPago(pagoAnular.id, motivoAnulacion.trim())
      setPagoAnular(null)
      setMotivoAnulacion("")
    } catch (error: any) {
      toast.error(error.message || "No fue posible anular el pago")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <ProtectedRoute>
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="main-content-aligned">
        <PageHeader
          title="Pagos"
          subtitle="Calendario de recibos y cobranza"
          searchValue={busqueda}
          onSearchChange={setBusqueda}
          searchPlaceholder="Buscar cliente, póliza, aseguradora o referencia..."
          action={
            <NeoButton className="gap-2" onClick={() => abrirRegistro()}>
              <Plus className="w-5 h-5" />
              Registrar Pago
            </NeoButton>
          }
        />

        {/* Controles de vista */}
        <GlassCard className="p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <NeoButton variant="ghost" size="sm" onClick={() => cambiarMes(-1)}>
                <ChevronLeft className="w-5 h-5" />
              </NeoButton>
              <h2 className="text-xl font-bold font-serif min-w-[200px] text-center">
                {mesActual.toLocaleDateString("es-MX", { month: "long", year: "numeric" })}
              </h2>
              <NeoButton variant="ghost" size="sm" onClick={() => cambiarMes(1)}>
                <ChevronRight className="w-5 h-5" />
              </NeoButton>
            </div>

            <div className="flex gap-2">
              <NeoButton variant={vistaActual === "mes" ? "primary" : "ghost"} size="sm" onClick={() => setVistaActual("mes")}>Mes</NeoButton>
              <NeoButton variant={vistaActual === "lista" ? "primary" : "ghost"} size="sm" onClick={() => setVistaActual("lista")}>Lista</NeoButton>
            </div>
          </div>
        </GlassCard>

        {vistaActual === "mes" ? (
          <GlassCard className="p-6">
            <div className="grid grid-cols-7 gap-2 mb-4">
              {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((dia) => <div key={dia} className="text-center font-semibold text-sm text-muted-foreground p-2">{dia}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {getDiasDelMes().map((dia, index) => {
                const fechaStr = toDateOnly({ year: dia.fecha.getFullYear(), month: dia.fecha.getMonth() + 1, day: dia.fecha.getDate() })
                const pagosDia = pagosPorFecha[fechaStr] || []
                const esHoy = fechaStr === todayDateOnly()

                return (
                  <motion.div key={index} className={cn("min-h-[100px] p-2 rounded-xl border transition-colors", dia.esDelMes ? "bg-card border-border/50" : "bg-muted/20 border-transparent", esHoy && "ring-2 ring-primary")} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: Math.min(index * 0.01, 0.3) }}>
                    <div className="text-sm font-semibold mb-1">{dia.fecha.getDate()}</div>
                    <div className="space-y-1">
                      {pagosDia.slice(0, 2).map((pago) => {
                        const diasRestantes = getDiasRestantes(pago.fechaLimite)
                        return (
                          <button key={pago.id} onClick={() => reciboPorCobrar(pago) && abrirRegistro(pago)} className="block w-full text-left text-xs p-1 rounded bg-muted/50 truncate" style={{ borderLeft: `3px solid ${pago.companiaColor}` }}>
                            {pago.numeroRecibo}/{pago.totalRecibos} · {pago.monto.toLocaleString()} {pago.moneda}
                            {pago.moneda === "UDIS" && reciboPorCobrar(pago) && udiParaRecibo(pago.fechaLimite) && ` · $${(pago.monto * udiParaRecibo(pago.fechaLimite)!.valor).toLocaleString("es-MX", { maximumFractionDigits: 2 })}`}
                            {pago.estatusCobranza === "por_validar" && <Badge className="ml-1 text-[10px] px-1 py-0 bg-purple-600 text-white">Por validar</Badge>}
                            {reciboPorCobrar(pago) && diasRestantes <= 7 && <Badge variant="destructive" className="ml-1 text-[10px] px-1 py-0">{diasRestantes < 0 ? "Vencido" : `${diasRestantes}d`}</Badge>}
                          </button>
                        )
                      })}
                      {pagosDia.length > 2 && <div className="text-xs text-muted-foreground">+{pagosDia.length - 2} más</div>}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-border/50"><th className="text-left p-4 font-semibold">Cliente</th><th className="text-left p-4 font-semibold">Póliza / Recibo</th><th className="text-left p-4 font-semibold">Periodicidad</th><th className="text-left p-4 font-semibold">Monto</th><th className="text-left p-4 font-semibold">Emisión / Límite</th><th className="text-left p-4 font-semibold">Estatus</th><th className="p-4" /></tr></thead>
                <tbody>
                  {pagosVisibles.map(pago => (
                    <tr key={pago.id} className="border-b border-border/30 hover:bg-muted/50 transition-colors">
                      <td className="p-4"><p className="font-medium">{pago.clienteNombre}</p><p className="text-xs text-muted-foreground">{pago.companiaNombre}</p></td>
                      <td className="p-4 max-w-[13rem]"><p className="font-mono text-sm [overflow-wrap:anywhere]">{pago.numeroPoliza}</p><p className="text-xs">Recibo {pago.numeroRecibo}/{pago.totalRecibos} · Anualidad {pago.anualidad}</p></td>
                      <td className="p-4 capitalize">{pago.periodicidad}</td>
                      <td className="p-4"><p className="font-semibold">{pago.monto.toLocaleString()} {pago.moneda}</p>{pago.moneda === "UDIS" && !reciboPorCobrar(pago) && pago.montoMxn != null && <p className="text-xs text-muted-foreground">${pago.montoMxn.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN · UDI {pago.valorUdi?.toFixed(6)}{pago.fechaPago ? ` del ${formatDateOnly(pago.fechaPago)}` : ""}</p>}{pago.moneda === "UDIS" && reciboPorCobrar(pago) && <EquivalenteUdi udis={pago.monto} udi={udiParaRecibo(pago.fechaLimite)} />}</td>
                      <td className="p-4 text-sm"><p>{formatDateOnly(pago.fechaEmision)}</p><p className="text-xs text-muted-foreground">Límite: {formatDateOnly(pago.fechaLimite)}</p></td>
                      <td className="p-4"><Badge variant={pago.estatusCobranza === "pagado" ? "default" : pago.estatusCobranza === "vencido" ? "destructive" : "secondary"} className={pago.estatusCobranza === "por_validar" ? "bg-purple-600 text-white" : undefined}>{pago.estatusCobranza.replace("_", " ")}</Badge>{pago.comprobanteUrl && <a href={pago.comprobanteUrl} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:underline"><FileText className="h-3 w-3" />Comprobante</a>}</td>
                      <td className="p-4"><div className="flex flex-wrap gap-2">{pago.estatusCobranza === "por_validar" ? <><Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" disabled={guardando} onClick={() => void confirmarValidacion(pago)}><Check className="mr-1 h-4 w-4" />Validar</Button><Button size="sm" variant="outline" className="text-red-600" onClick={() => { setPagoAnular(pago); setMotivoAnulacion("") }}>Rechazar</Button></> : pago.estatusCobranza === "pagado" ? <Button size="sm" variant="outline" className="text-red-600" onClick={() => { setPagoAnular(pago); setMotivoAnulacion("") }}><Undo2 className="mr-1 h-4 w-4" />Anular pago</Button> : <Button size="sm" onClick={() => abrirRegistro(pago)}>Cobrar</Button>}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <CargarMas restantes={restantes} onMas={mostrarMas} />
          </GlassCard>
        )}
      </main>

      <Dialog open={!!pagoSeleccionado} onOpenChange={open => { if (!open) setPagoSeleccionado(null) }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader><DialogTitle>Registrar pago</DialogTitle><DialogDescription>El pago quedará pendiente de validar; al validarlo se refleja como cobrado.</DialogDescription></DialogHeader>
          {pagoSeleccionado && <div className="rounded-xl bg-muted/40 p-3 text-sm"><p className="font-mono font-semibold [overflow-wrap:anywhere]">{pagoSeleccionado.numeroPoliza}</p><p>Recibo {pagoSeleccionado.numeroRecibo}/{pagoSeleccionado.totalRecibos} · Anualidad {pagoSeleccionado.anualidad}</p><p>{pagoSeleccionado.monto.toLocaleString()} {pagoSeleccionado.moneda}</p><p className="text-xs text-muted-foreground">Fecha límite: {formatDateOnly(pagoSeleccionado.fechaLimite)}</p></div>}
          <div className="space-y-2"><Label>Método de pago *</Label><Select value={metodoPago} onValueChange={setMetodoPago}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent><SelectItem value="efectivo">Efectivo</SelectItem><SelectItem value="transferencia">Transferencia</SelectItem><SelectItem value="tarjeta">Tarjeta</SelectItem><SelectItem value="domiciliacion">Domiciliación</SelectItem><SelectItem value="cheque">Cheque</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>Fecha de pago *</Label><Input type="date" value={fechaPago} max={todayDateOnly()} onChange={event => {
            const fecha = event.target.value
            setFechaPago(fecha)
            if (pagoSeleccionado?.moneda !== "UDIS") return
            if (fecha) void cargarValorUdi(fecha)
            else { fechaUdiSolicitada.current = ""; setValorUdi(""); setFechaValorUdi(""); setCargandoUdi(false) }
          }} /></div>
          {pagoSeleccionado?.moneda === "UDIS" && <div className="space-y-2 rounded-lg bg-muted/40 p-3"><Label>Valor UDI al {formatDateOnly(fechaPago)} (Banco de México)</Label>{cargandoUdi ? <p className="text-sm text-muted-foreground">Consultando valor...</p> : valorUdi && Number(valorUdi) > 0 ? <p className="text-sm">UDI {Number(valorUdi).toFixed(6)} · Equivalente: ${(pagoSeleccionado.monto * Number(valorUdi)).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</p> : <div className="flex items-center gap-2"><p className="text-sm text-destructive">{errorUdi || "Valor no disponible"}</p><Button size="sm" variant="outline" onClick={() => void cargarValorUdi(fechaPago)}>Reintentar</Button></div>}</div>}
          <div className="space-y-2"><Label>Referencia</Label><Input value={referencia} onChange={event => setReferencia(event.target.value)} /></div>
          <div className="space-y-2"><Label>Comprobante (opcional)</Label><Input type="file" accept="image/*,.pdf" className="text-xs" onChange={event => setComprobante(event.target.files?.[0] || null)} /></div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setPagoSeleccionado(null)}>Cancelar</Button><Button disabled={guardando} onClick={confirmarPago}>{guardando ? "Guardando..." : "Registrar pago"}</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pagoAnular} onOpenChange={open => { if (!open) setPagoAnular(null) }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader><DialogTitle>{pagoAnular?.estatusCobranza === "por_validar" ? "Rechazar pago" : "Anular pago registrado"}</DialogTitle><DialogDescription>El recibo volverá a pendiente y la acción quedará registrada en el historial.</DialogDescription></DialogHeader>
          {pagoAnular && <div className="rounded-xl bg-muted/40 p-3 text-sm"><p className="font-mono font-semibold [overflow-wrap:anywhere]">{pagoAnular.numeroPoliza}</p><p>Recibo {pagoAnular.numeroRecibo}/{pagoAnular.totalRecibos} · {pagoAnular.monto.toLocaleString()} {pagoAnular.moneda}</p></div>}
          <div className="space-y-2"><Label>{pagoAnular?.estatusCobranza === "por_validar" ? "Motivo del rechazo *" : "Motivo de anulación *"}</Label><Input value={motivoAnulacion} onChange={event => setMotivoAnulacion(event.target.value)} placeholder="Ej: pago marcado por error" /></div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setPagoAnular(null)}>Cancelar</Button><Button variant="destructive" disabled={guardando} onClick={confirmarAnulacion}>{guardando ? "Guardando..." : pagoAnular?.estatusCobranza === "por_validar" ? "Rechazar pago" : "Anular pago"}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
    </ProtectedRoute>
  )
}
