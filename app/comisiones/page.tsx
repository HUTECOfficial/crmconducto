"use client"

import { useMemo, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { PageHeader } from "@/components/page-header"
import { GlassCard } from "@/components/glass-card"
import { ProtectedRoute } from "@/components/protected-route"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertTriangle, CheckCircle2, Clock, RefreshCw, Percent } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"
import { useSupabase, type Comision } from "@/contexts/supabase-context"
import { formatDateOnly, todayDateOnly } from "@/lib/date-only"
import { resumirComisiones, type EstadoComision } from "@/lib/comisiones"
import { etiquetaRamo } from "@/lib/ramos"

const ETIQUETA_ESTADO: Record<EstadoComision, string> = {
  pendiente: "Pendiente",
  pagada: "Pagada",
  por_revertir: "Por revertir",
  cancelada: "Cancelada",
}

const CLASE_ESTADO: Record<EstadoComision, string> = {
  pendiente: "border-orange-500 text-orange-700 dark:text-orange-300",
  pagada: "border-green-600 text-green-700 dark:text-green-300",
  por_revertir: "border-red-500 text-red-700 dark:text-red-300",
  cancelada: "text-muted-foreground",
}

function mxn(monto: number) {
  return `$${monto.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function ComisionesPage() {
  const { tienePermiso } = useAuth()
  const { comisiones, polizas, companias, usuariosSistema, marcarComisionesPagadas, resolverComisionPorRevertir, generarComisionesFaltantes, clientesPorId, companiasPorId, polizasPorId } = useSupabase()

  const [filtroEstado, setFiltroEstado] = useState<EstadoComision | "activas" | "todas">("activas")
  const [filtroVendedor, setFiltroVendedor] = useState("todos")
  const [filtroCompania, setFiltroCompania] = useState("todas")
  const [busqueda, setBusqueda] = useState("")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set())
  const [modalPago, setModalPago] = useState(false)
  const [fechaPago, setFechaPago] = useState(todayDateOnly())
  const [referenciaPago, setReferenciaPago] = useState("")
  const [reversion, setReversion] = useState<Comision | null>(null)
  const [notasReversion, setNotasReversion] = useState("")
  const [procesando, setProcesando] = useState(false)

  const filas = useMemo(() => comisiones.map(comision => {
    const poliza = polizasPorId.get(comision.polizaId)
    return {
      comision,
      poliza,
      cliente: clientesPorId.get(poliza?.clienteId ?? ""),
      compania: companiasPorId.get(poliza?.companiaId ?? ""),
      vendedor: usuariosSistema.find(item => item.id === comision.vendedorId),
    }
  }), [comisiones, polizasPorId, clientesPorId, companiasPorId, usuariosSistema])

  const filtradas = filas.filter(({ comision, poliza, cliente, compania }) => {
    if (filtroEstado === "activas" && comision.estatus === "cancelada") return false
    if (filtroEstado !== "activas" && filtroEstado !== "todas" && comision.estatus !== filtroEstado) return false
    if (filtroVendedor !== "todos" && (comision.vendedorId || "__sin__") !== filtroVendedor) return false
    if (filtroCompania !== "todas" && compania?.id !== filtroCompania) return false
    const fecha = comision.generadaEn.slice(0, 10)
    if (fechaDesde && fecha < fechaDesde) return false
    if (fechaHasta && fecha > fechaHasta) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return (poliza?.numeroPoliza || "").toLowerCase().includes(q)
        || (poliza?.nombreAsegurado || "").toLowerCase().includes(q)
        || (cliente?.nombre || "").toLowerCase().includes(q)
    }
    return true
  })

  const resumen = resumirComisiones(filtradas.map(({ comision }) => comision))
  const polizasSinPorcentaje = polizas.filter(poliza => (poliza.estatus === "activa" || poliza.estatus === "gracia" || poliza.estatus === "por-renovar") && !poliza.porcentajeComision).length

  // Detalle por póliza
  const porPoliza = useMemo(() => {
    const grupos = new Map<string, typeof filtradas>()
    filtradas.forEach(fila => {
      const lista = grupos.get(fila.comision.polizaId) || []
      lista.push(fila)
      grupos.set(fila.comision.polizaId, lista)
    })
    return Array.from(grupos.values()).map(lista => ({
      ...lista[0],
      recibos: lista.length,
      resumen: resumirComisiones(lista.map(({ comision }) => comision)),
    })).sort((left, right) => right.resumen.pendiente - left.resumen.pendiente)
  }, [filtradas])

  const pendientesVisibles = filtradas.filter(({ comision }) => comision.estatus === "pendiente")
  const todasSeleccionadas = pendientesVisibles.length > 0 && pendientesVisibles.every(({ comision }) => seleccionadas.has(comision.id))
  // Sólo se pagan las seleccionadas que siguen visibles con los filtros actuales.
  const seleccionVisible = pendientesVisibles.filter(({ comision }) => seleccionadas.has(comision.id))
  const idsSeleccionados = seleccionVisible.map(({ comision }) => comision.id)
  const montoSeleccionado = seleccionVisible.reduce((sum, { comision }) => sum + comision.monto, 0)

  const alternarSeleccion = (id: string) => {
    setSeleccionadas(actual => {
      const siguiente = new Set(actual)
      if (siguiente.has(id)) siguiente.delete(id)
      else siguiente.add(id)
      return siguiente
    })
  }

  const confirmarPago = async () => {
    setProcesando(true)
    try {
      await marcarComisionesPagadas(idsSeleccionados, { fecha: fechaPago, referencia: referenciaPago })
      setSeleccionadas(new Set())
      setModalPago(false)
      setReferenciaPago("")
    } catch (error: any) {
      toast.error(error.message || "No fue posible marcar las comisiones")
    } finally {
      setProcesando(false)
    }
  }

  const confirmarReversion = async () => {
    if (!reversion) return
    setProcesando(true)
    try {
      await resolverComisionPorRevertir(reversion.id, notasReversion)
      setReversion(null)
      setNotasReversion("")
    } catch (error: any) {
      toast.error(error.message || "No fue posible registrar la reversión")
    } finally {
      setProcesando(false)
    }
  }

  const generarFaltantes = async () => {
    setProcesando(true)
    try {
      const creadas = await generarComisionesFaltantes()
      toast.success(creadas === 0 ? "No había comisiones faltantes" : `${creadas} comisiones generadas`)
    } catch (error: any) {
      toast.error(error.message || "No fue posible generar las comisiones")
    } finally {
      setProcesando(false)
    }
  }

  if (!tienePermiso("reportes")) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Sidebar />
          <main className="main-content-aligned">
            <PageHeader title="Comisiones" subtitle="Sin acceso" />
            <GlassCard className="p-8 text-center text-muted-foreground">No tienes permiso para consultar comisiones.</GlassCard>
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="main-content-aligned">
          <PageHeader
            title="Comisiones"
            subtitle="Una comisión por cada recibo validado, según el % de la póliza"
            action={
              <Button variant="outline" className="gap-2" disabled={procesando} onClick={() => void generarFaltantes()}>
                <RefreshCw className="h-4 w-4" />Generar faltantes
              </Button>
            }
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <GlassCard className="p-5">
              <div className="flex items-center gap-2 mb-2 text-xs font-medium text-muted-foreground"><Clock className="h-4 w-4 text-orange-600" />PENDIENTES DE COBRO</div>
              <p className="text-2xl font-bold text-orange-600">{mxn(resumen.pendiente)}</p>
            </GlassCard>
            <GlassCard className="p-5">
              <div className="flex items-center gap-2 mb-2 text-xs font-medium text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-green-600" />PAGADAS</div>
              <p className="text-2xl font-bold text-green-600">{mxn(resumen.pagada)}</p>
            </GlassCard>
            <GlassCard className="p-5">
              <div className="flex items-center gap-2 mb-2 text-xs font-medium text-muted-foreground"><AlertTriangle className="h-4 w-4 text-red-600" />POR REVERTIR</div>
              <p className="text-2xl font-bold text-red-600">{mxn(resumen.porRevertir)}</p>
            </GlassCard>
            <GlassCard className="p-5">
              <div className="flex items-center gap-2 mb-2 text-xs font-medium text-muted-foreground"><Percent className="h-4 w-4 text-blue-600" />PÓLIZAS SIN % COMISIÓN</div>
              <p className="text-2xl font-bold">{polizasSinPorcentaje}</p>
              <p className="text-xs text-muted-foreground">Captúralo en Editar póliza</p>
            </GlassCard>
          </div>

          <GlassCard className="p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
              <div className="space-y-1 lg:col-span-2">
                <Label className="text-xs">Buscar</Label>
                <Input value={busqueda} onChange={event => setBusqueda(event.target.value)} placeholder="Póliza, cliente o asegurado" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Estado</Label>
                <Select value={filtroEstado} onValueChange={(value: typeof filtroEstado) => setFiltroEstado(value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activas">Activas</SelectItem>
                    <SelectItem value="pendiente">Pendientes</SelectItem>
                    <SelectItem value="pagada">Pagadas</SelectItem>
                    <SelectItem value="por_revertir">Por revertir</SelectItem>
                    <SelectItem value="cancelada">Canceladas</SelectItem>
                    <SelectItem value="todas">Todas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Vendedor</Label>
                <Select value={filtroVendedor} onValueChange={setFiltroVendedor}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="__sin__">Sin vendedor</SelectItem>
                    {usuariosSistema.map(item => <SelectItem key={item.id} value={item.id}>{item.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Aseguradora</Label>
                <Select value={filtroCompania} onValueChange={setFiltroCompania}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    {companias.map(item => <SelectItem key={item.id} value={item.id}>{item.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Desde</Label>
                  <Input type="date" value={fechaDesde} onChange={event => setFechaDesde(event.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Hasta</Label>
                  <Input type="date" value={fechaHasta} onChange={event => setFechaHasta(event.target.value)} />
                </div>
              </div>
            </div>
          </GlassCard>

          <Tabs defaultValue="detalle">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <TabsList>
                <TabsTrigger value="detalle">Por recibo</TabsTrigger>
                <TabsTrigger value="poliza">Por póliza</TabsTrigger>
              </TabsList>
              <Button disabled={idsSeleccionados.length === 0} onClick={() => { setFechaPago(todayDateOnly()); setModalPago(true) }}>
                Marcar pagadas ({idsSeleccionados.length}) · {mxn(montoSeleccionado)}
              </Button>
            </div>

            <TabsContent value="detalle">
              <GlassCard className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 text-xs uppercase text-muted-foreground">
                        <th className="p-3 w-10">
                          <Checkbox
                            checked={todasSeleccionadas}
                            disabled={pendientesVisibles.length === 0}
                            onCheckedChange={checked => setSeleccionadas(checked ? new Set(pendientesVisibles.map(({ comision }) => comision.id)) : new Set())}
                            aria-label="Seleccionar pendientes"
                          />
                        </th>
                        <th className="p-3 text-left">Póliza</th>
                        <th className="p-3 text-left">Aseguradora</th>
                        <th className="p-3 text-left">Recibo</th>
                        <th className="p-3 text-right">Base</th>
                        <th className="p-3 text-right">%</th>
                        <th className="p-3 text-right">Comisión</th>
                        <th className="p-3 text-left">Estado</th>
                        <th className="p-3 text-left">Fechas</th>
                        <th className="p-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {filtradas.length === 0 ? (
                        <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">No hay comisiones con estos filtros. Se generan al validar el pago de un recibo de una póliza con % de comisión.</td></tr>
                      ) : filtradas.map(({ comision, poliza, cliente, compania, vendedor }) => (
                        <tr key={comision.id} className="border-b border-border/30 hover:bg-muted/40">
                          <td className="p-3">
                            {comision.estatus === "pendiente" && (
                              <Checkbox checked={seleccionadas.has(comision.id)} onCheckedChange={() => alternarSeleccion(comision.id)} aria-label="Seleccionar comisión" />
                            )}
                          </td>
                          <td className="p-3">
                            <p className="font-mono font-medium">{poliza?.numeroPoliza || "—"}</p>
                            <p className="text-xs text-muted-foreground">{poliza?.nombreAsegurado || cliente?.nombre}{poliza ? ` · ${etiquetaRamo(poliza.ramo)}` : ""}</p>
                            {vendedor && <p className="text-xs text-muted-foreground">Vendedor: {vendedor.nombre}</p>}
                          </td>
                          <td className="p-3">{compania?.nombre || "—"}</td>
                          <td className="p-3">{comision.numeroRecibo} · año {comision.anualidad}</td>
                          <td className="p-3 text-right">{mxn(comision.base)}</td>
                          <td className="p-3 text-right">{comision.porcentaje}%</td>
                          <td className="p-3 text-right font-semibold">{mxn(comision.monto)}</td>
                          <td className="p-3"><Badge variant="outline" className={CLASE_ESTADO[comision.estatus]}>{ETIQUETA_ESTADO[comision.estatus]}</Badge></td>
                          <td className="p-3 text-xs">
                            <p>Generada {new Date(comision.generadaEn).toLocaleDateString("es-MX")}</p>
                            {comision.pagadaEn && <p className="text-muted-foreground">Pagada {formatDateOnly(comision.pagadaEn)}{comision.referenciaPago ? ` · ${comision.referenciaPago}` : ""}</p>}
                            {comision.motivoCancelacion && <p className="text-muted-foreground">{comision.motivoCancelacion}</p>}
                          </td>
                          <td className="p-3">
                            {comision.estatus === "por_revertir" && (
                              <Button size="sm" variant="outline" className="text-red-600" onClick={() => { setReversion(comision); setNotasReversion("") }}>Registrar reversión</Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </TabsContent>

            <TabsContent value="poliza">
              <GlassCard className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 text-xs uppercase text-muted-foreground">
                        <th className="p-3 text-left">Póliza</th>
                        <th className="p-3 text-left">Aseguradora</th>
                        <th className="p-3 text-right">% actual</th>
                        <th className="p-3 text-right">Recibos</th>
                        <th className="p-3 text-right">Pendiente</th>
                        <th className="p-3 text-right">Pagada</th>
                        <th className="p-3 text-right">Por revertir</th>
                      </tr>
                    </thead>
                    <tbody>
                      {porPoliza.length === 0 ? (
                        <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Sin comisiones.</td></tr>
                      ) : porPoliza.map(({ comision, poliza, cliente, compania, recibos, resumen: totales }) => (
                        <tr key={comision.polizaId} className="border-b border-border/30 hover:bg-muted/40">
                          <td className="p-3">
                            <button className="font-mono font-medium hover:underline" onClick={() => setBusqueda(poliza?.numeroPoliza || "")}>{poliza?.numeroPoliza || "—"}</button>
                            <p className="text-xs text-muted-foreground">{poliza?.nombreAsegurado || cliente?.nombre}</p>
                          </td>
                          <td className="p-3">{compania?.nombre || "—"}</td>
                          <td className="p-3 text-right">{poliza?.porcentajeComision != null ? `${poliza.porcentajeComision}%` : "—"}</td>
                          <td className="p-3 text-right">{recibos}</td>
                          <td className="p-3 text-right text-orange-600 font-medium">{mxn(totales.pendiente)}</td>
                          <td className="p-3 text-right text-green-600 font-medium">{mxn(totales.pagada)}</td>
                          <td className="p-3 text-right text-red-600">{mxn(totales.porRevertir)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      <Dialog open={modalPago} onOpenChange={setModalPago}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Marcar comisiones como pagadas</DialogTitle>
            <DialogDescription>{idsSeleccionados.length} comisiones por {mxn(montoSeleccionado)} pagadas por la aseguradora.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2"><Label>Fecha de pago *</Label><Input type="date" value={fechaPago} max={todayDateOnly()} onChange={event => setFechaPago(event.target.value)} /></div>
          <div className="space-y-2"><Label>Referencia</Label><Input value={referenciaPago} onChange={event => setReferenciaPago(event.target.value)} placeholder="Estado de cuenta, folio de liquidación..." /></div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalPago(false)}>Cancelar</Button>
            <Button disabled={procesando || !fechaPago} onClick={() => void confirmarPago()}>{procesando ? "Guardando..." : "Marcar pagadas"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reversion} onOpenChange={open => { if (!open) setReversion(null) }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Registrar reversión</DialogTitle>
            <DialogDescription>La comisión ya se había pagado y el pago del recibo se anuló. Indica cómo se descontó.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2"><Label>Notas *</Label><Input value={notasReversion} onChange={event => setNotasReversion(event.target.value)} placeholder="Ej: descontada en liquidación de noviembre" /></div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setReversion(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={procesando} onClick={() => void confirmarReversion()}>{procesando ? "Guardando..." : "Registrar"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  )
}
