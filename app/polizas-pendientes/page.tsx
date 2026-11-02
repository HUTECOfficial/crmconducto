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
import { AlertCircle, DollarSign, TrendingDown, MessageSquare, Edit2, Check, X, Upload, Clock, FileText, Ban } from "lucide-react"
import { useState, useEffect, useMemo, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSupabase, type Cliente, type PagoPoliza, type Poliza } from "@/contexts/supabase-context"
import { addMonthsDateOnly, formatDateOnly, todayDateOnly } from "@/lib/date-only"
import { reciboPorCobrar } from "@/lib/payment-schedule"
import { ESTATUS_EN_COBRANZA, ETIQUETA_ESTATUS_COBRANZA, compararPorVencimiento, polizaEnCobranza, situacionCobranzaPoliza, type EstatusEnCobranza, type NivelSemaforo, type SituacionCobranzaPoliza } from "@/lib/cobranza"
import { ORDEN_SEMAFORO, SEMAFORO, SemaforoPill } from "@/components/semaforo-cobranza"
import { obtenerValorUdi } from "@/lib/udi"
import { etiquetaRamo } from "@/lib/ramos"
import { ETIQUETA_RENOVACION, situacionRenovacion } from "@/lib/renovaciones"

type FiltroCobranza = "pendientes" | "por_validar" | "vencidas" | "pagadas" | "todas"
type FiltroEstatus = "todas" | EstatusEnCobranza
type TipoAccion = "pagada" | "validar" | "cancelar" | "anular-pago" | "vencida"

function formatearMonto(monto: number) {
  return monto.toLocaleString("es-MX", { maximumFractionDigits: 2 })
}

/** Minúsculas y sin acentos, para que "gomez" encuentre "Gómez". */
function normalizarBusqueda(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
}

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

/** Número de WhatsApp del cliente en formato internacional (52 + 10 dígitos). */
function whatsappCliente(cliente?: Cliente) {
  if (!cliente) return null
  const telefonos = cliente.telefonos || []
  const numero = telefonos.find(item => item.canal === "whatsapp" && item.principal)?.numero
    || telefonos.find(item => item.canal === "whatsapp")?.numero
    || telefonos.find(item => item.principal)?.numero
    || cliente.telefono
  const digitos = (numero || "").replace(/\D/g, "")
  if (digitos.length === 10) return `52${digitos}`
  if (digitos.length >= 12 && digitos.startsWith("52")) return digitos
  return null
}

function mensajeRechazo(numero: 1 | 2, cliente: Cliente | undefined, poliza: Poliza, recibo: PagoPoliza, compania?: string) {
  const intento = numero === 1 ? "fue rechazado" : "fue rechazado por segunda ocasión"
  return `Hola ${cliente?.nombre || poliza.nombreAsegurado || ""}, te informamos que el cargo del recibo ${recibo.numeroRecibo}/${recibo.totalRecibos} de tu póliza ${poliza.numeroPoliza}${compania ? ` (${compania})` : ""} por ${formatearMonto(recibo.monto)} ${recibo.moneda} ${intento}.

Para que tu póliza no pierda vigencia, por favor verifica tu método de pago o comunícate con nosotros para realizar el pago antes del ${formatDateOnly(recibo.fechaLimite)}.

¡Gracias!`
}

const MESES_POR_FORMA_PAGO: Record<string, number> = { mensual: 1, trimestral: 3, semestral: 6, anual: 12 }

/** Periodo que cubre el recibo en curso: empieza en su fecha de emisión y dura según la forma de pago. */
function periodoRecibo(poliza: Poliza, recibo?: PagoPoliza) {
  if (!recibo?.fechaEmision) return { inicio: poliza.vigenciaInicio, fin: undefined }
  const meses = MESES_POR_FORMA_PAGO[poliza.formaPago] ?? 12
  return { inicio: recibo.fechaEmision, fin: addMonthsDateOnly(recibo.fechaEmision, meses) }
}

/** Recordatorios del recibo en curso; los de un recibo anterior ya no se muestran. */
function recordatoriosDelRecibo(poliza: Poliza, recibo?: PagoPoliza) {
  const fechas = poliza.fechasRecordatorio
  if (!fechas) return {}
  if (fechas.reciboId && recibo && fechas.reciboId !== recibo.id) return {}
  return fechas
}

function RechazoBancarioBadge({ poliza }: { poliza: Poliza }) {
  if (poliza.estatus !== "rechazo-bancario") return null
  return (
    <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
      <Ban className="h-3 w-3" aria-hidden />Rechazo bancario
    </span>
  )
}

/** Muestra la renovación sólo cuando está próxima, vencida sin renovar o en proceso. */
function EstadoRenovacionBadge({ poliza }: { poliza: Poliza }) {
  const renovacion = situacionRenovacion(poliza)
  if (!renovacion.generaAviso && renovacion.estado !== "en_proceso") return null
  return (
    <p className="mt-1 text-[11px] font-medium text-blue-700 dark:text-blue-300">
      {ETIQUETA_RENOVACION[renovacion.estado]}{renovacion.estado === "pendiente" ? ` (${renovacion.dias} días)` : ""}
    </p>
  )
}

function PolizasPendientesContent() {
  const searchParams = useSearchParams()
  const { polizas, clientes, companias, pagos, usuariosSistema, registrarPago, validarPago, anularPago, actualizarPoliza, marcarComoVencido } = useSupabase()

  const [filtroCobranza, setFiltroCobranza] = useState<FiltroCobranza>("pendientes")
  const [filtroEstatus, setFiltroEstatus] = useState<FiltroEstatus>("todas")
  const [filtroSemaforo, setFiltroSemaforo] = useState<NivelSemaforo | "todos">("todos")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [busqueda, setBusqueda] = useState("")
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [comentarioTemp, setComentarioTemp] = useState("")
  const [verComentarioId, setVerComentarioId] = useState<string | null>(null)

  // Estados para modales de acción
  const [modalAccion, setModalAccion] = useState(false)
  const [polizaAccion, setPolizaAccion] = useState<Poliza | null>(null)
  const [reciboAccion, setReciboAccion] = useState<PagoPoliza | null>(null)
  const [tipoAccion, setTipoAccion] = useState<TipoAccion | null>(null)
  const [motivoAccion, setMotivoAccion] = useState("")
  const [referenciaAccion, setReferenciaAccion] = useState("")
  const [tipoPagoAccion, setTipoPagoAccion] = useState<"efectivo" | "transferencia" | "tarjeta" | "domiciliacion" | "cheque" | "">("")
  const [valorUdiAccion, setValorUdiAccion] = useState("")
  const [fechaValorUdiAccion, setFechaValorUdiAccion] = useState("")
  const [cargandoUdi, setCargandoUdi] = useState(false)
  const [errorUdi, setErrorUdi] = useState("")
  const [comprobante, setComprobante] = useState<File | null>(null)
  const [fechaPagoAccion, setFechaPagoAccion] = useState(todayDateOnly())
  const [guardando, setGuardando] = useState(false)
  const [valorUdiHoy, setValorUdiHoy] = useState<number | null>(null)
  // Registrar pago pide revisar y confirmar los datos antes de guardarlos.
  const [confirmandoPago, setConfirmandoPago] = useState(false)

  // El valor UDI aplicado es el de la fecha de pago.
  const fechaUdiSolicitada = useRef("")
  const cargarValorUdi = async (fecha: string) => {
    fechaUdiSolicitada.current = fecha
    setCargandoUdi(true)
    setErrorUdi("")
    setValorUdiAccion("")
    setFechaValorUdiAccion("")
    try {
      const udi = await obtenerValorUdi(fecha)
      // Ignora respuestas de una fecha que el usuario ya cambió.
      if (fechaUdiSolicitada.current === fecha) {
        setValorUdiAccion(udi.valor.toString())
        setFechaValorUdiAccion(fecha)
      }
    } catch (error: any) {
      if (fechaUdiSolicitada.current === fecha) setErrorUdi(error.message || "No fue posible consultar el valor UDI")
    } finally {
      if (fechaUdiSolicitada.current === fecha) setCargandoUdi(false)
    }
  }

  // Aplicar filtro desde URL si viene de dashboard
  useEffect(() => {
    const filtro = searchParams.get("filtro")
    if (filtro === "vencidas") setFiltroCobranza("vencidas")
    if (filtro === "por-validar") setFiltroCobranza("por_validar")
    if (filtro === "gracia") setFiltroEstatus("gracia")
    if (filtro === "por-renovar") setFiltroEstatus("por-renovar")
  }, [searchParams])

  const hoy = todayDateOnly()
  const hayUdis = polizas.some(poliza => poliza.divisas === "UDIS")

  useEffect(() => {
    if (!hayUdis) return
    obtenerValorUdi().then(udi => setValorUdiHoy(udi.valor)).catch(() => setValorUdiHoy(null))
  }, [hayUdis])

  // La cobranza se calcula desde los recibos de cada póliza, no desde prima emitida - cobrada.
  const filasBase = useMemo(() => polizas
    .filter(poliza => polizaEnCobranza(poliza.estatus))
    .map(poliza => {
      const recibos = pagos.filter(pago => pago.polizaId === poliza.id)
      const situacion = situacionCobranzaPoliza(recibos, {
        primaTotal: Number(poliza.primaEmitida || poliza.prima || 0),
        primaCobrada: Number(poliza.primaCobrada || 0),
        fechaVencimiento: poliza.ultimoDiaPago || poliza.vigenciaFin,
      }, hoy)
      return { poliza, recibos, situacion }
    }), [polizas, pagos, hoy])

  // Texto buscable de cada póliza: número, cliente (nombre, teléfono, correo, RFC), asegurado,
  // aseguradora, ramo y grupo.
  const coincideBusqueda = useMemo(() => {
    const terminos = normalizarBusqueda(busqueda).split(/\s+/).filter(Boolean)
    if (terminos.length === 0) return () => true
    const clientesPorId = new Map(clientes.map(cliente => [cliente.id, cliente]))
    const companiasPorId = new Map(companias.map(compania => [compania.id, compania.nombre]))
    return (poliza: Poliza) => {
      const cliente = clientesPorId.get(poliza.clienteId)
      const telefonos = [cliente?.telefono, ...(cliente?.telefonos || []).map(telefono => telefono.numero)].filter(Boolean) as string[]
      const texto = normalizarBusqueda([
        poliza.numeroPoliza,
        cliente?.nombre,
        // También sin espacios ni guiones, para encontrar "5512345678" aunque se guardó "55 1234-5678".
        ...telefonos,
        ...telefonos.map(telefono => telefono.replace(/\D/g, "")),
        cliente?.email,
        cliente?.rfc,
        poliza.nombreAsegurado,
        companiasPorId.get(poliza.companiaId),
        etiquetaRamo(poliza.ramo),
        poliza.grupo,
      ].filter(Boolean).join(" "))
      return terminos.every(termino => texto.includes(termino))
    }
  }, [busqueda, clientes, companias])

  const filas = useMemo(() => filasBase
    .filter(({ poliza, situacion }) => {
      if (!coincideBusqueda(poliza)) return false
      if (filtroEstatus !== "todas" && poliza.estatus !== filtroEstatus) return false
      // Cada filtro muestra sólo su estado: "Pendientes" no incluye vencidas ni por validar.
      if (filtroCobranza === "pendientes" && situacion.estado !== "pendiente") return false
      if (filtroCobranza === "por_validar" && situacion.porValidar === 0) return false
      if (filtroCobranza === "vencidas" && situacion.estado !== "vencida") return false
      if (filtroCobranza === "pagadas" && situacion.estado !== "pagada") return false
      if (filtroSemaforo !== "todos" && situacion.semaforo !== filtroSemaforo) return false
      if (fechaDesde && (!situacion.fechaVencimiento || situacion.fechaVencimiento < fechaDesde)) return false
      if (fechaHasta && (!situacion.fechaVencimiento || situacion.fechaVencimiento > fechaHasta)) return false
      return true
    })
    .sort((left, right) => compararPorVencimiento(left.situacion, right.situacion)), [filasBase, coincideBusqueda, filtroEstatus, filtroCobranza, filtroSemaforo, fechaDesde, fechaHasta])

  // Coincidencias que los filtros actuales esconden (p. ej. una vencida buscando en "Pendientes").
  const coincidenciasOcultas = busqueda.trim()
    ? filasBase.filter(({ poliza }) => coincideBusqueda(poliza)).length - filas.length
    : 0

  const conteoSemaforo = useMemo(() => filasBase.reduce((acc, { situacion }) => {
    if (situacion.estado !== "pagada") acc[situacion.semaforo] = (acc[situacion.semaforo] || 0) + 1
    return acc
  }, {} as Partial<Record<NivelSemaforo, number>>), [filasBase])

  // Totales en MXN: los recibos UDIS cobrados usan su conversión guardada y el saldo,
  // el valor UDI de hoy (estimado).
  const totalesMxn = filas.reduce((acc, { poliza, recibos, situacion }) => {
    if (poliza.divisas !== "UDIS") {
      acc.pendiente += situacion.pendiente
      acc.porValidar += situacion.porValidar
      acc.cobrado += situacion.cobrado
      return acc
    }
    const convertido = (estatus: string) => recibos.filter(item => item.estatus === estatus).reduce((sum, item) => sum + (item.montoMxn ?? 0), 0)
    acc.cobrado += convertido("pagado")
    acc.porValidar += convertido("por_validar")
    if (valorUdiHoy) acc.pendiente += situacion.pendiente * valorUdiHoy
    else if (situacion.pendiente > 0) acc.udisSinConvertir += situacion.pendiente
    return acc
  }, { pendiente: 0, porValidar: 0, cobrado: 0, udisSinConvertir: 0 })
  const totalPendiente = totalesMxn.pendiente
  const totalPorValidar = totalesMxn.porValidar
  const totalCobrado = totalesMxn.cobrado
  const totalEmitido = totalPendiente + totalPorValidar + totalCobrado
  const filtrosActivos = filtroCobranza !== "pendientes" || filtroEstatus !== "todas" || filtroSemaforo !== "todos" || !!fechaDesde || !!fechaHasta || !!busqueda.trim()

  const limpiarFiltros = () => {
    setFiltroCobranza("pendientes")
    setFiltroEstatus("todas")
    setFiltroSemaforo("todos")
    setFechaDesde("")
    setFechaHasta("")
    setBusqueda("")
  }

  // Deja sólo la búsqueda para ver todas sus coincidencias.
  const verTodasLasCoincidencias = () => {
    setFiltroCobranza("todas")
    setFiltroEstatus("todas")
    setFiltroSemaforo("todos")
    setFechaDesde("")
    setFechaHasta("")
  }

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

  const reciboParaAccion = (poliza: Poliza, tipo: TipoAccion): PagoPoliza | null => {
    const recibos = pagos.filter(pago => pago.polizaId === poliza.id)
    if (tipo === "pagada") {
      return recibos.filter(reciboPorCobrar).sort((left, right) => left.fechaLimite.localeCompare(right.fechaLimite))[0] ?? null
    }
    if (tipo === "validar") {
      return recibos.filter(pago => pago.estatus === "por_validar").sort((left, right) => left.numeroRecibo - right.numeroRecibo)[0] ?? null
    }
    if (tipo === "anular-pago") {
      return recibos.filter(pago => pago.estatus === "pagado").sort((left, right) => right.numeroRecibo - left.numeroRecibo)[0] ?? null
    }
    return null
  }

  const abrirModalAccion = (poliza: Poliza, tipo: TipoAccion) => {
    const recibo = reciboParaAccion(poliza, tipo)
    if (tipo !== "cancelar" && tipo !== "vencida" && !recibo) {
      toast.error(
        tipo === "pagada" ? "Esta póliza no tiene recibos pendientes generados."
          : tipo === "validar" ? "La póliza no tiene pagos por validar"
            : "La póliza no tiene recibos pagados para anular",
      )
      return
    }
    setPolizaAccion(poliza)
    setReciboAccion(recibo)
    setTipoAccion(tipo)
    setMotivoAccion("")
    setReferenciaAccion("")
    setTipoPagoAccion("")
    setValorUdiAccion("")
    setErrorUdi("")
    setFechaPagoAccion(todayDateOnly())
    if (tipo === "pagada" && recibo?.moneda === "UDIS") void cargarValorUdi(todayDateOnly())
    setComprobante(null)
    setConfirmandoPago(false)
    setModalAccion(true)
  }

  const cerrarModal = () => {
    setModalAccion(false)
    setPolizaAccion(null)
    setReciboAccion(null)
    setTipoAccion(null)
    setMotivoAccion("")
    setReferenciaAccion("")
    setTipoPagoAccion("")
    setValorUdiAccion("")
    setComprobante(null)
    setConfirmandoPago(false)
  }

  const ejecutarAccion = async (rechazar = false) => {
    if (!polizaAccion || !tipoAccion) return
    if (tipoAccion === "pagada" && !tipoPagoAccion) {
      toast.error("Seleccione el tipo de pago")
      return
    }
    if (tipoAccion === "pagada" && !fechaPagoAccion) {
      toast.error("Indique la fecha de pago")
      return
    }
    if ((tipoAccion === "cancelar" || tipoAccion === "anular-pago" || tipoAccion === "vencida" || rechazar) && !motivoAccion.trim()) {
      toast.error(tipoAccion === "cancelar" ? "El motivo de cancelación es obligatorio"
        : tipoAccion === "vencida" ? "Escribe la justificación de por qué se marca como vencida"
          : rechazar ? "Indique el motivo del rechazo" : "El motivo de anulación es obligatorio")
      return
    }
    if (tipoAccion === "pagada" && reciboAccion?.moneda === "UDIS" && (!valorUdiAccion || Number(valorUdiAccion) <= 0 || fechaValorUdiAccion !== fechaPagoAccion)) {
      toast.error("Falta el valor UDI de la fecha de pago; espera a que cargue o reintenta")
      return
    }
    if (tipoAccion === "pagada" && !confirmandoPago) {
      setConfirmandoPago(true)
      return
    }

    setGuardando(true)
    try {
      if (tipoAccion === "pagada" && reciboAccion) {
        await registrarPago(reciboAccion.id, {
          metodoPago: tipoPagoAccion,
          fechaPago: fechaPagoAccion,
          referencia: referenciaAccion.trim() || undefined,
          notas: motivoAccion.trim() || undefined,
          valorUdi: reciboAccion.moneda === "UDIS" ? Number(valorUdiAccion) : undefined,
          fechaValorUdi: reciboAccion.moneda === "UDIS" ? fechaValorUdiAccion : undefined,
          comprobante,
        })
      } else if (tipoAccion === "validar" && reciboAccion) {
        if (rechazar) await anularPago(reciboAccion.id, motivoAccion.trim())
        else await validarPago(reciboAccion.id)
      } else if (tipoAccion === "anular-pago" && reciboAccion) {
        await anularPago(reciboAccion.id, motivoAccion.trim())
      } else if (tipoAccion === "vencida") {
        await marcarComoVencido(polizaAccion.id, motivoAccion)
      } else if (tipoAccion === "cancelar") {
        const fecha = new Date().toLocaleDateString('es-MX')
        const comentarioNuevo = polizaAccion.comentarios
          ? `${polizaAccion.comentarios}\n[${fecha}] CANCELADA: ${motivoAccion}`
          : `[${fecha}] CANCELADA: ${motivoAccion}`
        await actualizarPoliza(polizaAccion.id, {
          estatus: "cancelada",
          cancelacionMotivo: "cliente",
          comentarios: comentarioNuevo,
        })
      }
      cerrarModal()
    } catch (error: any) {
      // actualizarPoliza ya notifica sus propios errores.
      if (tipoAccion !== "cancelar" && tipoAccion !== "vencida") toast.error(error.message || "No fue posible completar la acción")
    } finally {
      setGuardando(false)
    }
  }

  const marcarRecordatorio = async (polizaId: string, numRecordatorio: 1 | 2 | 3, recibo?: PagoPoliza) => {
    const poliza = polizas.find(p => p.id === polizaId)
    if (!poliza) return
    const actuales = poliza.fechasRecordatorio || {}
    // Los recordatorios se llevan por recibo: al pasar al siguiente recibo empiezan de cero.
    const delRecibo = recordatoriosDelRecibo(poliza, recibo)
    await actualizarPoliza(polizaId, {
      fechasRecordatorio: {
        rechazo: actuales.rechazo,
        fecha1: delRecibo.fecha1,
        fecha2: delRecibo.fecha2,
        fecha3: delRecibo.fecha3,
        reciboId: recibo?.id ?? actuales.reciboId,
        [`fecha${numRecordatorio}`]: hoy,
      }
    })
    toast.success(`Recordatorio ${numRecordatorio} registrado`)
  }

  // Rechazo del cargo (tarjeta o domiciliación) del recibo actual: se registra la fecha y se
  // abre WhatsApp con el aviso para el cliente.
  const marcarRechazo = async (poliza: Poliza, recibo: PagoPoliza, numero: 1 | 2) => {
    const cliente = clientes.find(item => item.id === poliza.clienteId)
    const telefono = whatsappCliente(cliente)
    const compania = companias.find(item => item.id === poliza.companiaId)?.nombre
    // La ventana se abre antes de guardar para que el navegador no la bloquee.
    const ventana = telefono ? window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(mensajeRechazo(numero, cliente, poliza, recibo, compania))}`, "_blank") : null
    const actuales = poliza.fechasRecordatorio || {}
    const rechazoActual = actuales.rechazo?.reciboId === recibo.id ? actuales.rechazo : { reciboId: recibo.id }
    const hoy = todayDateOnly()
    const fecha = new Date().toLocaleDateString("es-MX")
    const linea = `[${fecha}] RECHAZO ${numero} del cargo del recibo ${recibo.numeroRecibo}/${recibo.totalRecibos}${telefono ? " · aviso enviado al cliente por WhatsApp" : ""}`
    try {
      await actualizarPoliza(poliza.id, {
        // El rechazo del banco pone la póliza en estatus "Rechazo bancario" hasta que se valide un pago.
        estatus: "rechazo-bancario",
        fechasRecordatorio: { ...actuales, rechazo: { ...rechazoActual, [`fecha${numero}`]: hoy } },
        comentarios: poliza.comentarios ? `${poliza.comentarios}\n${linea}` : linea,
      })
      if (telefono) toast.success(`Rechazo ${numero} registrado. Envía el mensaje en WhatsApp para notificar al cliente.`)
      else toast.warning(`Rechazo ${numero} registrado, pero el cliente no tiene un teléfono válido para avisarle por WhatsApp.`)
    } catch {
      ventana?.close()
    }
  }

  const botonesRechazo = (poliza: Poliza, recibo: PagoPoliza, compacto: boolean) => {
    const rechazo = poliza.fechasRecordatorio?.rechazo?.reciboId === recibo.id ? poliza.fechasRecordatorio.rechazo : undefined
    return (
      <div className="flex w-full gap-2">
        {([1, 2] as const).map(numero => {
          const fecha = rechazo?.[`fecha${numero}` as const]
          return fecha ? (
            <span key={numero} className={`${compacto ? "flex-1" : ""} inline-flex h-8 items-center justify-center whitespace-nowrap rounded-md border border-red-300 bg-red-50 px-2 text-[11px] font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300`}>
              Rechazo {numero} · {formatDateOnly(fecha)}
            </span>
          ) : (
            <Button key={numero} size="sm" variant="outline" disabled={numero === 2 && !rechazo?.fecha1}
              title={numero === 2 && !rechazo?.fecha1 ? "Primero registra el rechazo 1" : "Registra el rechazo del cargo y avisa al cliente por WhatsApp"}
              className="flex-1 h-8 text-xs whitespace-nowrap border-red-300 text-red-700 hover:bg-red-50 dark:text-red-300"
              onClick={() => void marcarRechazo(poliza, recibo, numero)}>
              <Ban className="w-3 h-3 mr-1" />Rechazo {numero}
            </Button>
          )
        })}
      </div>
    )
  }

  const botonesCobranza = (poliza: Poliza, situacion: SituacionCobranzaPoliza<PagoPoliza>, compacto = false) => {
    const clase = "w-full h-8 text-xs whitespace-nowrap"
    const recibo = situacion.reciboActual
    const porCobrar = recibo && reciboPorCobrar(recibo)
    return (
      <div className={`flex flex-col gap-2 ${compacto ? "w-full" : "min-w-[190px]"}`}>
        {situacion.porValidar > 0 && (
          <Button size="sm" className={`${clase} bg-purple-600 hover:bg-purple-700 text-white`} onClick={() => abrirModalAccion(poliza, "validar")}>
            <Clock className="w-3 h-3 mr-1" />Validar pago
          </Button>
        )}
        {porCobrar && recibo ? (
          <>
            <Button size="sm" className={`${clase} bg-green-600 hover:bg-green-700`} onClick={() => abrirModalAccion(poliza, "pagada")}>
              ✓ Registrar pago
            </Button>
            {botonesRechazo(poliza, recibo, compacto)}
          </>
        ) : situacion.estado === "pagada" && situacion.tieneRecibos ? (
          <Button size="sm" variant="outline" className={`${clase} border-green-600 text-green-600`} onClick={() => abrirModalAccion(poliza, "anular-pago")}>
            Anular último pago
          </Button>
        ) : !situacion.tieneRecibos && situacion.pendiente > 0 ? (
          <span className="text-xs font-medium text-red-600">Sin recibos generados</span>
        ) : null}
        <div className="flex w-full gap-2">
          <Button size="sm" variant="outline" className="flex-1 h-8 text-xs whitespace-nowrap text-red-600 border-red-400 hover:bg-red-50" onClick={() => abrirModalAccion(poliza, "vencida")}>
            Marcar vencida
          </Button>
          <Button size="sm" variant="destructive" className="flex-1 h-8 text-xs whitespace-nowrap" onClick={() => abrirModalAccion(poliza, "cancelar")}>
            Cancelar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="main-content-aligned">
          <PageHeader
            title="Facturación · Pólizas pendientes de pago"
            subtitle="Gestión y seguimiento de cobranza"
            searchValue={busqueda}
            onSearchChange={setBusqueda}
            searchPlaceholder="Buscar póliza, cliente, teléfono, aseguradora... (⌘K)"
          />

          {coincidenciasOcultas > 0 && (
            <div className="-mt-4 mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>
                {coincidenciasOcultas === 1 ? "Hay 1 póliza más" : `Hay ${coincidenciasOcultas} pólizas más`} que coincide{coincidenciasOcultas === 1 ? "" : "n"} con "{busqueda.trim()}" en otros filtros.
              </span>
              <Button variant="link" size="sm" className="h-auto p-0" onClick={verTodasLasCoincidencias}>Ver todas</Button>
            </div>
          )}

          {/* KPIs Principales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
              <GlassCard className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-xl bg-blue-500/10">
                    <AlertCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">PÓLIZAS EN LISTA</p>
                </div>
                <p className="text-2xl font-bold">{filas.length}</p>
              </GlassCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <GlassCard className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">PRIMA COBRADA (VALIDADA)</p>
                </div>
                <p className="text-2xl font-bold text-emerald-600">${formatearMonto(totalCobrado)}</p>
              </GlassCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <GlassCard className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-xl bg-purple-500/10">
                    <Clock className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">POR VALIDAR</p>
                </div>
                <p className="text-2xl font-bold text-purple-600">${formatearMonto(totalPorValidar)}</p>
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
                <p className="text-2xl font-bold text-red-600">${formatearMonto(totalPendiente)}</p>
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
                style={{ width: `${totalEmitido > 0 ? Math.min(100, (totalCobrado / totalEmitido) * 100) : 0}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Prima emitida de la lista: ${formatearMonto(totalEmitido)} MXN
              {hayUdis && (valorUdiHoy ? ` · saldos en UDIS convertidos con UDI de hoy ${valorUdiHoy.toFixed(6)}` : "")}
              {totalesMxn.udisSinConvertir > 0 && ` · ${formatearMonto(totalesMxn.udisSinConvertir)} UDIS pendientes sin convertir (UDI no disponible)`}
            </p>
          </GlassCard>

          {/* Filtros */}
          <GlassCard className="p-4 mb-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Estado de cobranza:</p>
                <div className="flex gap-2 flex-wrap">
                  {([
                    ["pendientes", "Pendientes"],
                    ["por_validar", "Por validar"],
                    ["vencidas", "Vencidas"],
                    ["pagadas", "✓ Pagadas"],
                    ["todas", "Todas"],
                  ] as Array<[FiltroCobranza, string]>).map(([valor, label]) => (
                    <button
                      key={valor}
                      onClick={() => setFiltroCobranza(valor)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                        filtroCobranza === valor
                          ? "bg-blue-600 text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Semáforo:</p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setFiltroSemaforo("todos")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filtroSemaforo === "todos" ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  >
                    Todos
                  </button>
                  {ORDEN_SEMAFORO.map(nivel => (
                    <button
                      key={nivel}
                      onClick={() => setFiltroSemaforo(nivel)}
                      title={SEMAFORO[nivel].detalle}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filtroSemaforo === nivel ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${SEMAFORO[nivel].punto}`} aria-hidden />
                      {SEMAFORO[nivel].label}
                      <span className="text-xs opacity-70">{conteoSemaforo[nivel] || 0}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Estatus de la póliza</Label>
                  <Select value={filtroEstatus} onValueChange={(value: FiltroEstatus) => setFiltroEstatus(value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      {ESTATUS_EN_COBRANZA.map(estatus => <SelectItem key={estatus} value={estatus}>{ETIQUETA_ESTATUS_COBRANZA[estatus]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Vence desde</Label>
                  <Input type="date" value={fechaDesde} onChange={event => setFechaDesde(event.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Vence hasta</Label>
                  <Input type="date" value={fechaHasta} onChange={event => setFechaHasta(event.target.value)} />
                </div>
                <Button variant="outline" disabled={!filtrosActivos} onClick={limpiarFiltros}>Limpiar filtros</Button>
              </div>
            </div>
          </GlassCard>

          {/* Tabla de Pólizas Pendientes - Desktop */}
          <GlassCard className="overflow-hidden hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-900 text-white">
                    <th className="p-3 text-left font-bold border-r border-zinc-700">VENCE EN</th>
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
                  {filas.map(({ poliza, situacion }, index) => {
                    const cliente = clientes.find(c => c.id === poliza.clienteId)
                    const compania = companias.find(c => c.id === poliza.companiaId)
                    const recibo = situacion.reciboActual
                    const primaRecibo = recibo?.monto ?? obtenerPrimaRecibo(poliza)
                    const periodo = periodoRecibo(poliza, recibo)
                    const recordatorios = recordatoriosDelRecibo(poliza, recibo)
                    const celda = "p-4 border-r border-border/40 align-top"

                    return (
                      <motion.tr
                        key={poliza.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(index * 0.02, 0.4) }}
                        className={`${SEMAFORO[situacion.semaforo].fila} border-b border-border/40 transition-colors align-top`}
                      >
                        <td className={celda}>
                          <SemaforoPill situacion={situacion} />
                          <RechazoBancarioBadge poliza={poliza} />
                          <EstadoRenovacionBadge poliza={poliza} />
                        </td>
                        <td className={`${celda} font-mono font-bold`}>
                          {poliza.numeroPoliza}
                        </td>
                        <td className={celda}>
                          {poliza.incisoEndoso || "-"}
                        </td>
                        <td className={celda}>
                          <Badge
                            variant="outline"
                            style={{ borderColor: compania?.color, color: compania?.color }}
                          >
                            {compania?.nombre || poliza.companiaId.toUpperCase()}
                          </Badge>
                        </td>
                        <td className={`${celda} capitalize font-medium`}>
                          {etiquetaRamo(poliza.ramo)}
                          {poliza.grupo && <p className="text-xs font-normal text-muted-foreground">{poliza.grupo}</p>}
                        </td>
                        <td className={celda}>
                          <p className="font-medium">{poliza.nombreAsegurado || cliente?.nombre}</p>
                        </td>
                        <td className={`${celda} font-medium`}>
                          {formatDateOnly(periodo.inicio)}
                          {periodo.fin && <p className="text-xs font-normal text-muted-foreground">al {formatDateOnly(periodo.fin)} · <span className="capitalize">{poliza.formaPago}</span></p>}
                        </td>
                        <td className={`${celda} font-medium`}>
                          {situacion.fechaVencimiento ? formatDateOnly(situacion.fechaVencimiento) : "—"}
                        </td>
                        <td className={`${celda} text-center`}>
                          {recibo ? `${recibo.numeroRecibo}/${recibo.totalRecibos}` : poliza.numeroRecibo || "1/1"}
                          {recibo?.estatus === "por_validar" && <p className="text-[10px] font-semibold text-purple-700 dark:text-purple-300">por validar</p>}
                        </td>
                        <td className={`${celda} font-bold text-right`}>
                          {formatearMonto(primaRecibo)} {recibo?.moneda && recibo.moneda !== "MXN" ? recibo.moneda : ""}
                          {recibo?.moneda === "UDIS" && (recibo.montoMxn != null && recibo.estatus === "por_validar"
                            ? <p className="text-xs font-normal text-muted-foreground">${formatearMonto(recibo.montoMxn)} MXN</p>
                            : valorUdiHoy ? <p className="text-xs font-normal text-muted-foreground">≈ ${formatearMonto(recibo.monto * valorUdiHoy)} MXN hoy</p> : null)}
                        </td>
                        <td className={`${celda} text-center`}>
                          {poliza.registroSistemaCobranza ? (
                            <span className="text-green-600 font-bold">SÍ</span>
                          ) : (
                            <span className="text-muted-foreground">NO</span>
                          )}
                        </td>
                        {([1, 2, 3] as const).map(num => {
                          const fecha = recordatorios[`fecha${num}` as const]
                          return (
                            <td key={num} className={`${celda} text-center`}>
                              {fecha ? (
                                <span className={`text-xs font-medium ${num === 1 ? "text-green-600" : num === 2 ? "text-yellow-600" : "text-red-600"}`}>
                                  {formatDateOnly(fecha)}
                                </span>
                              ) : (
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => marcarRecordatorio(poliza.id, num, recibo)}>
                                  Marcar
                                </Button>
                              )}
                            </td>
                          )
                        })}
                        <td className={`${celda} max-w-[220px]`}>
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
                                <WhatsAppReminderButton poliza={poliza} montoPendiente={situacion.pendiente} />
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-center align-top">
                          {botonesCobranza(poliza, situacion)}
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
            {filas.map(({ poliza, situacion }, index) => {
              const cliente = clientes.find(c => c.id === poliza.clienteId)
              const compania = companias.find(c => c.id === poliza.companiaId)
              const recibo = situacion.reciboActual
              const primaRecibo = recibo?.monto ?? obtenerPrimaRecibo(poliza)
              const periodo = periodoRecibo(poliza, recibo)
              const recordatorios = recordatoriosDelRecibo(poliza, recibo)

              return (
                <motion.div
                  key={poliza.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.4) }}
                >
                  <GlassCard className={`p-4 border ${SEMAFORO[situacion.semaforo].card}`}>
                    {/* Header de la card */}
                    <div className="flex items-start justify-between gap-3 mb-3">
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
                        <SemaforoPill situacion={situacion} />
                        <RechazoBancarioBadge poliza={poliza} />
                          <EstadoRenovacionBadge poliza={poliza} />
                        <p className="mt-1 text-xs text-muted-foreground">Prima pendiente</p>
                        <p className="font-bold text-red-600">${formatearMonto(situacion.pendiente)}</p>
                      </div>
                    </div>

                    {/* Info del cliente */}
                    <div className="mb-3 pb-3 border-b border-border/50">
                      <p className="font-medium">{poliza.nombreAsegurado || cliente?.nombre}</p>
                      <p className="text-xs text-muted-foreground capitalize">{etiquetaRamo(poliza.ramo)}{poliza.grupo ? ` · ${poliza.grupo}` : ""} • {poliza.formaPago}</p>
                    </div>

                    {/* Detalles en grid */}
                    <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                      <div>
                        <p className="text-muted-foreground">Inicio de vigencia</p>
                        <p className="font-medium">{formatDateOnly(periodo.inicio)}</p>
                        {periodo.fin && <p className="text-muted-foreground">al {formatDateOnly(periodo.fin)} · <span className="capitalize">{poliza.formaPago}</span></p>}
                      </div>
                      <div>
                        <p className="text-muted-foreground">Último día pago</p>
                        <p className="font-medium">{situacion.fechaVencimiento ? formatDateOnly(situacion.fechaVencimiento) : "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground"># Recibo</p>
                        <p className="font-medium">
                          {recibo ? `${recibo.numeroRecibo}/${recibo.totalRecibos}` : poliza.numeroRecibo || "1/1"}
                          {recibo?.estatus === "por_validar" && <span className="ml-1 text-purple-700 dark:text-purple-300">(por validar)</span>}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Prima del recibo</p>
                        <p className="font-bold text-green-700">{formatearMonto(primaRecibo)} {recibo?.moneda || poliza.divisas || "MXN"}</p>
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
                      {([1, 2, 3] as const).map((num) => {
                        const fecha = recordatorios[`fecha${num}` as const]
                        return (
                          <button
                            key={num}
                            onClick={() => !fecha && marcarRecordatorio(poliza.id, num, recibo)}
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
                            <div className="flex-1 min-w-0">
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
                                setComentarioTemp("")
                              }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <WhatsAppReminderButton poliza={poliza} montoPendiente={situacion.pendiente} />
                          </>
                        )}
                      </div>

                      {/* Botones de acción */}
                      {botonesCobranza(poliza, situacion, true)}
                    </div>
                  </GlassCard>
                </motion.div>
              )
            })}
          </div>

          {filas.length === 0 && (
            <GlassCard className="p-8 text-center mt-6">
              <p className="text-muted-foreground text-lg">
                {filtrosActivos ? "No hay pólizas con estos filtros" : "✅ No hay pólizas pendientes de pago"}
              </p>
            </GlassCard>
          )}

          {/* Leyenda */}
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            {ORDEN_SEMAFORO.map(nivel => (
              <div key={nivel} className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${SEMAFORO[nivel].punto}`} aria-hidden />
                <span><span className="font-medium text-foreground">{SEMAFORO[nivel].label}</span> · {SEMAFORO[nivel].detalle}</span>
              </div>
            ))}
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
      <Dialog open={modalAccion} onOpenChange={open => { if (!open) cerrarModal() }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {tipoAccion === "pagada" ? (confirmandoPago ? "Valida los datos del pago" : "Registrar pago") : tipoAccion === "validar" ? "Validar pago" : tipoAccion === "anular-pago" ? "Anular último pago" : tipoAccion === "vencida" ? "Marcar póliza como vencida" : "Cancelar póliza"}
            </DialogTitle>
            <DialogDescription>
              {tipoAccion === "pagada"
                ? confirmandoPago
                  ? "Revisa que los datos sean correctos antes de registrar el pago. Después quedará pendiente de validar."
                  : "El pago quedará pendiente de validar hasta que se confirme"
                : tipoAccion === "vencida"
                  ? "La póliza saldrá de Pólizas pendientes de pago. Escribe por qué se marca como vencida."
                : tipoAccion === "validar"
                  ? "Revise los datos del pago. Al validarlo se refleja como cobrado en el recibo y en la cobranza"
                  : tipoAccion === "anular-pago"
                    ? "El último recibo pagado volverá a pendiente y la acción quedará en el historial"
                    : "Ingrese el motivo de cancelación proporcionado por el cliente"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {polizaAccion && (
              <div className="p-3 rounded-lg bg-muted space-y-1">
                <p className="text-sm font-semibold">{polizaAccion.numeroPoliza}</p>
                <p className="text-xs text-muted-foreground">
                  {clientes.find(c => c.id === polizaAccion.clienteId)?.nombre}
                  {reciboAccion && ` • Recibo ${reciboAccion.numeroRecibo}/${reciboAccion.totalRecibos} • ${formatearMonto(reciboAccion.monto)} ${reciboAccion.moneda}`}
                </p>
                {reciboAccion && <p className="text-xs text-muted-foreground">Fecha límite: {formatDateOnly(reciboAccion.fechaLimite)}</p>}
              </div>
            )}

            {tipoAccion === "validar" && reciboAccion && (
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-purple-200 dark:border-purple-900 p-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Fecha de pago</p><p className="font-medium">{reciboAccion.fechaPago ? formatDateOnly(reciboAccion.fechaPago) : "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Método</p><p className="font-medium capitalize">{reciboAccion.metodoPago || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Referencia</p><p className="font-medium">{reciboAccion.referencia || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Registró</p><p className="font-medium">{usuariosSistema.find(item => item.id === reciboAccion.registradoPor)?.nombre || "—"}</p></div>
                {reciboAccion.moneda === "UDIS" && (
                  <div className="col-span-2"><p className="text-xs text-muted-foreground">Conversión</p><p className="font-medium">{formatearMonto(reciboAccion.monto)} UDIS × {reciboAccion.valorUdi?.toFixed(6) ?? "—"} = ${formatearMonto(reciboAccion.montoMxn ?? 0)} MXN</p></div>
                )}
                {reciboAccion.notas && <div className="col-span-2"><p className="text-xs text-muted-foreground">Notas</p><p>{reciboAccion.notas}</p></div>}
                <div className="col-span-2">
                  {reciboAccion.comprobanteUrl ? (
                    <a href={reciboAccion.comprobanteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline">
                      <FileText className="w-4 h-4" />Ver comprobante
                    </a>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sin comprobante adjunto</p>
                  )}
                </div>
              </div>
            )}

            {tipoAccion === "pagada" && confirmandoPago && reciboAccion && (
              <div className="space-y-2 rounded-lg border border-green-300 bg-green-50/60 p-3 text-sm dark:border-green-900 dark:bg-green-950/20">
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-xs text-muted-foreground">Importe del recibo</p><p className="font-semibold">{formatearMonto(reciboAccion.monto)} {reciboAccion.moneda}</p></div>
                  <div><p className="text-xs text-muted-foreground">Fecha de pago</p><p className="font-medium">{formatDateOnly(fechaPagoAccion)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Tipo de pago</p><p className="font-medium capitalize">{tipoPagoAccion}</p></div>
                  <div><p className="text-xs text-muted-foreground">Referencia</p><p className="font-medium">{referenciaAccion.trim() || "—"}</p></div>
                  {reciboAccion.moneda === "UDIS" && (
                    <div className="col-span-2"><p className="text-xs text-muted-foreground">Conversión</p><p className="font-medium">{formatearMonto(reciboAccion.monto)} UDIS × {Number(valorUdiAccion).toFixed(6)} = ${(reciboAccion.monto * Number(valorUdiAccion)).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</p></div>
                  )}
                  {motivoAccion.trim() && <div className="col-span-2"><p className="text-xs text-muted-foreground">Notas</p><p>{motivoAccion.trim()}</p></div>}
                  <div className="col-span-2"><p className="text-xs text-muted-foreground">Comprobante</p><p className="font-medium">{comprobante ? comprobante.name : "Sin comprobante"}</p></div>
                </div>
              </div>
            )}

            {tipoAccion === "pagada" && !confirmandoPago && (
              <>
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
                <div className="space-y-2">
                  <Label>Fecha de pago *</Label>
                  <Input
                    type="date"
                    value={fechaPagoAccion}
                    max={todayDateOnly()}
                    onChange={event => {
                      const fecha = event.target.value
                      setFechaPagoAccion(fecha)
                      if (reciboAccion?.moneda !== "UDIS") return
                      if (fecha) void cargarValorUdi(fecha)
                      else {
                        fechaUdiSolicitada.current = ""
                        setValorUdiAccion("")
                        setFechaValorUdiAccion("")
                        setCargandoUdi(false)
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Referencia</Label>
                  <Input value={referenciaAccion} onChange={event => setReferenciaAccion(event.target.value)} placeholder="Folio de transferencia, número de cheque..." />
                </div>
              </>
            )}

            {tipoAccion === "pagada" && !confirmandoPago && reciboAccion?.moneda === "UDIS" && (
              <div className="space-y-2 rounded-lg bg-muted/40 p-3">
                <Label>Valor UDI al {formatDateOnly(fechaPagoAccion)} (Banco de México)</Label>
                {cargandoUdi ? <p className="text-sm text-muted-foreground">Consultando valor...</p> : valorUdiAccion ? <p className="text-sm">{formatearMonto(reciboAccion.monto)} UDIS × {Number(valorUdiAccion).toFixed(6)} = <span className="font-semibold">${(reciboAccion.monto * Number(valorUdiAccion)).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</span></p> : <div className="flex items-center gap-2"><p className="text-sm text-destructive">{errorUdi || "Valor no disponible"}</p><Button size="sm" variant="outline" onClick={() => void cargarValorUdi(fechaPagoAccion)}>Reintentar</Button></div>}
              </div>
            )}

            {tipoAccion !== null && !(tipoAccion === "pagada" && confirmandoPago) && (
              <div className="space-y-2">
                <Label>
                  {tipoAccion === "vencida" ? "Justificación *"
                    : tipoAccion === "cancelar" ? "Motivo de cancelación *"
                    : tipoAccion === "anular-pago" ? "Motivo de anulación *"
                      : tipoAccion === "validar" ? "Motivo (obligatorio sólo para rechazar)"
                        : "Notas adicionales"}
                </Label>
                <Textarea
                  placeholder={tipoAccion === "pagada"
                    ? "Ej: Pagó en ventanilla del banco..."
                    : tipoAccion === "validar" ? "Ej: El depósito no aparece en el estado de cuenta..."
                      : tipoAccion === "anular-pago" ? "Ej: Pago marcado por error..."
                        : tipoAccion === "vencida" ? "Ej: El cliente no pagó dentro del periodo de gracia y no respondió a los recordatorios..."
                          : "Ej: Cliente ya no requiere el servicio..."}
                  value={motivoAccion}
                  onChange={(e) => setMotivoAccion(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            )}

            {tipoAccion === "pagada" && !confirmandoPago && (
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

          <div className="flex flex-wrap justify-end gap-3">
            {tipoAccion === "pagada" && confirmandoPago ? (
              <Button variant="outline" disabled={guardando} onClick={() => setConfirmandoPago(false)}>
                Corregir datos
              </Button>
            ) : (
              <Button variant="outline" onClick={cerrarModal}>
                Cerrar
              </Button>
            )}
            {tipoAccion === "validar" && (
              <Button variant="destructive" disabled={guardando} onClick={() => void ejecutarAccion(true)}>
                Rechazar pago
              </Button>
            )}
            <Button
              disabled={guardando}
              onClick={() => void ejecutarAccion()}
              className={tipoAccion === "pagada" ? "bg-green-600 hover:bg-green-700" : tipoAccion === "validar" ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}
              variant={tipoAccion === "cancelar" || tipoAccion === "anular-pago" || tipoAccion === "vencida" ? "destructive" : "default"}
            >
              {guardando ? "Guardando..." : tipoAccion === "pagada" ? (confirmandoPago ? "Confirmar y registrar" : "Registrar pago") : tipoAccion === "validar" ? "Validar pago" : tipoAccion === "anular-pago" ? "Anular pago" : tipoAccion === "vencida" ? "Marcar como vencida" : "Cancelar póliza"}
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
