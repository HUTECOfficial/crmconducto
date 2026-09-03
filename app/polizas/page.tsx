"use client"

import { useState, useEffect, Suspense, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { PageHeader } from "@/components/page-header"
import { GlassCard } from "@/components/glass-card"
import { useSupabase, type Poliza as SPoliza } from "@/contexts/supabase-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { motion } from "framer-motion"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ProtectedRoute } from "@/components/protected-route"
import { EventoRapidoButton } from "@/components/evento-rapido-button"
import { Plus, FileText, UserPlus, User, Search, Edit2, X, RefreshCw, Trash2, MoreVertical, Loader2 } from "lucide-react"
import { PdfUploadZone } from "@/components/pdf-upload-zone"
import { VehiculoSelector } from "@/components/vehiculo-selector"
import { FlotillaUnidades } from "@/components/flotilla-unidades"
import type { VehiculoAxa } from "@/contexts/supabase-context"
import { formatDateOnly, todayDateOnly } from "@/lib/date-only"
import { calcularPrimaTotalPlazo, calcularVigenciasPoliza, estadoCobranzaRecibo, generarRecibos, resumirCobranza } from "@/lib/payment-schedule"
import { toast } from "sonner"

const ESTATUS_COLORS: Record<string, string> = {
  activa: "bg-green-500/10 text-green-500 border-green-500/20",
  "por-renovar": "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  renovada: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  vencida: "bg-red-500/10 text-red-500 border-red-500/20",
  cancelada: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  gracia: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  rehabilitada: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  vigente: "bg-green-500/10 text-green-600 border-green-500/20",
  "en-movimientos": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "cancelada-cliente": "bg-gray-500/10 text-gray-400 border-gray-500/20",
  "cancelada-falta-pago": "bg-red-500/10 text-red-400 border-red-500/20",
  "desvinculada-cobranza": "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  "espera-formato": "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  "en-proceso-renovacion": "bg-blue-500/10 text-blue-600 border-blue-500/20",
}

function getEstatusVisible(poliza: SPoliza) {
  if (poliza.renovacionEstado === "renovada" || poliza.estatus === "renovada") return "renovada"
  if (poliza.renovacionEstado === "en_proceso") return "en-proceso-renovacion"
  return poliza.estatus
}

function getEstatusLabel(estatus: string) {
  if (estatus === "renovada") return "Renovada"
  if (estatus === "en-proceso-renovacion") return "Renovación en proceso"
  return estatus.replaceAll("-", " ")
}

function PolizasContent() {
  const searchParams = useSearchParams()
  const {
    polizas, clientes, companias, usuariosSistema, pagos, historialPolizas,
    agregarPoliza, actualizarPoliza, agregarCliente,
    iniciarRenovacion, completarRenovacion, cancelarRenovacion,
  } = useSupabase()

  const [busqueda, setBusqueda] = useState("")
  const [filtroCompania, setFiltroCompania] = useState("todas")
  const [filtroRamo, setFiltroRamo] = useState("todos")
  const [filtroEstatus, setFiltroEstatus] = useState("activa")
  const [polizaSeleccionada, setPolizaSeleccionada] = useState<SPoliza | null>(null)
  const [modalNuevaPoliza, setModalNuevaPoliza] = useState(false)
  const [modalEditarPoliza, setModalEditarPoliza] = useState(false)
  const [polizaEditar, setPolizaEditar] = useState<SPoliza | null>(null)
  const [modoNuevoCliente, setModoNuevoCliente] = useState(true)
  const [modalRenovar, setModalRenovar] = useState(false)
  const [modalCancelar, setModalCancelar] = useState(false)
  const [modalCancelarRenovacion, setModalCancelarRenovacion] = useState(false)
  const [polizaAccion, setPolizaAccion] = useState<SPoliza | null>(null)
  const [polizaIdRenovando, setPolizaIdRenovando] = useState<string | null>(null)
  const [renovacionIdActiva, setRenovacionIdActiva] = useState<string | null>(null)
  const [motivoCancelacion, setMotivoCancelacion] = useState("")
  const [savingPoliza, setSavingPoliza] = useState(false)
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<VehiculoAxa | null>(null)

  // Autocompletar cliente
  const [busquedaCliente, setBusquedaCliente] = useState("")
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false)
  const clienteRef = useRef<HTMLDivElement>(null)

  const sugerenciasClientes = clientes
    .filter(c => c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase()) && c.estatus === "activo")
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
    .slice(0, 8)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (clienteRef.current && !clienteRef.current.contains(e.target as Node)) {
        setMostrarSugerencias(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const [nuevaPoliza, setNuevaPoliza] = useState({
    clienteId: "", companiaId: "", ramo: "" as SPoliza["ramo"] | "",
    numeroPoliza: "", incisoEndoso: "", nombreAsegurado: "",
    vigenciaInicio: "", vigenciaFin: "", vigenciaPagoFin: "", vigenciaProductoFin: "", prima: "", formaPago: "" as SPoliza["formaPago"] | "",
    tipoPago: "" as "efectivo" | "transferencia" | "tarjeta" | "domiciliacion" | "cheque" | "",
    vigenciaVidaPago: "", vigenciaVidaProducto: "", agente: "", vendedorId: "", ultimoDiaPago: "", numeroRecibo: "",
    registroSistemaCobranza: false, comentarios: "", notas: "", marcaActualizacion: false,
    divisas: "MXN", primaTotal: "", diasGraciaPrimerRecibo: "", diasGraciaSubsecuentes: "", primerRecibo: "", recibosSubsecuentes: "",
  })

  const [nuevoCliente, setNuevoCliente] = useState({ nombre: "", email: "", telefono: "", empresa: "" })

  // Estado edición
  const [editForm, setEditForm] = useState({
    estatus: "" as SPoliza["estatus"] | "",
    comentarios: "", notas: "", prima: "", primaTotal: "",
    formaPago: "" as SPoliza["formaPago"] | "",
    tipoPago: "" as string,
    ultimoDiaPago: "", vigenciaFin: "", vigenciaInicio: "", vigenciaPagoFin: "", vigenciaProductoFin: "",
    diasGraciaPrimerRecibo: "", diasGraciaSubsecuentes: "",
    numeroRecibo: "", agente: "", vendedorId: "", divisas: "MXN",
    primerRecibo: "", recibosSubsecuentes: "",
    vigenciaVidaPago: "", vigenciaVidaProducto: "",
  })

  useEffect(() => {
    const filtro = searchParams.get("filtro")
    if (filtro === "renovaciones") setFiltroEstatus("por-renovar")
  }, [searchParams])

  useEffect(() => {
    if (!nuevaPoliza.vigenciaInicio) return
    try {
      const vigencias = calcularVigenciasPoliza(
        nuevaPoliza.vigenciaInicio,
        nuevaPoliza.ramo === "vida" && nuevaPoliza.vigenciaVidaPago ? Number(nuevaPoliza.vigenciaVidaPago) : undefined,
        nuevaPoliza.ramo === "vida" && nuevaPoliza.vigenciaVidaProducto ? Number(nuevaPoliza.vigenciaVidaProducto) : undefined,
      )
      setNuevaPoliza(poliza => ({
        ...poliza,
        vigenciaFin: vigencias.vigenciaAnualFin,
        vigenciaPagoFin: vigencias.vigenciaPagoFin || "",
        vigenciaProductoFin: vigencias.vigenciaProductoFin || "",
      }))
    } catch {
      setNuevaPoliza(poliza => ({ ...poliza, vigenciaPagoFin: "", vigenciaProductoFin: "" }))
    }
  }, [nuevaPoliza.vigenciaInicio, nuevaPoliza.ramo, nuevaPoliza.vigenciaVidaPago, nuevaPoliza.vigenciaVidaProducto])

  useEffect(() => {
    if (!editForm.vigenciaInicio) return
    try {
      const vigencias = calcularVigenciasPoliza(
        editForm.vigenciaInicio,
        polizaEditar?.ramo === "vida" && editForm.vigenciaVidaPago ? Number(editForm.vigenciaVidaPago) : undefined,
        polizaEditar?.ramo === "vida" && editForm.vigenciaVidaProducto ? Number(editForm.vigenciaVidaProducto) : undefined,
      )
      setEditForm(form => ({
        ...form,
        vigenciaFin: vigencias.vigenciaAnualFin,
        vigenciaPagoFin: vigencias.vigenciaPagoFin || "",
        vigenciaProductoFin: vigencias.vigenciaProductoFin || "",
      }))
    } catch {
      setEditForm(form => ({ ...form, vigenciaPagoFin: "", vigenciaProductoFin: "" }))
    }
  }, [editForm.vigenciaInicio, editForm.vigenciaVidaPago, editForm.vigenciaVidaProducto, polizaEditar?.ramo])

  useEffect(() => {
    if (polizaEditar?.ramo !== "vida" || !editForm.prima || !editForm.vigenciaVidaPago) return
    try {
      const primaTotal = calcularPrimaTotalPlazo(Number(editForm.prima), Number(editForm.vigenciaVidaPago))
      setEditForm(form => ({ ...form, primaTotal: primaTotal.toString() }))
    } catch {
      setEditForm(form => ({ ...form, primaTotal: "" }))
    }
  }, [editForm.prima, editForm.vigenciaVidaPago, polizaEditar?.ramo])

  useEffect(() => {
    if (!polizaEditar || !editForm.formaPago || !editForm.vigenciaInicio || !editForm.vigenciaFin || !editForm.primaTotal) return
    try {
      const pagados = pagos.filter(pago => pago.polizaId === polizaEditar.id && pago.estatus === "pagado")
      const recibos = generarRecibos({
        primaTotal: Number(editForm.primaTotal),
        primaAnual: polizaEditar.ramo === "vida" ? Number(editForm.prima) : undefined,
        vigenciaInicio: editForm.vigenciaInicio,
        vigenciaFin: polizaEditar.ramo === "vida" ? editForm.vigenciaPagoFin : editForm.vigenciaFin,
        periodicidad: editForm.formaPago as SPoliza["formaPago"],
        primerRecibo: editForm.primerRecibo ? Number(editForm.primerRecibo) : undefined,
        recibosPagados: pagados,
      })
      const siguiente = recibos[0]
      const ultimoPagado = [...pagados].sort((left, right) => right.numeroRecibo - left.numeroRecibo)[0]
      setEditForm(form => ({
        ...form,
        numeroRecibo: siguiente ? `${siguiente.numeroRecibo}/${siguiente.totalRecibos}` : ultimoPagado ? `${ultimoPagado.numeroRecibo}/${ultimoPagado.totalRecibos}` : "",
        recibosSubsecuentes: siguiente ? siguiente.monto.toFixed(2) : "0",
      }))
    } catch {
      setEditForm(form => ({ ...form, numeroRecibo: "", recibosSubsecuentes: "" }))
    }
  }, [editForm.formaPago, editForm.primaTotal, editForm.primerRecibo, editForm.vigenciaFin, editForm.vigenciaInicio, editForm.vigenciaPagoFin, pagos, polizaEditar])

  // Calcular prima total, recibos subsecuentes y número de recibos automáticamente
  useEffect(() => {
    if (nuevaPoliza.prima && nuevaPoliza.formaPago && nuevaPoliza.vigenciaInicio && nuevaPoliza.vigenciaFin && (nuevaPoliza.ramo !== "vida" || nuevaPoliza.vigenciaPagoFin)) {
      const primaNum = parseFloat(nuevaPoliza.prima)
      const primerReciboNum = parseFloat(nuevaPoliza.primerRecibo)
      
      if (!isNaN(primaNum) && primaNum > 0 && (isNaN(primerReciboNum) || primerReciboNum > 0)) {
        try {
          // Calcular período real entre fecha inicio y fin
          const primaTotalCalculada = nuevaPoliza.ramo === "vida"
            ? calcularPrimaTotalPlazo(primaNum, Number(nuevaPoliza.vigenciaVidaPago))
            : primaNum
          const recibos = generarRecibos({
            primaTotal: primaTotalCalculada,
            primaAnual: nuevaPoliza.ramo === "vida" ? primaNum : undefined,
            vigenciaInicio: nuevaPoliza.vigenciaInicio,
            vigenciaFin: nuevaPoliza.ramo === "vida" ? nuevaPoliza.vigenciaPagoFin : nuevaPoliza.vigenciaFin,
            periodicidad: nuevaPoliza.formaPago as SPoliza["formaPago"],
            primerRecibo: isNaN(primerReciboNum) ? undefined : primerReciboNum,
          })
          
          // Calcular diferencia en días
          const totalRecibos = recibos.length
          
          // Determinar cantidad de recibos según forma de pago y período real
          const reciboPorSubsecuente = recibos[1]?.monto || 0

          // Asegurar mínimo 1 recibo
          const numeroRecibos = Math.max(1, totalRecibos)

          // Calcular prima total (anual)

          // Calcular recibos subsecuentes
          const recibosSubsecuentesNum = numeroRecibos - 1
          void recibosSubsecuentesNum

          // Actualizar campos
          setNuevaPoliza(p => ({
            ...p,
            primaTotal: primaTotalCalculada.toString(),
            recibosSubsecuentes: reciboPorSubsecuente > 0 ? reciboPorSubsecuente.toFixed(2) : "0",
            numeroRecibo: `1/${numeroRecibos}`
          }))
        } catch (error) {
          console.error("Error al calcular período:", error)
          setNuevaPoliza(poliza => ({ ...poliza, numeroRecibo: "", recibosSubsecuentes: "" }))
        }
      }
    }

    // Para seguros de vida, el total de recibos se determina por el plazo de pago,
    // no por el plazo total del producto.
    if (nuevaPoliza.ramo === "vida" && nuevaPoliza.vigenciaVidaPago && nuevaPoliza.formaPago) {
      const anos = parseInt(nuevaPoliza.vigenciaVidaPago)
      if (!isNaN(anos) && anos > 0) {
        const recibosAnuales = { mensual: 12, trimestral: 4, semestral: 2, anual: 1 }[nuevaPoliza.formaPago as string] ?? 1
        const totalRecibos = anos * recibosAnuales
        setNuevaPoliza(p => ({ ...p, numeroRecibo: `1/${totalRecibos}` }))
      }
    }
  }, [nuevaPoliza.prima, nuevaPoliza.formaPago, nuevaPoliza.primerRecibo, nuevaPoliza.vigenciaInicio, nuevaPoliza.vigenciaFin, nuevaPoliza.vigenciaPagoFin, nuevaPoliza.ramo, nuevaPoliza.vigenciaVidaPago])

  const resetFormulario = () => {
    setPolizaIdRenovando(null)
    setRenovacionIdActiva(null)
    setNuevaPoliza({
      clienteId: "", companiaId: "", ramo: "", numeroPoliza: "", incisoEndoso: "",
      nombreAsegurado: "", vigenciaInicio: "", vigenciaFin: "", vigenciaPagoFin: "", vigenciaProductoFin: "", prima: "", formaPago: "",
      tipoPago: "", vigenciaVidaPago: "", vigenciaVidaProducto: "", agente: "", vendedorId: "", ultimoDiaPago: "", numeroRecibo: "",
      registroSistemaCobranza: false, comentarios: "", notas: "", marcaActualizacion: false,
      divisas: "MXN", primaTotal: "", diasGraciaPrimerRecibo: "", diasGraciaSubsecuentes: "", primerRecibo: "", recibosSubsecuentes: "",
    })
    setNuevoCliente({ nombre: "", email: "", telefono: "", empresa: "" })
    setBusquedaCliente("")
    setVehiculoSeleccionado(null)
    setModoNuevoCliente(true)
  }

  const handleSubmit = async () => {
    if (!nuevaPoliza.clienteId && !modoNuevoCliente) {
      toast.error("Seleccione un cliente o cree uno nuevo")
      return
    }
    if (!nuevaPoliza.companiaId || !nuevaPoliza.ramo || !nuevaPoliza.numeroPoliza ||
      !nuevaPoliza.vigenciaInicio || !nuevaPoliza.vigenciaFin || !nuevaPoliza.prima || !nuevaPoliza.formaPago) {
      toast.error("Complete todos los campos obligatorios")
      return
    }
    if (nuevaPoliza.ramo === "vida" && (!nuevaPoliza.vigenciaVidaPago || !nuevaPoliza.vigenciaVidaProducto)) {
      toast.error("Para seguros de vida especifique ambas vigencias")
      return
    }
    if (nuevaPoliza.ramo === "vida" && (
      !Number.isInteger(Number(nuevaPoliza.vigenciaVidaPago)) || Number(nuevaPoliza.vigenciaVidaPago) < 1 ||
      !Number.isInteger(Number(nuevaPoliza.vigenciaVidaProducto)) || Number(nuevaPoliza.vigenciaVidaProducto) < 1
    )) {
      toast.error("Las vigencias de vida deben ser números enteros mayores a 0")
      return
    }
    if (nuevaPoliza.ramo === "vida" && Number(nuevaPoliza.vigenciaVidaPago) > Number(nuevaPoliza.vigenciaVidaProducto)) {
      toast.error("La vigencia de pago no puede ser mayor que la vigencia del producto")
      return
    }
    const primaNum = parseFloat(nuevaPoliza.prima)
    if (isNaN(primaNum) || primaNum <= 0) {
      toast.error("La prima debe ser un número válido mayor a 0")
      return
    }
    const primerReciboNum = parseFloat(nuevaPoliza.primerRecibo)
    if (!isNaN(primerReciboNum) && primerReciboNum > primaNum) {
      toast.error("El primer recibo no puede ser mayor que la prima total")
      return
    }
    const primaPrimerRecibo = !isNaN(primerReciboNum) && primerReciboNum > 0 ? primerReciboNum : primaNum

    let clienteIdFinal = nuevaPoliza.clienteId
    if (modoNuevoCliente) {
      if (!nuevoCliente.nombre || !nuevoCliente.telefono) {
        toast.error("Nombre y teléfono son obligatorios para el cliente")
        return
      }
      const nuevoId = await agregarCliente({
        nombre: nuevoCliente.nombre,
        email: nuevoCliente.email || `${nuevoCliente.nombre.toLowerCase().replace(/\s/g, ".")}@email.com`,
        telefono: nuevoCliente.telefono,
        empresa: nuevoCliente.empresa || undefined,
        fechaRegistro: todayDateOnly(),
        estatus: "activo",
      })
      if (!nuevoId) return
      clienteIdFinal = nuevoId
    }

    setSavingPoliza(true)
    try {
      const polizaId = await agregarPoliza({
        clienteId: clienteIdFinal,
        companiaId: nuevaPoliza.companiaId,
        ramo: nuevaPoliza.ramo as SPoliza["ramo"],
        numeroPoliza: nuevaPoliza.numeroPoliza,
        vigenciaInicio: nuevaPoliza.vigenciaInicio,
        vigenciaFin: nuevaPoliza.vigenciaFin,
        vigenciaPagoFin: nuevaPoliza.vigenciaPagoFin || undefined,
        vigenciaProductoFin: nuevaPoliza.vigenciaProductoFin || undefined,
        prima: primaNum,
        formaPago: nuevaPoliza.formaPago as SPoliza["formaPago"],
        estatus: "activa",
        folios: [],
        tramites: 0,
        primaEmitida: primaNum,
        primaCobrada: 0,
        fechaEmision: todayDateOnly(),
        agente: nuevaPoliza.agente || undefined,
        vendedorId: nuevaPoliza.vendedorId || undefined,
        renovadaDesdeId: polizaIdRenovando || undefined,
        incisoEndoso: nuevaPoliza.incisoEndoso || undefined,
        nombreAsegurado: nuevaPoliza.nombreAsegurado || undefined,
        ultimoDiaPago: nuevaPoliza.ultimoDiaPago || undefined,
        numeroRecibo: nuevaPoliza.numeroRecibo || "1/1",
        primaTotalRecibo: primaPrimerRecibo,
        tipoPago: nuevaPoliza.tipoPago || undefined,
        registroSistemaCobranza: nuevaPoliza.registroSistemaCobranza,
        comentarios: nuevaPoliza.comentarios || undefined,
        notas: nuevaPoliza.notas || undefined,
        marcaActualizacion: nuevaPoliza.marcaActualizacion,
        vigenciaVidaPago: nuevaPoliza.vigenciaVidaPago ? parseInt(nuevaPoliza.vigenciaVidaPago) : undefined,
        vigenciaVidaProducto: nuevaPoliza.vigenciaVidaProducto ? parseInt(nuevaPoliza.vigenciaVidaProducto) : undefined,
        primerRecibo: nuevaPoliza.primerRecibo ? parseFloat(nuevaPoliza.primerRecibo) : undefined,
        recibosSubsecuentes: nuevaPoliza.recibosSubsecuentes ? parseFloat(nuevaPoliza.recibosSubsecuentes) : undefined,
        diasGraciaPrimerRecibo: nuevaPoliza.diasGraciaPrimerRecibo ? parseInt(nuevaPoliza.diasGraciaPrimerRecibo) : undefined,
        diasGraciaSubsecuentes: nuevaPoliza.diasGraciaSubsecuentes ? parseInt(nuevaPoliza.diasGraciaSubsecuentes) : undefined,
        primaTotal: nuevaPoliza.primaTotal ? parseFloat(nuevaPoliza.primaTotal) : undefined,
        divisas: nuevaPoliza.divisas || undefined,
        vehiculoAmis: vehiculoSeleccionado?.amis || undefined,
        vehiculoClave: vehiculoSeleccionado?.claveCot || undefined,
        vehiculoDescripcion: vehiculoSeleccionado?.marcaDescripcion || undefined,
        vehiculoModelo: vehiculoSeleccionado?.modelos || undefined,
      })
      if (polizaId) {
        // Si esta póliza proviene de una renovación, marcar la original como renovada
        // solo ahora que la nueva póliza se creó exitosamente.
        if (polizaIdRenovando && renovacionIdActiva) {
          await completarRenovacion(renovacionIdActiva, polizaId)
          setPolizaIdRenovando(null)
          setRenovacionIdActiva(null)
        }
        setModalNuevaPoliza(false)
        resetFormulario()
      }
    } finally {
      setSavingPoliza(false)
    }
  }

  const abrirEdicion = (poliza: SPoliza) => {
    setPolizaEditar(poliza)
    setEditForm({
      estatus: poliza.estatus,
      comentarios: poliza.comentarios || "",
      notas: poliza.notas || "",
      prima: poliza.prima.toString(),
      primaTotal: (poliza.primaTotal ?? poliza.prima).toString(),
      formaPago: poliza.formaPago,
      tipoPago: poliza.tipoPago || "",
      ultimoDiaPago: poliza.ultimoDiaPago || "",
      vigenciaFin: poliza.vigenciaFin,
      vigenciaInicio: poliza.vigenciaInicio,
      vigenciaPagoFin: poliza.vigenciaPagoFin || "",
      vigenciaProductoFin: poliza.vigenciaProductoFin || "",
      diasGraciaPrimerRecibo: poliza.diasGraciaPrimerRecibo?.toString() || "",
      diasGraciaSubsecuentes: poliza.diasGraciaSubsecuentes?.toString() || "",
      numeroRecibo: poliza.numeroRecibo || "",
      agente: poliza.agente || "",
      vendedorId: poliza.vendedorId || "",
      divisas: poliza.divisas || "MXN",
      primerRecibo: poliza.primerRecibo?.toString() || "",
      recibosSubsecuentes: poliza.recibosSubsecuentes?.toString() || "",
      vigenciaVidaPago: poliza.vigenciaVidaPago?.toString() || "",
      vigenciaVidaProducto: (poliza.vigenciaVidaProducto ?? poliza.anosVidaProducto)?.toString() || "",
    })
    setPolizaSeleccionada(null)
    setModalEditarPoliza(true)
  }

  const guardarEdicion = async () => {
    if (!polizaEditar) return
    if (!editForm.vigenciaInicio) {
      toast.error("La fecha de inicio de vigencia es obligatoria")
      return
    }
    if (polizaEditar.ramo === "vida" && (!editForm.vigenciaVidaPago || !editForm.vigenciaVidaProducto || Number(editForm.vigenciaVidaPago) > Number(editForm.vigenciaVidaProducto))) {
      toast.error("Las vigencias de pago y producto son obligatorias; pago no puede superar producto")
      return
    }
    const primaNum = parseFloat(editForm.prima)
    const primaTotalNum = parseFloat(editForm.primaTotal)
    const primerReciboNum = parseFloat(editForm.primerRecibo)
    const recibosSubsecuentesNum = parseFloat(editForm.recibosSubsecuentes)
    const primaPoliza = isNaN(primaNum) ? polizaEditar.prima : primaNum
    const numeroRecibo = editForm.numeroRecibo || polizaEditar.numeroRecibo || "1/1"
    const [reciboActual] = numeroRecibo.split("/").map(Number)
    const primaRecibo = reciboActual === 1 && !isNaN(primerReciboNum) && primerReciboNum > 0
      ? primerReciboNum
      : !isNaN(recibosSubsecuentesNum) && recibosSubsecuentesNum > 0
        ? recibosSubsecuentesNum
        : primaPoliza

    await actualizarPoliza(polizaEditar.id, {
      estatus: editForm.estatus as SPoliza["estatus"],
      comentarios: editForm.comentarios || undefined,
      notas: editForm.notas || undefined,
      prima: primaPoliza,
      // Cobranza lee estos dos campos; se actualizan junto con la prima de la póliza.
      primaEmitida: isNaN(primaTotalNum) ? primaPoliza : primaTotalNum,
      primaTotalRecibo: primaRecibo,
      primaTotal: isNaN(primaTotalNum) ? undefined : primaTotalNum,
      formaPago: editForm.formaPago as SPoliza["formaPago"],
      tipoPago: editForm.tipoPago || undefined,
      ultimoDiaPago: editForm.ultimoDiaPago || undefined,
      vigenciaFin: editForm.vigenciaFin,
      vigenciaInicio: editForm.vigenciaInicio || undefined,
      vigenciaPagoFin: editForm.vigenciaPagoFin || undefined,
      vigenciaProductoFin: editForm.vigenciaProductoFin || undefined,
      diasGraciaPrimerRecibo: editForm.diasGraciaPrimerRecibo ? parseInt(editForm.diasGraciaPrimerRecibo) : undefined,
      diasGraciaSubsecuentes: editForm.diasGraciaSubsecuentes ? parseInt(editForm.diasGraciaSubsecuentes) : undefined,
      numeroRecibo: editForm.numeroRecibo || undefined,
      agente: editForm.agente || undefined,
      vendedorId: editForm.vendedorId,
      divisas: editForm.divisas || undefined,
      primerRecibo: isNaN(primerReciboNum) ? undefined : primerReciboNum,
      recibosSubsecuentes: isNaN(recibosSubsecuentesNum) ? undefined : recibosSubsecuentesNum,
      vigenciaVidaPago: editForm.vigenciaVidaPago ? parseInt(editForm.vigenciaVidaPago) : undefined,
      vigenciaVidaProducto: editForm.vigenciaVidaProducto ? parseInt(editForm.vigenciaVidaProducto) : undefined,
    })
    setModalEditarPoliza(false)
    setPolizaEditar(null)
    toast.success("Póliza actualizada correctamente")
  }

  const handleRenovar = (poliza: SPoliza) => {
    if (poliza.estatus === "renovada" || poliza.renovacionEstado === "renovada") {
      toast.error("Esta póliza ya fue renovada")
      return
    }
    setPolizaAccion(poliza)
    setModalRenovar(true)
  }

  const handleCancelar = (poliza: SPoliza) => {
    setPolizaAccion(poliza)
    setMotivoCancelacion("")
    setModalCancelar(true)
  }

  const confirmarRenovacion = async () => {
    if (!polizaAccion) return
    try {
      const renovacionId = await iniciarRenovacion(polizaAccion.id)
      if (!renovacionId) {
        toast.error("No fue posible iniciar la renovación")
        return
      }
      setRenovacionIdActiva(renovacionId)
    } catch (error: any) {
      toast.error(error.message || "No fue posible iniciar la renovación")
      return
    }

    // Pre-cargar todos los datos de la póliza original en el formulario
    setModoNuevoCliente(false)
    setNuevaPoliza({
      clienteId: polizaAccion.clienteId,
      companiaId: polizaAccion.companiaId,
      ramo: polizaAccion.ramo,
      numeroPoliza: "",
      incisoEndoso: polizaAccion.incisoEndoso || "",
      nombreAsegurado: polizaAccion.nombreAsegurado || "",
      vigenciaInicio: polizaAccion.vigenciaFin,
      vigenciaFin: "",
      vigenciaPagoFin: "",
      vigenciaProductoFin: "",
      prima: polizaAccion.prima.toString(),
      formaPago: polizaAccion.formaPago,
      tipoPago: (polizaAccion.tipoPago || "") as "efectivo" | "transferencia" | "tarjeta" | "domiciliacion" | "cheque" | "",
      vigenciaVidaPago: polizaAccion.vigenciaVidaPago?.toString() || "",
      vigenciaVidaProducto: (polizaAccion.vigenciaVidaProducto ?? polizaAccion.anosVidaProducto)?.toString() || "",
      agente: polizaAccion.agente || "",
      vendedorId: polizaAccion.vendedorId || "",
      ultimoDiaPago: "",
      numeroRecibo: polizaAccion.numeroRecibo || "",
      registroSistemaCobranza: polizaAccion.registroSistemaCobranza || false,
      comentarios: polizaAccion.comentarios || "",
      notas: `Renovación de póliza ${polizaAccion.numeroPoliza}`,
      marcaActualizacion: false,
      divisas: polizaAccion.divisas || "MXN",
      primaTotal: polizaAccion.primaTotal?.toString() || "",
      diasGraciaPrimerRecibo: polizaAccion.diasGraciaPrimerRecibo?.toString() || "",
      diasGraciaSubsecuentes: polizaAccion.diasGraciaSubsecuentes?.toString() || "",
      primerRecibo: polizaAccion.primerRecibo?.toString() || "",
      recibosSubsecuentes: polizaAccion.recibosSubsecuentes?.toString() || "",
    })
    setBusquedaCliente("")
    setVehiculoSeleccionado(null)

    // Se marcará como renovada solo si la nueva póliza se crea exitosamente (ver handleSubmit).
    setPolizaIdRenovando(polizaAccion.id)

    setModalRenovar(false)
    setModalNuevaPoliza(true)
    toast.success("Datos de la póliza cargados en el formulario. Actualiza la vigencia y confirma.")
  }

  const confirmarCancelacion = async () => {
    if (!polizaAccion || !motivoCancelacion.trim()) {
      toast.error("Debes indicar el motivo de cancelación")
      return
    }
    await actualizarPoliza(polizaAccion.id, {
      estatus: "cancelada",
      notas: `Cancelación: ${motivoCancelacion}`,
    })
    setModalCancelar(false)
    setPolizaAccion(null)
    setMotivoCancelacion("")
    toast.success("Póliza cancelada correctamente")
  }

  const abrirCancelarRenovacion = (poliza: SPoliza) => {
    setPolizaAccion(poliza)
    setMotivoCancelacion("")
    setModalCancelarRenovacion(true)
  }

  const confirmarCancelarRenovacion = async () => {
    if (!polizaAccion || !motivoCancelacion.trim()) {
      toast.error("Debes indicar el motivo de cancelación")
      return
    }
    try {
      await cancelarRenovacion(polizaAccion.id, motivoCancelacion.trim())
      setModalCancelarRenovacion(false)
      setPolizaAccion(null)
      setMotivoCancelacion("")
      if (polizaIdRenovando === polizaAccion.id) resetFormulario()
      toast.success("Renovación cancelada; la póliza original permanece intacta")
    } catch (error: any) {
      toast.error(error.message || "No fue posible cancelar la renovación")
    }
  }

  // Filtrar y buscar
  const polizasFiltradas = polizas.filter(p => {
    if (filtroCompania !== "todas" && p.companiaId !== filtroCompania) return false
    if (filtroRamo !== "todos" && p.ramo !== filtroRamo) return false
    if (filtroEstatus !== "todos" && p.estatus !== filtroEstatus) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      const cliente = clientes.find(c => c.id === p.clienteId)
      const compania = companias.find(c => c.id === p.companiaId)
      return (
        p.numeroPoliza.toLowerCase().includes(q) ||
        (cliente?.nombre || "").toLowerCase().includes(q) ||
        (compania?.nombre || "").toLowerCase().includes(q) ||
        (p.nombreAsegurado || "").toLowerCase().includes(q) ||
        p.ramo.toLowerCase().includes(q)
      )
    }
    return true
  }).sort((a, b) => a.vigenciaFin.localeCompare(b.vigenciaFin))

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="main-content-aligned">
          <PageHeader title="Pólizas" subtitle="Gestiona todas las pólizas de tu cartera" />

          {/* Barra superior */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6 items-start sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por póliza, cliente, aseguradora, ramo..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="pl-9"
              />
              {busqueda && (
                <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setBusqueda("")}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <Button onClick={() => setModalNuevaPoliza(true)} className="bg-primary hover:bg-primary/90 shrink-0">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Póliza
            </Button>
          </div>

          {/* Filtros */}
          <GlassCard className="p-4 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block text-muted-foreground">Aseguradora</label>
                <Select value={filtroCompania} onValueChange={setFiltroCompania}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    {companias.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block text-muted-foreground">Ramo</label>
                <Select value={filtroRamo} onValueChange={setFiltroRamo}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="autos">Autos</SelectItem>
                    <SelectItem value="vida">Vida</SelectItem>
                    <SelectItem value="gastos-medicos">Gastos Médicos</SelectItem>
                    <SelectItem value="empresa">Empresa</SelectItem>
                    <SelectItem value="hogar">Hogar</SelectItem>
                    <SelectItem value="flotilla">Flotilla</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block text-muted-foreground">Estatus</label>
                <Select value={filtroEstatus} onValueChange={setFiltroEstatus}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="activa">Pólizas activas</SelectItem>
                    <SelectItem value="vigente">Vigente</SelectItem>
                    <SelectItem value="por-renovar">Por Renovar</SelectItem>
                    <SelectItem value="renovada">Renovada</SelectItem>
                    <SelectItem value="en-movimientos">En Movimientos</SelectItem>
                    <SelectItem value="gracia">En Gracia</SelectItem>
                    <SelectItem value="vencida">Vencida</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                    <SelectItem value="cancelada-cliente">Cancelada (Cliente)</SelectItem>
                    <SelectItem value="cancelada-falta-pago">Cancelada (Falta Pago)</SelectItem>
                    <SelectItem value="desvinculada-cobranza">Desvinculada de Cobranza</SelectItem>
                    <SelectItem value="espera-formato">En Espera de Formato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </GlassCard>

          <p className="text-xs text-muted-foreground mb-3">{polizasFiltradas.length} pólizas {busqueda && `para "${busqueda}"`}</p>

          {/* Tabla desktop */}
          <GlassCard className="overflow-hidden hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-xs text-muted-foreground uppercase">
                    <th className="text-left p-3 font-semibold">Cliente</th>
                    <th className="text-left p-3 font-semibold">Póliza</th>
                    <th className="text-left p-3 font-semibold">Aseguradora</th>
                    <th className="text-left p-3 font-semibold">Ramo</th>
                    <th className="text-left p-3 font-semibold">Vigencia</th>
                    <th className="text-left p-3 font-semibold">Prima total</th>
                    <th className="text-left p-3 font-semibold">Estatus</th>
                    <th className="text-center p-3 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {polizasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground">
                        {busqueda ? `Sin resultados para "${busqueda}"` : "No hay pólizas registradas"}
                      </td>
                    </tr>
                  ) : polizasFiltradas.map((poliza, index) => {
                    const cliente = clientes.find(c => c.id === poliza.clienteId)
                    const compania = companias.find(c => c.id === poliza.companiaId)
                    return (
                      <motion.tr
                        key={poliza.id}
                        className="border-b border-border/30 hover:bg-muted/40 cursor-pointer transition-colors"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        onClick={() => setPolizaSeleccionada(poliza)}
                      >
                        <td className="p-3">
                          <p className="font-medium">{poliza.nombreAsegurado || cliente?.nombre || "—"}</p>
                          <p className="text-xs text-muted-foreground">{cliente?.nombre}</p>
                        </td>
                        <td className="p-3 font-mono text-sm">{poliza.numeroPoliza}</td>
                        <td className="p-3">
                          <Badge variant="outline" style={{ borderColor: compania?.color, color: compania?.color }}>
                            {compania?.nombre || "—"}
                          </Badge>
                        </td>
                        <td className="p-3 capitalize">{poliza.ramo.replace("-", " ")}</td>
                        <td className="p-3 text-xs">
                          <p>{formatDateOnly(poliza.vigenciaInicio)}</p>
                          <p className="text-muted-foreground">{formatDateOnly(poliza.vigenciaFin)}</p>
                        </td>
                        <td className="p-3">
                          <p className="font-semibold">${poliza.prima.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground capitalize">{poliza.formaPago}</p>
                        </td>
                        <td className="p-3">
                          <Badge className={ESTATUS_COLORS[getEstatusVisible(poliza)] || ESTATUS_COLORS.activa} variant="outline">
                            {getEstatusLabel(getEstatusVisible(poliza))}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {poliza.renovacionEstado === "en_proceso" ? (
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-orange-600"
                                onClick={e => { e.stopPropagation(); abrirCancelarRenovacion(poliza) }}>
                                <X className="w-3 h-3 mr-1" /> Cancelar renovación
                              </Button>
                            ) : getEstatusVisible(poliza) !== "renovada" ? (
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                                onClick={e => { e.stopPropagation(); handleRenovar(poliza) }}>
                                <RefreshCw className="w-3 h-3 mr-1" /> Renovar
                              </Button>
                            ) : null}
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                              onClick={e => { e.stopPropagation(); handleCancelar(poliza) }}>
                              <Trash2 className="w-3 h-3 mr-1" /> Cancelar
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                              onClick={e => { e.stopPropagation(); abrirEdicion(poliza) }}>
                              <Edit2 className="w-3 h-3" />
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

          {/* Cards móvil */}
          <div className="lg:hidden space-y-3">
            {polizasFiltradas.map((poliza, index) => {
              const cliente = clientes.find(c => c.id === poliza.clienteId)
              const compania = companias.find(c => c.id === poliza.companiaId)
              return (
                <motion.div key={poliza.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
                  <div className="cursor-pointer" onClick={() => setPolizaSeleccionada(poliza)}><GlassCard className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{poliza.nombreAsegurado || cliente?.nombre}</p>
                        <p className="font-mono text-xs text-muted-foreground">{poliza.numeroPoliza}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge className={ESTATUS_COLORS[getEstatusVisible(poliza)] || ESTATUS_COLORS.activa} variant="outline">{getEstatusLabel(getEstatusVisible(poliza))}</Badge>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={e => { e.stopPropagation(); abrirEdicion(poliza) }}>
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" style={{ borderColor: compania?.color, color: compania?.color }}>{compania?.nombre}</Badge>
                      <span className="text-xs capitalize text-muted-foreground">{poliza.ramo.replace("-", " ")}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <p className="font-semibold">${poliza.prima.toLocaleString()} <span className="text-xs font-normal text-muted-foreground capitalize">/ {poliza.formaPago}</span></p>
                      <p className="text-xs text-muted-foreground">{formatDateOnly(poliza.vigenciaFin)}</p>
                    </div>
                  </GlassCard></div>
                </motion.div>
              )
            })}
          </div>

          {/* Modal detalle */}
          <Dialog open={!!polizaSeleccionada} onOpenChange={() => setPolizaSeleccionada(null)}>
            <DialogContent className="glass-strong max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">Detalle de Póliza</DialogTitle>
                <DialogDescription>Información completa de la póliza</DialogDescription>
              </DialogHeader>
              {polizaSeleccionada && (() => {
                const cliente = clientes.find(c => c.id === polizaSeleccionada.clienteId)
                const compania = companias.find(c => c.id === polizaSeleccionada.companiaId)
                const vendedor = usuariosSistema.find(item => item.id === polizaSeleccionada.vendedorId)
                const recibosPoliza = pagos.filter(item => item.polizaId === polizaSeleccionada.id && item.estatus !== "cancelado")
                const resumen = resumirCobranza(recibosPoliza, polizaSeleccionada.primaTotal || polizaSeleccionada.prima)
                const historial = historialPolizas.filter(item => item.polizaId === polizaSeleccionada.id).slice(0, 20)
                return (
                  <div className="space-y-4 mt-2">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {[
                        ["Cliente", cliente?.nombre || "—"],
                        ["# Póliza", polizaSeleccionada.numeroPoliza],
                        ["Asegurado", polizaSeleccionada.nombreAsegurado || cliente?.nombre || "—"],
                        ["Aseguradora", compania?.nombre || "—"],
                        ["Ramo", polizaSeleccionada.ramo.replace("-", " ")],
                        ["Prima total", `$${polizaSeleccionada.prima.toLocaleString()}`],
                        ["Forma de Pago", polizaSeleccionada.formaPago],
                        ...(polizaSeleccionada.ramo === "vida" ? [
                          ["Vigencia de pago", polizaSeleccionada.vigenciaVidaPago ? `${polizaSeleccionada.vigenciaVidaPago} años` : "—"],
                          ["Fin de vigencia de pago", polizaSeleccionada.vigenciaPagoFin ? formatDateOnly(polizaSeleccionada.vigenciaPagoFin) : "—"],
                          ["Vigencia del producto", (polizaSeleccionada.vigenciaVidaProducto ?? polizaSeleccionada.anosVidaProducto) ? `${polizaSeleccionada.vigenciaVidaProducto ?? polizaSeleccionada.anosVidaProducto} años` : "—"],
                          ["Fin de vigencia del producto", polizaSeleccionada.vigenciaProductoFin ? formatDateOnly(polizaSeleccionada.vigenciaProductoFin) : "—"],
                        ] : []),
                        ["Inicio de vigencia anual", formatDateOnly(polizaSeleccionada.vigenciaInicio)],
                        ["Fin de vigencia anual", formatDateOnly(polizaSeleccionada.vigenciaFin)],
                        ["Último Día Pago", polizaSeleccionada.ultimoDiaPago ? formatDateOnly(polizaSeleccionada.ultimoDiaPago) : "—"],
                        ["# Recibo", polizaSeleccionada.numeroRecibo || "1/1"],
                        ["Agente de cobranza", polizaSeleccionada.agente || "—"],
                        ["Vendedor de la póliza", vendedor?.nombre || "—"],
                        ["Días Gracia (Primer Recibo)", polizaSeleccionada.diasGraciaPrimerRecibo?.toString() || "—"],
                        ["Días Gracia (Subsecuentes)", polizaSeleccionada.diasGraciaSubsecuentes?.toString() || "—"],
                        ["Divisa", polizaSeleccionada.divisas || "MXN"],
                        ...(polizaSeleccionada.vehiculoDescripcion ? [
                          ["Vehículo", polizaSeleccionada.vehiculoDescripcion],
                          ["AMIS", polizaSeleccionada.vehiculoAmis || "—"],
                          ["Clave Cot.", polizaSeleccionada.vehiculoClave || "—"],
                          ["Modelos", polizaSeleccionada.vehiculoModelo || "—"],
                        ] : []),
                      ].map(([label, value]) => (
                        <div key={label} className="space-y-1">
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="font-medium capitalize">{value}</p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Estatus</p>
                      <Badge className={ESTATUS_COLORS[getEstatusVisible(polizaSeleccionada)] || ESTATUS_COLORS.activa} variant="outline">
                        {getEstatusLabel(getEstatusVisible(polizaSeleccionada))}
                      </Badge>
                    </div>
                    <div className="rounded-xl border border-border/50 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">Cobranza</p>
                          <p className="text-xs text-muted-foreground capitalize">Periodicidad {polizaSeleccionada.formaPago}</p>
                        </div>
                        <Badge variant={resumen.estatus === "pagada" ? "default" : resumen.estatus === "vencida" ? "destructive" : "secondary"}>{resumen.estatus.replace("_", " ")}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div><p className="text-xs text-muted-foreground">Prima total</p><p className="font-semibold">${resumen.total.toLocaleString()}</p></div>
                        <div><p className="text-xs text-muted-foreground">Cobrado</p><p className="font-semibold text-green-600">${resumen.cobrado.toLocaleString()}</p></div>
                        <div><p className="text-xs text-muted-foreground">Pendiente</p><p className="font-semibold text-orange-600">${resumen.pendiente.toLocaleString()}</p></div>
                      </div>
                      {recibosPoliza.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Sin recibos generados. Se crearán al guardar la póliza con la nueva estructura.</p>
                      ) : (
                        <div className="space-y-1 max-h-44 overflow-y-auto">
                          {recibosPoliza.map(recibo => {
                            const estado = estadoCobranzaRecibo(recibo)
                            return (
                              <div key={recibo.id} className="grid grid-cols-[80px_1fr_1fr_auto] gap-2 items-center rounded-lg bg-muted/30 p-2 text-xs">
                                <span className="font-mono">{recibo.numeroRecibo}/{recibo.totalRecibos}</span>
                                <span>${recibo.monto.toLocaleString()}</span>
                                <span>{formatDateOnly(recibo.fechaLimite)}</span>
                                <Badge variant={estado === "pagado" ? "default" : estado === "vencido" ? "destructive" : "outline"}>{estado.replace("_", " ")}</Badge>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    {polizaSeleccionada.ramo === "flotilla" && <FlotillaUnidades polizaId={polizaSeleccionada.id} />}
                    <div className="rounded-xl border border-border/50 p-4 space-y-2">
                      <p className="text-sm font-semibold">Historial de cambios</p>
                      {historial.length === 0 ? <p className="text-xs text-muted-foreground">Sin cambios registrados.</p> : historial.map(item => (
                        <div key={item.id} className="border-b border-border/30 pb-2 last:border-0 text-xs">
                          <div className="flex justify-between gap-3">
                            <span className="font-medium">{item.tipoCambio.replaceAll("_", " ")}</span>
                            <span className="text-muted-foreground">{new Date(item.createdAt).toLocaleString("es-MX")}</span>
                          </div>
                          <p className="text-muted-foreground">{item.usuarioNombre || item.usuarioEmail || "Sistema"}{item.campo ? ` · ${item.campo}` : ""}</p>
                        </div>
                      ))}
                    </div>
                    {polizaSeleccionada.comentarios && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Comentarios</p>
                        <p className="text-sm bg-muted/30 rounded p-3 whitespace-pre-line">{polizaSeleccionada.comentarios}</p>
                      </div>
                    )}
                    <div className="flex gap-2 justify-end">
                      <EventoRapidoButton
                        polizaId={polizaSeleccionada.id}
                        polizaNumero={polizaSeleccionada.numeroPoliza}
                        clienteNombre={cliente?.nombre}
                      />
                      <Button variant="outline" onClick={() => abrirEdicion(polizaSeleccionada)}>
                        <Edit2 className="w-4 h-4 mr-2" />Editar Póliza
                      </Button>
                    </div>
                  </div>
                )
              })()}
            </DialogContent>
          </Dialog>

          {/* Modal Editar Póliza */}
          <Dialog open={modalEditarPoliza} onOpenChange={setModalEditarPoliza}>
            <DialogContent className="glass-strong max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-serif text-xl">Editar Póliza: {polizaEditar?.numeroPoliza}</DialogTitle>
                <DialogDescription>Modifica los datos de la póliza</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2 max-h-[70vh] overflow-y-auto pr-2">
                <div>
                  <Label className="text-xs">Estatus</Label>
                  <Select value={editForm.estatus} onValueChange={v => setEditForm(f => ({ ...f, estatus: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activa">Activa</SelectItem>
                      <SelectItem value="vigente">Vigente</SelectItem>
                      <SelectItem value="en-movimientos">En Movimientos</SelectItem>
                      <SelectItem value="por-renovar">Por Renovar</SelectItem>
                    <SelectItem value="renovada">Renovada</SelectItem>
                      <SelectItem value="gracia">En Período de Gracia</SelectItem>
                      <SelectItem value="vencida">Vencida</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                      <SelectItem value="cancelada-cliente">Cancelada a Petición del Cliente</SelectItem>
                      <SelectItem value="cancelada-falta-pago">Cancelada por Falta de Pago</SelectItem>
                      <SelectItem value="desvinculada-cobranza">Desvinculada de Cobranza</SelectItem>
                      <SelectItem value="espera-formato">En Espera de Formato</SelectItem>
                      <SelectItem value="rehabilitada">Rehabilitada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">{polizaEditar?.ramo === "vida" ? "Prima anual" : "Prima total"} ({editForm.divisas})</Label>
                    <Input type="number" value={editForm.prima} onChange={e => setEditForm(f => ({ ...f, prima: e.target.value }))} className="h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">Prima total</Label>
                    <Input type="number" value={editForm.primaTotal} readOnly className="h-8 bg-muted" />
                  </div>
                </div>
                <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  Si la prima aumenta o disminuye, los recibos ya cobrados se conservan y el saldo se redistribuye entre los pendientes. No se permite reducir el total por debajo de lo ya cobrado.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Forma de Pago</Label>
                    <Select value={editForm.formaPago} onValueChange={v => setEditForm(f => ({ ...f, formaPago: v as any }))}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mensual">Mensual</SelectItem>
                        <SelectItem value="trimestral">Trimestral</SelectItem>
                        <SelectItem value="semestral">Semestral</SelectItem>
                        <SelectItem value="anual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Tipo de Pago</Label>
                    <Select value={editForm.tipoPago} onValueChange={v => setEditForm(f => ({ ...f, tipoPago: v }))}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="efectivo">Efectivo</SelectItem>
                        <SelectItem value="transferencia">Transferencia</SelectItem>
                        <SelectItem value="tarjeta">Tarjeta</SelectItem>
                        <SelectItem value="domiciliacion">Domiciliación</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Inicio de vigencia anual</Label>
                    <Input type="date" value={editForm.vigenciaInicio} onChange={e => setEditForm(f => ({ ...f, vigenciaInicio: e.target.value }))} className="h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">Fin de vigencia anual</Label>
                    <Input type="date" value={editForm.vigenciaFin} readOnly className="h-8 bg-muted" />
                  </div>
                </div>
                {polizaEditar?.ramo === "vida" && (
                  <div className="grid grid-cols-2 gap-3 rounded-lg border border-purple-200 bg-purple-50 p-3 dark:border-purple-800 dark:bg-purple-950/20">
                    <div>
                      <Label className="text-xs">Vigencia de pago (años)</Label>
                      <Input type="number" min="1" max="100" value={editForm.vigenciaVidaPago} onChange={e => setEditForm(f => ({ ...f, vigenciaVidaPago: e.target.value }))} className="mt-1 h-8" />
                    </div>
                    <div>
                      <Label className="text-xs">Fin de vigencia de pago</Label>
                      <Input type="date" value={editForm.vigenciaPagoFin} readOnly className="mt-1 h-8 bg-muted" />
                    </div>
                    <div>
                      <Label className="text-xs">Vigencia del producto (años)</Label>
                      <Input type="number" min="1" max="100" value={editForm.vigenciaVidaProducto} onChange={e => setEditForm(f => ({ ...f, vigenciaVidaProducto: e.target.value }))} className="mt-1 h-8" />
                    </div>
                    <div>
                      <Label className="text-xs">Fin de vigencia del producto</Label>
                      <Input type="date" value={editForm.vigenciaProductoFin} readOnly className="mt-1 h-8 bg-muted" />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Último Día de Pago</Label>
                    <Input type="date" value={editForm.ultimoDiaPago} onChange={e => setEditForm(f => ({ ...f, ultimoDiaPago: e.target.value }))} className="h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">Divisa</Label>
                    <Select value={editForm.divisas} onValueChange={v => setEditForm(f => ({ ...f, divisas: v }))}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MXN">MXN (Pesos)</SelectItem>
                        <SelectItem value="USD">USD (Dólares)</SelectItem>
                        <SelectItem value="EUR">EUR (Euros)</SelectItem>
                        <SelectItem value="UDIS">UDIS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {editForm.divisas === "UDIS" && (
                  <p className="col-span-2 text-xs text-muted-foreground">El tipo de conversión se consulta al momento de cobrar cada recibo.</p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Número de Recibo</Label>
                    <Input value={editForm.numeroRecibo} onChange={e => setEditForm(f => ({ ...f, numeroRecibo: e.target.value }))} className="h-8" placeholder="Ej: 1/6" />
                  </div>
                  <div>
                    <Label className="text-xs">Agente de cobranza</Label>
                    <Input value={editForm.agente} onChange={e => setEditForm(f => ({ ...f, agente: e.target.value }))} className="h-8" placeholder="Ej: AG001" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Vendedor de la póliza</Label>
                  <Select value={editForm.vendedorId || "__none__"} onValueChange={value => setEditForm(form => ({ ...form, vendedorId: value === "__none__" ? "" : value }))}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin vendedor asignado</SelectItem>
                      {usuariosSistema.map(item => <SelectItem key={item.id} value={item.id}>{item.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Primer recibo ({editForm.divisas})</Label>
                    <Input type="number" value={editForm.primerRecibo} onChange={e => setEditForm(f => ({ ...f, primerRecibo: e.target.value }))} className="h-8" placeholder="0.00" />
                  </div>
                  <div>
                    <Label className="text-xs">Recibos subsecuentes ({editForm.divisas})</Label>
                    <Input type="number" value={editForm.recibosSubsecuentes} onChange={e => setEditForm(f => ({ ...f, recibosSubsecuentes: e.target.value }))} className="h-8" placeholder="0.00" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Días Gracia — Primer Recibo</Label>
                    <Input type="number" min="0" value={editForm.diasGraciaPrimerRecibo} onChange={e => setEditForm(f => ({ ...f, diasGraciaPrimerRecibo: e.target.value }))} className="h-8" placeholder="Ej: 30" />
                  </div>
                  <div>
                    <Label className="text-xs">Días Gracia — Subsecuentes</Label>
                    <Input type="number" min="0" value={editForm.diasGraciaSubsecuentes} onChange={e => setEditForm(f => ({ ...f, diasGraciaSubsecuentes: e.target.value }))} className="h-8" placeholder="Ej: 15" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Comentarios</Label>
                  <Textarea value={editForm.comentarios} onChange={e => setEditForm(f => ({ ...f, comentarios: e.target.value }))} className="min-h-[80px] text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Notas</Label>
                  <Textarea value={editForm.notas} onChange={e => setEditForm(f => ({ ...f, notas: e.target.value }))} className="min-h-[60px] text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="outline" onClick={() => setModalEditarPoliza(false)}>Cancelar</Button>
                <Button onClick={guardarEdicion}>Guardar Cambios</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Modal Nueva Póliza */}
          <Dialog open={modalNuevaPoliza} onOpenChange={open => { setModalNuevaPoliza(open); if (!open) resetFormulario() }}>
            <DialogContent className="poliza-form-dialog glass-strong max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
              <DialogHeader className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-6 pt-6 pb-4 pr-12 backdrop-blur">
                <DialogTitle className="font-serif text-2xl font-bold text-slate-950 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <FileText className="w-5 h-5" />
                  </span>
                  Nueva Póliza
                </DialogTitle>
                <DialogDescription className="text-slate-600">Ingresa los datos de la nueva póliza. Los campos marcados con * son obligatorios.</DialogDescription>
              </DialogHeader>

              <div className="space-y-6 px-6 py-5">
                {/* Toggle cliente */}
                <div className="flex gap-2 rounded-xl border border-slate-200 bg-slate-100 p-1.5">
                  <button type="button" onClick={() => setModoNuevoCliente(true)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${modoNuevoCliente ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                    <UserPlus className="w-4 h-4" />Nuevo Cliente
                  </button>
                  <button type="button" onClick={() => setModoNuevoCliente(false)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${!modoNuevoCliente ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                    <User className="w-4 h-4" />Cliente Existente
                  </button>
                </div>

                {/* Autocompletar cliente existente */}
                {!modoNuevoCliente && (
                  <div className="space-y-2" ref={clienteRef}>
                    <Label>Cliente *</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Escribe el nombre del cliente..."
                        value={busquedaCliente}
                        onChange={e => { setBusquedaCliente(e.target.value); setMostrarSugerencias(true); setNuevaPoliza(p => ({ ...p, clienteId: "" })) }}
                        onFocus={() => setMostrarSugerencias(true)}
                        className="pl-9"
                      />
                      {nuevaPoliza.clienteId && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Badge variant="secondary" className="text-xs">✓ Seleccionado</Badge>
                        </div>
                      )}
                    </div>
                    {mostrarSugerencias && busquedaCliente && sugerenciasClientes.length > 0 && (
                      <div className="border rounded-lg bg-background/95 backdrop-blur shadow-lg z-50 max-h-48 overflow-y-auto">
                        {sugerenciasClientes.map(c => (
                          <button key={c.id} type="button"
                            className="w-full text-left px-4 py-2 hover:bg-muted/60 transition-colors text-sm border-b border-border/30 last:border-0"
                            onClick={() => { setNuevaPoliza(p => ({ ...p, clienteId: c.id })); setBusquedaCliente(c.nombre); setMostrarSugerencias(false) }}>
                            <p className="font-medium">{c.nombre}</p>
                            {c.empresa && <p className="text-xs text-muted-foreground">{c.empresa}</p>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Nuevo cliente */}
                {modoNuevoCliente && (
                  <div className="space-y-4 rounded-2xl border border-primary/20 bg-blue-50/70 p-4 shadow-sm">
                    <p className="text-sm font-semibold text-primary flex items-center gap-2"><UserPlus className="w-4 h-4" />Datos del Nuevo Cliente</p>
                    <PdfUploadZone
                      onExtracted={data => {
                        setNuevoCliente(n => ({
                          ...n,
                          nombre: data.nombre && !n.nombre ? data.nombre : n.nombre,
                          email: data.email && !n.email ? data.email : n.email,
                          telefono: data.telefono && !n.telefono ? data.telefono : n.telefono,
                          empresa: data.empresa && !n.empresa ? data.empresa : n.empresa,
                        }))
                        setNuevaPoliza(p => ({
                          ...p,
                          numeroPoliza: data.numeroPoliza && !p.numeroPoliza ? data.numeroPoliza : p.numeroPoliza,
                          nombreAsegurado: data.nombre && !p.nombreAsegurado ? data.nombre : p.nombreAsegurado,
                          prima: data.prima && !p.prima ? data.prima : p.prima,
                          primaTotal: data.primaTotal && !p.primaTotal ? data.primaTotal : p.primaTotal,
                          vigenciaInicio: data.vigenciaInicio && !p.vigenciaInicio ? data.vigenciaInicio : p.vigenciaInicio,
                          vigenciaFin: data.vigenciaFin && !p.vigenciaFin ? data.vigenciaFin : p.vigenciaFin,
                          agente: data.agente && !p.agente ? data.agente : p.agente,
                          numeroRecibo: data.numeroRecibo && !p.numeroRecibo ? data.numeroRecibo : p.numeroRecibo,
                          incisoEndoso: data.incisoEndoso && !p.incisoEndoso ? data.incisoEndoso : p.incisoEndoso,
                          ultimoDiaPago: data.ultimoDiaPago && !p.ultimoDiaPago ? data.ultimoDiaPago : p.ultimoDiaPago,
                          formaPago: (data.formaPago as any) && !p.formaPago ? data.formaPago as any : p.formaPago,
                          tipoPago: (data.tipoPago as any) && !p.tipoPago ? data.tipoPago as any : p.tipoPago,
                          ramo: (data.ramo as any) && !p.ramo ? data.ramo as any : p.ramo,
                          divisas: data.divisas && p.divisas === "MXN" ? data.divisas : p.divisas,
                          diasGraciaPrimerRecibo: data.diasGraciaPrimerRecibo && !p.diasGraciaPrimerRecibo ? data.diasGraciaPrimerRecibo : p.diasGraciaPrimerRecibo,
                          diasGraciaSubsecuentes: data.diasGraciaSubsecuentes && !p.diasGraciaSubsecuentes ? data.diasGraciaSubsecuentes : p.diasGraciaSubsecuentes,
                          primerRecibo: data.primerRecibo && !p.primerRecibo ? data.primerRecibo : p.primerRecibo,
                          recibosSubsecuentes: data.recibosSubsecuentes && !p.recibosSubsecuentes ? data.recibosSubsecuentes : p.recibosSubsecuentes,
                        }))
                        if (data.compania) {
                          const match = companias.find(c => c.nombre.toLowerCase().includes(data.compania!.toLowerCase()))
                          if (match) setNuevaPoliza(p => ({ ...p, companiaId: match.id }))
                        }
                      }}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: "Nombre Completo *", key: "nombre", placeholder: "Juan Pérez García" },
                        { label: "Teléfono *", key: "telefono", placeholder: "+52 55 1234 5678" },
                        { label: "Email", key: "email", placeholder: "juan@email.com" },
                        { label: "Empresa", key: "empresa", placeholder: "Empresa SA de CV" },
                      ].map(f => (
                        <div key={f.key} className="space-y-2">
                          <Label>{f.label}</Label>
                          <Input placeholder={f.placeholder} value={(nuevoCliente as any)[f.key]}
                            onChange={e => setNuevoCliente(n => ({ ...n, [f.key]: e.target.value }))} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nombre asegurado */}
                <div className="space-y-2">
                  <Label>Nombre del Asegurado</Label>
                  <Input placeholder="Puede diferir del nombre del cliente" value={nuevaPoliza.nombreAsegurado}
                    onChange={e => setNuevaPoliza(p => ({ ...p, nombreAsegurado: e.target.value }))} />
                </div>

                {/* Aseguradora y Ramo */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Aseguradora *</Label>
                    <Select value={nuevaPoliza.companiaId} onValueChange={v => setNuevaPoliza(p => ({ ...p, companiaId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                      <SelectContent>
                        {companias.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Ramo *</Label>
                    <Select value={nuevaPoliza.ramo} onValueChange={v => setNuevaPoliza(p => ({ ...p, ramo: v as any }))}>
                      <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="autos">Autos</SelectItem>
                        <SelectItem value="vida">Vida</SelectItem>
                        <SelectItem value="gastos-medicos">Gastos Médicos</SelectItem>
                        <SelectItem value="empresa">Empresa</SelectItem>
                        <SelectItem value="hogar">Hogar</SelectItem>
                        <SelectItem value="flotilla">Flotilla</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* # Póliza e Inciso */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Número de Póliza *</Label>
                    <Input placeholder="Ej: VCI852350000" value={nuevaPoliza.numeroPoliza}
                      onChange={e => setNuevaPoliza(p => ({ ...p, numeroPoliza: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Inciso o Endoso</Label>
                    <Input placeholder="Ej: 652 | AI749377" value={nuevaPoliza.incisoEndoso}
                      onChange={e => setNuevaPoliza(p => ({ ...p, incisoEndoso: e.target.value }))} />
                  </div>
                </div>

                {/* Vigencia */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Inicio de vigencia anual *</Label>
                    <Input type="date" value={nuevaPoliza.vigenciaInicio}
                      onChange={e => setNuevaPoliza(p => ({ ...p, vigenciaInicio: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Fin de vigencia anual *</Label>
                    <Input type="date" value={nuevaPoliza.vigenciaFin} readOnly className="bg-muted" />
                  </div>
                </div>

                {/* Prima y Forma de pago */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Divisas</Label>
                    <Select value={nuevaPoliza.divisas} onValueChange={v => setNuevaPoliza(p => ({ ...p, divisas: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MXN">MXN (Pesos Mexicanos)</SelectItem>
                        <SelectItem value="USD">USD (Dólares)</SelectItem>
                        <SelectItem value="EUR">EUR (Euros)</SelectItem>
                        <SelectItem value="UDIS">UDIS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{nuevaPoliza.ramo === "vida" ? "Prima anual" : "Prima total"} ({nuevaPoliza.divisas}) *</Label>
                    <Input type="number" placeholder="Ej: 12500" value={nuevaPoliza.prima}
                      onChange={e => setNuevaPoliza(p => ({ ...p, prima: e.target.value }))} />
                  </div>
                </div>
                {nuevaPoliza.divisas === "UDIS" && (
                  <p className="text-xs text-muted-foreground">El valor en pesos se obtiene dinámicamente de Banco de México al cobrar cada recibo.</p>
                )}

                {/* Prima anual y forma de pago */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prima total</Label>
                    <Input type="number" placeholder="Auto-calculada" value={nuevaPoliza.primaTotal}
                      onChange={e => setNuevaPoliza(p => ({ ...p, primaTotal: e.target.value }))}
                      disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground">En vida: prima anual × años de pago; en otros ramos coincide con la prima total.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Forma de Pago *</Label>
                    <Select value={nuevaPoliza.formaPago} onValueChange={v => setNuevaPoliza(p => ({ ...p, formaPago: v as any }))}>
                      <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mensual">Mensual</SelectItem>
                        <SelectItem value="trimestral">Trimestral</SelectItem>
                        <SelectItem value="semestral">Semestral</SelectItem>
                        <SelectItem value="anual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Días de gracia según tipo de recibo */}
                {nuevaPoliza.formaPago && (
                  <div className="space-y-3 p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                    <Label className="font-semibold text-blue-700 dark:text-blue-400">Días de Gracia</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-blue-600">Día de Gracia — Primer Recibo</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Ej: 30"
                          value={nuevaPoliza.diasGraciaPrimerRecibo}
                          onChange={e => setNuevaPoliza(p => ({ ...p, diasGraciaPrimerRecibo: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground">Días de gracia para el primer pago</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-blue-600">Día de Gracia — Recibos Subsecuentes</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Ej: 15"
                          value={nuevaPoliza.diasGraciaSubsecuentes}
                          onChange={e => setNuevaPoliza(p => ({ ...p, diasGraciaSubsecuentes: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground">Días de gracia para pagos siguientes</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Primer recibo y recibos subsecuentes */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Primer recibo ({nuevaPoliza.divisas})</Label>
                    <Input placeholder="Ej: $5,000" value={nuevaPoliza.primerRecibo}
                      onChange={e => setNuevaPoliza(p => ({ ...p, primerRecibo: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Recibos subsecuentes ({nuevaPoliza.divisas})</Label>
                    <Input placeholder="Ej: $2,500" value={nuevaPoliza.recibosSubsecuentes}
                      onChange={e => setNuevaPoliza(p => ({ ...p, recibosSubsecuentes: e.target.value }))} />
                  </div>
                </div>

                {/* Tipo de pago */}
                <div className="space-y-2">
                  <Label>Tipo de Pago</Label>
                  <Select value={nuevaPoliza.tipoPago} onValueChange={v => setNuevaPoliza(p => ({ ...p, tipoPago: v as any }))}>
                    <SelectTrigger><SelectValue placeholder="Seleccione el tipo de pago" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">💵 Efectivo</SelectItem>
                      <SelectItem value="transferencia">🏦 Transferencia Bancaria</SelectItem>
                      <SelectItem value="tarjeta">💳 Tarjeta de Crédito/Débito</SelectItem>
                      <SelectItem value="domiciliacion">🔄 Domiciliación</SelectItem>
                      <SelectItem value="cheque">📝 Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Selector de vehículo (solo autos) */}
                {nuevaPoliza.ramo === "autos" && (
                  <div className="space-y-3 p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                    <VehiculoSelector
                      selected={vehiculoSeleccionado}
                      onSelect={(v) => {
                        setVehiculoSeleccionado(v)
                        if (v) {
                          setNuevaPoliza(p => ({
                            ...p,
                            nombreAsegurado: p.nombreAsegurado || v.marcaDescripcion || "",
                          }))
                        }
                      }}
                    />
                  </div>
                )}

                {/* Datos exclusivos de pólizas de vida */}
                {nuevaPoliza.ramo === "vida" && (
                  <div className="space-y-3 p-4 border border-purple-200 dark:border-purple-800 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                    <div>
                      <Label className="font-semibold">Datos de la póliza de vida</Label>
                      <p className="text-xs text-muted-foreground">La prima y la forma de pago seleccionadas arriba aplican a esta póliza.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Vigencia de pago (años) *</Label>
                        <Input type="number" min="1" max="100" placeholder="Ej: 10 años"
                          value={nuevaPoliza.vigenciaVidaPago}
                          onChange={e => setNuevaPoliza(p => ({ ...p, vigenciaVidaPago: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Fin de vigencia de pago</Label>
                        <Input type="date" value={nuevaPoliza.vigenciaPagoFin} readOnly className="bg-muted" />
                      </div>
                      <div className="space-y-2">
                        <Label>Vigencia del producto (años) *</Label>
                        <Input type="number" min="1" max="100" placeholder="Ej: 20 años"
                          value={nuevaPoliza.vigenciaVidaProducto}
                          onChange={e => setNuevaPoliza(p => ({ ...p, vigenciaVidaProducto: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Fin de vigencia del producto</Label>
                        <Input type="date" value={nuevaPoliza.vigenciaProductoFin} readOnly className="bg-muted" />
                      </div>
                    </div>
                    {nuevaPoliza.numeroRecibo && (
                      <p className="text-xs text-purple-600">📊 Recibos calculados según el plazo de pago: {nuevaPoliza.numeroRecibo}</p>
                    )}
                  </div>
                )}

                {/* # Recibo */}
                <div className="space-y-2">
                  <Label># Recibo</Label>
                  <Input placeholder="Ej: 1/1, 2/4" value={nuevaPoliza.numeroRecibo}
                    onChange={e => setNuevaPoliza(p => ({ ...p, numeroRecibo: e.target.value }))} />
                  <p className="text-xs text-muted-foreground">Formato: recibo actual / total de recibos</p>
                </div>

                {/* Agente */}
                <div className="space-y-2">
                  <Label>ID Agente de cobranza</Label>
                  <Input placeholder="Ej: AG001" value={nuevaPoliza.agente}
                    onChange={e => setNuevaPoliza(p => ({ ...p, agente: e.target.value }))} />
                  <p className="text-xs text-muted-foreground">El registro en sistema de cobranza se realiza automáticamente</p>
                </div>
                <div className="space-y-2">
                  <Label>Vendedor de la póliza</Label>
                  <Select value={nuevaPoliza.vendedorId || "__none__"} onValueChange={value => setNuevaPoliza(poliza => ({ ...poliza, vendedorId: value === "__none__" ? "" : value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin vendedor asignado</SelectItem>
                      {usuariosSistema.map(item => <SelectItem key={item.id} value={item.id}>{item.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Comentarios */}
                <div className="space-y-2">
                  <Label>Comentarios</Label>
                  <Textarea placeholder="Notas adicionales sobre la póliza..."
                    value={nuevaPoliza.comentarios}
                    onChange={e => setNuevaPoliza(p => ({ ...p, comentarios: e.target.value }))}
                    className="min-h-[80px]" />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
                  <Button variant="outline" onClick={() => { setModalNuevaPoliza(false); resetFormulario() }}>Cancelar</Button>
                  <Button onClick={handleSubmit} disabled={savingPoliza}>
                    {savingPoliza ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    {savingPoliza ? "Guardando..." : (modoNuevoCliente ? "Crear Cliente y Póliza" : "Crear Póliza")}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Modal Renovar */}
          <Dialog open={modalRenovar} onOpenChange={setModalRenovar}>
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-primary" /> Renovar Póliza
                </DialogTitle>
                <DialogDescription>
                  Inicia el proceso de renovación para {polizaAccion?.numeroPoliza}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="p-4 rounded-xl bg-muted/50 space-y-2">
                  <p className="text-sm text-muted-foreground">Póliza actual</p>
                  <p className="font-semibold">{polizaAccion?.numeroPoliza}</p>
                  <p className="text-sm text-muted-foreground">
                    Vigencia: {polizaAccion?.vigenciaInicio} a {polizaAccion?.vigenciaFin}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Prima total: ${polizaAccion?.prima.toLocaleString()}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Se abrirá el formulario de nueva póliza para crear la renovación. Los datos de la póliza actual se usarán como referencia.
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setModalRenovar(false)}>
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={confirmarRenovacion}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Continuar
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={modalCancelarRenovacion} onOpenChange={setModalCancelarRenovacion}>
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle>Cancelar renovación</DialogTitle>
                <DialogDescription>La póliza original permanecerá intacta y podrá renovarse nuevamente.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-3">
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="font-semibold">{polizaAccion?.numeroPoliza}</p>
                  <p className="text-xs text-muted-foreground">Renovación en proceso</p>
                </div>
                <div className="space-y-2">
                  <Label>Motivo de cancelación *</Label>
                  <Textarea value={motivoCancelacion} onChange={event => setMotivoCancelacion(event.target.value)} className="min-h-[100px]" placeholder="Indica por qué se cancela esta renovación" />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setModalCancelarRenovacion(false)}>Atrás</Button>
                <Button variant="destructive" className="flex-1" onClick={confirmarCancelarRenovacion}>Cancelar renovación</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Modal Cancelar */}
          <Dialog open={modalCancelar} onOpenChange={setModalCancelar}>
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <Trash2 className="w-5 h-5" /> Cancelar Póliza
                </DialogTitle>
                <DialogDescription>
                  Indica el motivo de cancelación para {polizaAccion?.numeroPoliza}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 space-y-2">
                  <p className="text-sm text-muted-foreground">Póliza a cancelar</p>
                  <p className="font-semibold">{polizaAccion?.numeroPoliza}</p>
                  <p className="text-sm text-muted-foreground">
                    Prima total: ${polizaAccion?.prima.toLocaleString()}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="motivo" className="text-sm font-semibold">
                    Motivo de cancelación *
                  </Label>
                  <Textarea
                    id="motivo"
                    placeholder="Ej: Solicitud del cliente, falta de pago, cambio de asegurador..."
                    value={motivoCancelacion}
                    onChange={e => setMotivoCancelacion(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Esta acción marcará la póliza como cancelada y registrará el motivo en las notas.
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setModalCancelar(false)}>
                  Atrás
                </Button>
                <Button variant="destructive" className="flex-1" onClick={confirmarCancelacion}>
                  <Trash2 className="w-4 h-4 mr-2" /> Cancelar Póliza
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default function PolizasPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
      <PolizasContent />
    </Suspense>
  )
}
