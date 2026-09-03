"use client"

import { GlassCard } from "@/components/glass-card"
import { PageHeader } from "@/components/page-header"
import { Sidebar } from "@/components/sidebar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ProtectedRoute } from "@/components/protected-route"
import { WhatsAppReminderButton } from "@/components/whatsapp-reminder-button"
import { motion } from "framer-motion"
import { AlertCircle, DollarSign, TrendingUp, TrendingDown, MessageSquare, Edit2, Check, X, Upload } from "lucide-react"
import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSupabase, type Poliza } from "@/contexts/supabase-context"
import { formatDateOnly, todayDateOnly } from "@/lib/date-only"
import { obtenerValorUdiActual } from "@/lib/udi"

function obtenerPrimaRecibo(poliza: Poliza) {
  const primaEmitida = Number(poliza.primaEmitida || poliza.prima || 0)
  const primaCobrada = Number(poliza.primaCobrada || 0)
  const pendiente = Math.max(0, primaEmitida - primaCobrada)
  const [reciboActual] = (poliza.numeroRecibo || "1/1").split("/").map(Number)
  const primerRecibo = Number(poliza.primerRecibo || 0)
  const reciboSubsecuente = Number(poliza.recibosSubsecuentes || 0)
  const primaConfigurada = Number(poliza.primaTotalRecibo || 0)

  const importe = reciboActual === 1 && primerRecibo > 0
    ? primerRecibo
    : reciboActual > 1 && reciboSubsecuente > 0
      ? reciboSubsecuente
      : primaConfigurada > 0
        ? primaConfigurada
        : primaEmitida

  return Math.min(importe, pendiente)
}

function PolizasPendientesContent() {
  const searchParams = useSearchParams()
  const { polizas, clientes, companias, pagos, registrarPago, anularPago, actualizarPoliza, loadingPolizas, marcarComoVencido } = useSupabase()

  const [filtroEstatus, setFiltroEstatus] = useState<"todas" | "activa" | "gracia" | "vencida" | "por-renovar" | "pagadas">("todas")
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [comentarioTemp, setComentarioTemp] = useState("")
  const [verComentarioId, setVerComentarioId] = useState<string | null>(null)

  // Estados para modales de acción
  const [modalAccion, setModalAccion] = useState(false)
  const [polizaAccion, setPolizaAccion] = useState<Poliza | null>(null)
  const [tipoAccion, setTipoAccion] = useState<"pagada" | "cancelar" | "anular-pago" | null>(null)
  const [motivoAccion, setMotivoAccion] = useState("")
  const [tipoPagoAccion, setTipoPagoAccion] = useState<"efectivo" | "transferencia" | "tarjeta" | "domiciliacion" | "cheque" | "">("")
  const [valorUdiAccion, setValorUdiAccion] = useState("")
  const [cargandoUdi, setCargandoUdi] = useState(false)
  const [errorUdi, setErrorUdi] = useState("")
  const [comprobante, setComprobante] = useState<File | null>(null)

  const cargarValorUdi = async () => {
    setCargandoUdi(true)
    setErrorUdi("")
    try {
      const udi = await obtenerValorUdiActual()
      setValorUdiAccion(udi.valor.toString())
    } catch (error: any) {
      setValorUdiAccion("")
      setErrorUdi(error.message || "No fue posible consultar el valor UDI actual")
    } finally {
      setCargandoUdi(false)
    }
  }

  // Aplicar filtro desde URL si viene de dashboard
  useEffect(() => {
    const filtro = searchParams.get("filtro")
    if (filtro === "vencidas") setFiltroEstatus("vencida")
    if (filtro === "gracia") setFiltroEstatus("gracia")
  }, [searchParams])

  // Filtrar pólizas: mostrar activas, en gracia, por-renovar y vencidas (todo lo no cancelado)
  let polizasPendientes = polizas.filter(p =>
    p.estatus === "activa" || p.estatus === "gracia" || p.estatus === "por-renovar" || p.estatus === "vencida"
  )

  if (filtroEstatus !== "todas") {
    if (filtroEstatus === "pagadas") {
      polizasPendientes = polizasPendientes.filter(p => p.primaCobrada >= p.primaEmitida)
    } else {
      polizasPendientes = polizasPendientes.filter(p => p.estatus === filtroEstatus)
    }
  }

  // Ordenar por fecha de vencimiento (más cercanas o vencidas primero)
  polizasPendientes = polizasPendientes.sort((a, b) => a.vigenciaFin.localeCompare(b.vigenciaFin))

  const totalPendiente = polizasPendientes.reduce((sum, p) => sum + ((p.primaEmitida || 0) - (p.primaCobrada || 0)), 0)
  const totalEmitido = polizasPendientes.reduce((sum, p) => sum + (p.primaEmitida || 0), 0)
  const totalCobrado = polizasPendientes.reduce((sum, p) => sum + (p.primaCobrada || 0), 0)

  const guardarComentario = async (polizaId: string) => {
    const poliza = polizas.find(p => p.id === polizaId)
    const comentarioActual = poliza?.comentarios || ""
    const fecha = new Date().toLocaleDateString('es-MX')
    const nuevoComentario = comentarioActual
      ? `${comentarioActual}\n[${fecha}] ${comentarioTemp}`
      : `[${fecha}] ${comentarioTemp}`
    await actualizarPoliza(polizaId, { comentarios: nuevoComentario })
    setEditandoId(null)
    setComentarioTemp("")
  }

  const abrirModalAccion = (poliza: Poliza, tipo: "pagada" | "cancelar" | "anular-pago") => {
    setPolizaAccion(poliza)
    setTipoAccion(tipo)
    setMotivoAccion("")
    setTipoPagoAccion("")
    setValorUdiAccion("")
    if (tipo === "pagada" && poliza.divisas === "UDIS") void cargarValorUdi()
    setComprobante(null)
    setModalAccion(true)
  }

  const ejecutarAccion = async () => {
    if (tipoAccion === "pagada" && !tipoPagoAccion) {
      toast.error("Seleccione el tipo de pago")
      return
    }
    if ((tipoAccion === "cancelar" || tipoAccion === "anular-pago") && !motivoAccion.trim()) {
      toast.error(tipoAccion === "anular-pago" ? "El motivo de anulación es obligatorio" : "El motivo de cancelación es obligatorio")
      return
    }
    if (!polizaAccion) return

    const fecha = new Date().toLocaleDateString('es-MX')

    if (tipoAccion === "pagada") {
      const reciboPendiente = pagos
        .filter(pago => pago.polizaId === polizaAccion.id && pago.estatus !== "pagado" && pago.estatus !== "cancelado")
        .sort((left, right) => left.numeroRecibo - right.numeroRecibo)[0]
      if (!reciboPendiente) {
        toast.error("Esta póliza no tiene recibos pendientes generados.")
        return
      }
      if (reciboPendiente.moneda === "UDIS" && (!valorUdiAccion || Number(valorUdiAccion) <= 0)) {
        toast.error("Capture el valor UDI aplicado al recibo")
        return
      }

      // Calcular el siguiente número de recibo
      const nuevoNumeroRecibo = `${reciboPendiente.numeroRecibo}/${reciboPendiente.totalRecibos}`
      
      // Parsear el número de recibo actual (ej: "1/6" → [1, 6])
      const comentarioPago = motivoAccion ? motivoAccion : undefined

      // Si no es el último recibo, incrementar al siguiente
      await registrarPago(reciboPendiente.id, {
        metodoPago: tipoPagoAccion,
        notas: comentarioPago,
        valorUdi: reciboPendiente.moneda === "UDIS" ? Number(valorUdiAccion) : undefined,
      })

      // Si es el último recibo, marcar como completamente pagado
      toast.success(`Recibo ${nuevoNumeroRecibo} marcado como pagado`)
    } else if (tipoAccion === "anular-pago") {
      const ultimoPago = pagos
        .filter(pago => pago.polizaId === polizaAccion.id && pago.estatus === "pagado")
        .sort((left, right) => right.numeroRecibo - left.numeroRecibo)[0]
      if (!ultimoPago) {
        toast.error("La póliza no tiene recibos pagados para anular")
        return
      }
      await anularPago(ultimoPago.id, motivoAccion.trim())
    } else if (tipoAccion === "cancelar") {
      const comentarioNuevo = polizaAccion.comentarios
        ? `${polizaAccion.comentarios}\n[${fecha}] CANCELADA: ${motivoAccion}`
        : `[${fecha}] CANCELADA: ${motivoAccion}`
      await actualizarPoliza(polizaAccion.id, {
        estatus: "cancelada",
        cancelacionMotivo: "cliente",
        comentarios: comentarioNuevo,
      })
      toast.success("Póliza cancelada y actualizada")
    }

    setModalAccion(false)
    setPolizaAccion(null)
    setTipoAccion(null)
    setMotivoAccion("")
    setTipoPagoAccion("")
    setValorUdiAccion("")
    setComprobante(null)
  }

  const marcarRecordatorio = async (polizaId: string, numRecordatorio: 1 | 2 | 3) => {
    const hoy = todayDateOnly()
    const poliza = polizas.find(p => p.id === polizaId)
    const fechasActuales = poliza?.fechasRecordatorio || {}
    await actualizarPoliza(polizaId, {
      fechasRecordatorio: {
        ...fechasActuales,
        [`fecha${numRecordatorio}`]: hoy
      }
    })
    toast.success(`Recordatorio ${numRecordatorio} registrado`)
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="main-content-aligned">
          <PageHeader
            title="Facturación · Pólizas pendientes de pago"
            subtitle="Gestión y seguimiento de cobranza"
          />

          {/* KPIs Principales */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
              <GlassCard className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-xl bg-blue-500/10">
                    <AlertCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">PÓLIZAS PENDIENTES</p>
                </div>
                <p className="text-2xl font-bold">{polizasPendientes.length}</p>
              </GlassCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <GlassCard className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-xl bg-green-500/10">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">PRIMA EMITIDA</p>
                </div>
                <p className="text-2xl font-bold text-green-600">${totalEmitido.toLocaleString()}</p>
              </GlassCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <GlassCard className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">PRIMA COBRADA</p>
                </div>
                <p className="text-2xl font-bold text-emerald-600">${totalCobrado.toLocaleString()}</p>
              </GlassCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <GlassCard className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-xl bg-red-500/10">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">PRIMA PENDIENTE</p>
                </div>
                <p className="text-2xl font-bold text-red-600">${totalPendiente.toLocaleString()}</p>
              </GlassCard>
            </motion.div>
          </div>

          {/* Barra de efectividad */}
          <GlassCard className="p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Efectividad de Cobranza</span>
              <span className="text-lg font-bold text-blue-600">
                {totalEmitido > 0 ? ((totalCobrado / totalEmitido) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full transition-all duration-500"
                style={{ width: `${totalEmitido > 0 ? (totalCobrado / totalEmitido) * 100 : 0}%` }}
              />
            </div>
          </GlassCard>

          {/* Filtros */}
          <GlassCard className="p-4 mb-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Filtrar por Estatus:</p>
                <div className="flex gap-2 flex-wrap">
                  {["todas", "activa", "gracia", "por-renovar", "pagadas"].map((estatus) => (
                    <button
                      key={estatus}
                      onClick={() => setFiltroEstatus(estatus as typeof filtroEstatus)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                        filtroEstatus === estatus
                          ? "bg-blue-600 text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {estatus === "todas" && "Todas"}
                      {estatus === "activa" && "Activas"}
                      {estatus === "gracia" && "En Gracia"}
                      {estatus === "por-renovar" && "Por Renovar"}
                      {estatus === "pagadas" && "✓ Pagadas"}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </GlassCard>

          {/* Tabla de Pólizas Pendientes - Desktop */}
          <GlassCard className="overflow-hidden hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-900 text-white">
                    <th className="p-3 text-left font-bold border-r border-zinc-700">PÓLIZA</th>
                    <th className="p-3 text-left font-bold border-r border-zinc-700">INCISO O ENDOSO</th>
                    <th className="p-3 text-left font-bold border-r border-zinc-700">COMPAÑÍA</th>
                    <th className="p-3 text-left font-bold border-r border-zinc-700">RAMO</th>
                    <th className="p-3 text-left font-bold border-r border-zinc-700">NOMBRE</th>
                    <th className="p-3 text-left font-bold border-r border-zinc-700">INICIO DE VIGENCIA</th>
                    <th className="p-3 text-left font-bold border-r border-zinc-700">ÚLTIMO DÍA DE PAGO</th>
                    <th className="p-3 text-left font-bold border-r border-zinc-700"># RECIBO</th>
                    <th className="p-3 text-left font-bold border-r border-zinc-700">PRIMA TOTAL DE RECIBO</th>
                    <th className="p-3 text-center font-bold border-r border-zinc-700">REGISTRO EN SISTEMA COBRANZA</th>
                    <th className="p-3 text-center font-bold border-r border-zinc-700">FECHA RECORDATORIO 1</th>
                    <th className="p-3 text-center font-bold border-r border-zinc-700">FECHA RECORDATORIO 2</th>
                    <th className="p-3 text-center font-bold border-r border-zinc-700">FECHA RECORDATORIO 3</th>
                    <th className="p-3 text-left font-bold border-r border-zinc-700">COMENTARIOS</th>
                    <th className="p-3 text-center font-bold">ACCIÓN</th>
                  </tr>
                </thead>
                <tbody>
                  {polizasPendientes.map((poliza, index) => {
                    const cliente = clientes.find(c => c.id === poliza.clienteId)
                    const compania = companias.find(c => c.id === poliza.companiaId)
                    const reciboPendiente = pagos.filter(pago => pago.polizaId === poliza.id && pago.estatus !== "pagado" && pago.estatus !== "cancelado").sort((left, right) => left.numeroRecibo - right.numeroRecibo)[0]
                    const primaRecibo = reciboPendiente?.monto ?? obtenerPrimaRecibo(poliza)

                    return (
                      <motion.tr
                        key={poliza.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.02 }}
                        className="bg-pink-100 dark:bg-pink-950/30 border-b border-pink-200 dark:border-pink-900 hover:bg-pink-200 dark:hover:bg-pink-900/40 transition-colors align-top"
                      >
                        <td className="p-4 font-mono font-bold border-r border-pink-200 dark:border-pink-900 align-top">
                          {poliza.numeroPoliza}
                        </td>
                        <td className="p-4 border-r border-pink-200 dark:border-pink-900 align-top">
                          {poliza.incisoEndoso || "-"}
                        </td>
                        <td className="p-4 border-r border-pink-200 dark:border-pink-900 align-top">
                          <Badge 
                            variant="outline" 
                            style={{ borderColor: compania?.color, color: compania?.color }}
                          >
                            {compania?.nombre || poliza.companiaId.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="p-4 border-r border-pink-200 dark:border-pink-900 capitalize font-medium align-top">
                          {poliza.ramo.replace("-", " ")}
                        </td>
                        <td className="p-4 border-r border-pink-200 dark:border-pink-900 align-top">
                          <div>
                            <p className="font-medium">{poliza.nombreAsegurado || cliente?.nombre}</p>
                          </div>
                        </td>
                        <td className="p-4 border-r border-pink-200 dark:border-pink-900 font-medium align-top">
                          {formatDateOnly(poliza.vigenciaInicio)}
                        </td>
                        <td className="p-4 border-r border-pink-200 dark:border-pink-900 font-medium align-top">
                          {reciboPendiente?.fechaLimite
                            ? formatDateOnly(reciboPendiente.fechaLimite)
                            : poliza.ultimoDiaPago
                              ? formatDateOnly(poliza.ultimoDiaPago)
                              : formatDateOnly(poliza.vigenciaFin)}
                        </td>
                        <td className="p-4 border-r border-pink-200 dark:border-pink-900 text-center align-top">
                          {reciboPendiente ? `${reciboPendiente.numeroRecibo}/${reciboPendiente.totalRecibos}` : poliza.numeroRecibo || "1/1"}
                        </td>
                        <td className="p-4 border-r border-pink-200 dark:border-pink-900 font-bold text-right align-top">
                          ${primaRecibo.toLocaleString()}
                        </td>
                        <td className="p-4 border-r border-pink-200 dark:border-pink-900 text-center align-top">
                          {poliza.registroSistemaCobranza ? (
                            <span className="text-green-600 font-bold">SÍ</span>
                          ) : (
                            <span className="text-muted-foreground">NO</span>
                          )}
                        </td>
                        <td className="p-4 border-r border-pink-200 dark:border-pink-900 text-center align-top">
                          {poliza.fechasRecordatorio?.fecha1 ? (
                            <span className="text-xs font-medium text-green-600">
                              {formatDateOnly(poliza.fechasRecordatorio.fecha1)}
                            </span>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 text-xs"
                              onClick={() => marcarRecordatorio(poliza.id, 1)}
                            >
                              Marcar
                            </Button>
                          )}
                        </td>
                        <td className="p-4 border-r border-pink-200 dark:border-pink-900 text-center align-top">
                          {poliza.fechasRecordatorio?.fecha2 ? (
                            <span className="text-xs font-medium text-yellow-600">
                              {formatDateOnly(poliza.fechasRecordatorio.fecha2)}
                            </span>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 text-xs"
                              onClick={() => marcarRecordatorio(poliza.id, 2)}
                            >
                              Marcar
                            </Button>
                          )}
                        </td>
                        <td className="p-4 border-r border-pink-200 dark:border-pink-900 text-center align-top">
                          {poliza.fechasRecordatorio?.fecha3 ? (
                            <span className="text-xs font-medium text-red-600">
                              {formatDateOnly(poliza.fechasRecordatorio.fecha3)}
                            </span>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 text-xs"
                              onClick={() => marcarRecordatorio(poliza.id, 3)}
                            >
                              Marcar
                            </Button>
                          )}
                        </td>
                        <td className="p-4 border-r border-pink-200 dark:border-pink-900 max-w-[220px] align-top">
                          {editandoId === poliza.id ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={comentarioTemp}
                                onChange={(e) => setComentarioTemp(e.target.value)}
                                className="h-7 text-xs"
                                placeholder="Nuevo comentario..."
                              />
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => guardarComentario(poliza.id)}>
                                <Check className="w-4 h-4 text-green-600" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditandoId(null)}>
                                <X className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div 
                                className="text-xs text-muted-foreground cursor-pointer hover:text-foreground whitespace-pre-line line-clamp-3 min-h-[40px]"
                                onClick={() => setVerComentarioId(poliza.id)}
                                title="Click para ver comentario completo"
                              >
                                {poliza.comentarios || <span className="italic">Sin comentarios</span>}
                              </div>
                              <div className="flex items-center gap-1 flex-wrap">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-6 px-2 text-xs"
                                  onClick={() => {
                                    setEditandoId(poliza.id)
                                    setComentarioTemp("")
                                  }}
                                >
                                  <Edit2 className="w-3 h-3 mr-1" />Agregar
                                </Button>
                                <WhatsAppReminderButton poliza={poliza} />
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-center align-top">
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            {poliza.primaCobrada >= poliza.primaEmitida ? (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="h-8 text-xs border-green-600 text-green-600 whitespace-nowrap"
                                  onClick={() => abrirModalAccion(poliza, "anular-pago")}
                                >
                                  Anular último pago
                                </Button>
                              </>
                            ) : primaRecibo > 0 ? (
                              <Button 
                                size="sm" 
                                variant="default"
                                className="h-8 text-xs bg-green-600 hover:bg-green-700 whitespace-nowrap"
                                onClick={() => abrirModalAccion(poliza, "pagada")}
                              >
                                ✓ Marcar Pagada
                              </Button>
                            ) : (
                              <span className="text-xs font-medium text-red-600">Falta prima</span>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="h-8 text-xs whitespace-nowrap text-red-600 border-red-400 hover:bg-red-50"
                              onClick={() => marcarComoVencido(poliza.id)}
                            >
                              Marcar Vencida
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              className="h-8 text-xs whitespace-nowrap"
                              onClick={() => abrirModalAccion(poliza, "cancelar")}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* Vista de Cards para Móvil/Tablet */}
          <div className="lg:hidden space-y-4">
            {polizasPendientes.map((poliza, index) => {
              const cliente = clientes.find(c => c.id === poliza.clienteId)
              const compania = companias.find(c => c.id === poliza.companiaId)
              const recibosPendientes = pagos.filter(pago => pago.polizaId === poliza.id && pago.estatus !== "pagado" && pago.estatus !== "cancelado").sort((left, right) => left.numeroRecibo - right.numeroRecibo)
              const reciboPendiente = recibosPendientes[0]
              const primaPendiente = recibosPendientes.length > 0 ? recibosPendientes.reduce((sum, pago) => sum + pago.monto, 0) : poliza.primaEmitida - poliza.primaCobrada
              const primaRecibo = reciboPendiente?.monto ?? obtenerPrimaRecibo(poliza)

              return (
                <motion.div
                  key={poliza.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <GlassCard className="p-4 bg-pink-50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-900">
                    {/* Header de la card */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-mono font-bold text-sm">{poliza.numeroPoliza}</p>
                        <Badge 
                          variant="outline" 
                          className="mt-1"
                          style={{ borderColor: compania?.color, color: compania?.color }}
                        >
                          {compania?.nombre}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Prima pendiente</p>
                        <p className="font-bold text-red-600">${primaPendiente.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Info del cliente */}
                    <div className="mb-3 pb-3 border-b border-pink-200 dark:border-pink-800">
                      <p className="font-medium">{poliza.nombreAsegurado || cliente?.nombre}</p>
                      <p className="text-xs text-muted-foreground capitalize">{poliza.ramo.replace("-", " ")} • {poliza.formaPago}</p>
                    </div>

                    {/* Detalles en grid */}
                    <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                      <div>
                        <p className="text-muted-foreground">Inicio de vigencia</p>
                        <p className="font-medium">{formatDateOnly(poliza.vigenciaInicio)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Último día pago</p>
                        <p className="font-medium">
                          {reciboPendiente?.fechaLimite
                            ? formatDateOnly(reciboPendiente.fechaLimite)
                            : poliza.ultimoDiaPago
                              ? formatDateOnly(poliza.ultimoDiaPago)
                              : formatDateOnly(poliza.vigenciaFin)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground"># Recibo</p>
                        <p className="font-medium">{reciboPendiente ? `${reciboPendiente.numeroRecibo}/${reciboPendiente.totalRecibos}` : poliza.numeroRecibo || "1/1"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Prima del recibo</p>
                        <p className="font-bold text-green-700">${primaRecibo.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">En sistema</p>
                        <p className={`font-medium ${poliza.registroSistemaCobranza ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {poliza.registroSistemaCobranza ? "SÍ" : "NO"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Inciso/Endoso</p>
                        <p className="font-medium">{poliza.incisoEndoso || "-"}</p>
                      </div>
                    </div>

                    {/* Recordatorios */}
                    <div className="flex gap-2 mb-3">
                      {[1, 2, 3].map((num) => {
                        const fecha = poliza.fechasRecordatorio?.[`fecha${num}` as keyof typeof poliza.fechasRecordatorio]
                        return (
                          <button
                            key={num}
                            onClick={() => !fecha && marcarRecordatorio(poliza.id, num as 1 | 2 | 3)}
                            className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
                              fecha 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30' 
                                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                            }`}
                          >
                            {fecha ? formatDateOnly(fecha) : `Rec ${num}`}
                          </button>
                        )
                      })}
                    </div>

                    {/* Comentarios y acciones */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {editandoId === poliza.id ? (
                          <div className="flex-1 flex items-center gap-1">
                            <Input
                              value={comentarioTemp}
                              onChange={(e) => setComentarioTemp(e.target.value)}
                              className="h-8 text-xs"
                              placeholder="Comentario..."
                            />
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => guardarComentario(poliza.id)}>
                              <Check className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditandoId(null)}>
                              <X className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground truncate">
                                {poliza.comentarios || "Sin comentarios"}
                              </p>
                            </div>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setEditandoId(poliza.id)
                                setComentarioTemp(poliza.comentarios || "")
                              }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <WhatsAppReminderButton poliza={poliza} />
                          </>
                        )}
                      </div>
                      
                      {/* Botones de acción */}
                      <div className="flex items-center gap-2">
                        {poliza.primaCobrada >= poliza.primaEmitida ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8 text-xs text-red-600 border-red-400"
                            onClick={() => abrirModalAccion(poliza, "anular-pago")}
                          >
                            Anular pago
                          </Button>
                        ) : primaRecibo > 0 ? (
                          <Button
                            size="sm"
                            variant="default"
                            className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700"
                            onClick={() => abrirModalAccion(poliza, "pagada")}
                          >
                            Pagar {primaRecibo.toLocaleString()} {poliza.divisas || "MXN"}
                          </Button>
                        ) : (
                          <span className="flex-1 text-center text-xs font-medium text-red-600">Falta prima</span>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1 h-8 text-xs text-red-600 border-red-400"
                          onClick={() => marcarComoVencido(poliza.id)}
                        >
                          Vencida
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          className="flex-1 h-8 text-xs"
                          onClick={() => abrirModalAccion(poliza, "cancelar")}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )
            })}
          </div>

          {polizasPendientes.length === 0 && (
            <GlassCard className="p-8 text-center mt-6">
              <p className="text-muted-foreground text-lg">✅ No hay pólizas pendientes de pago</p>
            </GlassCard>
          )}

          {/* Leyenda */}
          <div className="mt-6 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-pink-200 dark:bg-pink-950 rounded"></div>
              <span>Póliza pendiente de pago</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-green-600" />
              <span>Enviar recordatorio WhatsApp</span>
            </div>
          </div>
        </main>
      </div>

      {/* Modal de Comentario Completo */}
      <Dialog open={!!verComentarioId} onOpenChange={() => setVerComentarioId(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Comentarios de la Póliza</DialogTitle>
            <DialogDescription>
              {polizas.find(p => p.id === verComentarioId)?.numeroPoliza}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-line max-h-[300px] overflow-y-auto">
              {polizas.find(p => p.id === verComentarioId)?.comentarios || "Sin comentarios"}
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setVerComentarioId(null)}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Acción */}
      <Dialog open={modalAccion} onOpenChange={setModalAccion}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {tipoAccion === "pagada" ? "Registrar pago" : tipoAccion === "anular-pago" ? "Anular último pago" : "Cancelar póliza"}
            </DialogTitle>
            <DialogDescription>
              {tipoAccion === "pagada" 
                ? "Seleccione el tipo de pago y opcionalmente suba el comprobante"
                : tipoAccion === "anular-pago"
                  ? "El último recibo pagado volverá a pendiente y la acción quedará en el historial"
                  : "Ingrese el motivo de cancelación proporcionado por el cliente"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {polizaAccion && (
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-sm font-semibold">{polizaAccion.numeroPoliza}</p>
                <p className="text-xs text-muted-foreground">
                  {clientes.find(c => c.id === polizaAccion.clienteId)?.nombre} • Recibo actual: {obtenerPrimaRecibo(polizaAccion).toLocaleString()} {polizaAccion.divisas || "MXN"}
                </p>
              </div>
            )}

            {tipoAccion === "pagada" && (
              <div className="space-y-2">
                <Label>Tipo de Pago *</Label>
                <Select value={tipoPagoAccion} onValueChange={(value: any) => setTipoPagoAccion(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione el tipo de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="transferencia">Transferencia Bancaria</SelectItem>
                    <SelectItem value="tarjeta">Tarjeta de Crédito/Débito</SelectItem>
                    <SelectItem value="domiciliacion">Domiciliación</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {tipoAccion === "pagada" && polizaAccion?.divisas === "UDIS" && (
              <div className="space-y-2 rounded-lg bg-muted/40 p-3">
                <Label>Valor UDI actual (Banco de México)</Label>
                {cargandoUdi ? <p className="text-sm text-muted-foreground">Consultando valor actual...</p> : valorUdiAccion ? <p className="text-sm">UDI {Number(valorUdiAccion).toFixed(6)} · Equivalente: ${(obtenerPrimaRecibo(polizaAccion) * Number(valorUdiAccion)).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</p> : <div className="flex items-center gap-2"><p className="text-sm text-destructive">{errorUdi || "Valor no disponible"}</p><Button size="sm" variant="outline" onClick={() => void cargarValorUdi()}>Reintentar</Button></div>}
              </div>
            )}

            <div className="space-y-2">
              <Label>{tipoAccion === "cancelar" ? "Motivo de cancelación *" : tipoAccion === "anular-pago" ? "Motivo de anulación *" : "Notas adicionales"}</Label>
              <Textarea
                placeholder={tipoAccion === "pagada" 
                  ? "Ej: Referencia de transferencia, número de cheque..."
                  : tipoAccion === "anular-pago" ? "Ej: Pago marcado por error..." : "Ej: Cliente ya no requiere el servicio..."}
                value={motivoAccion}
                onChange={(e) => setMotivoAccion(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            {tipoAccion === "pagada" && (
              <div className="space-y-2">
                <Label>Comprobante de Pago (opcional)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setComprobante(e.target.files?.[0] || null)}
                    className="text-xs"
                  />
                  <Upload className="w-4 h-4 text-muted-foreground" />
                </div>
                {comprobante && <p className="text-xs text-green-600">✓ {comprobante.name}</p>}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setModalAccion(false)}>
              Cerrar
            </Button>
            <Button 
              onClick={ejecutarAccion}
              className={tipoAccion === "pagada" ? "bg-green-600 hover:bg-green-700" : ""}
              variant={tipoAccion === "cancelar" || tipoAccion === "anular-pago" ? "destructive" : "default"}
            >
              {tipoAccion === "pagada" ? "Confirmar pago" : tipoAccion === "anular-pago" ? "Anular pago" : "Cancelar póliza"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  )
}

export default function PolizasPendientesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
      <PolizasPendientesContent />
    </Suspense>
  )
}
