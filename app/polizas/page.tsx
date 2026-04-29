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
import { Plus, FileText, UserPlus, User, Search, Edit2, X, RefreshCw, Trash2, MoreVertical } from "lucide-react"
import { PdfUploadZone } from "@/components/pdf-upload-zone"
import { toast } from "sonner"

const ESTATUS_COLORS: Record<string, string> = {
  activa: "bg-green-500/10 text-green-500 border-green-500/20",
  "por-renovar": "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  vencida: "bg-red-500/10 text-red-500 border-red-500/20",
  cancelada: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  gracia: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  rehabilitada: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  vigente: "bg-green-500/10 text-green-600 border-green-500/20",
  "en-movimientos": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "cancelada-cliente": "bg-gray-500/10 text-gray-400 border-gray-500/20",
  "cancelada-falta-pago": "bg-red-500/10 text-red-400 border-red-500/20",
}

function PolizasContent() {
  const searchParams = useSearchParams()
  const { polizas, clientes, companias, agregarPoliza, actualizarPoliza, agregarCliente } = useSupabase()

  const [busqueda, setBusqueda] = useState("")
  const [filtroCompania, setFiltroCompania] = useState("todas")
  const [filtroRamo, setFiltroRamo] = useState("todos")
  const [filtroEstatus, setFiltroEstatus] = useState("todos")
  const [polizaSeleccionada, setPolizaSeleccionada] = useState<SPoliza | null>(null)
  const [modalNuevaPoliza, setModalNuevaPoliza] = useState(false)
  const [modalEditarPoliza, setModalEditarPoliza] = useState(false)
  const [polizaEditar, setPolizaEditar] = useState<SPoliza | null>(null)
  const [modoNuevoCliente, setModoNuevoCliente] = useState(false)
  const [modalRenovar, setModalRenovar] = useState(false)
  const [modalCancelar, setModalCancelar] = useState(false)
  const [polizaAccion, setPolizaAccion] = useState<SPoliza | null>(null)
  const [motivoCancelacion, setMotivoCancelacion] = useState("")

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
    vigenciaInicio: "", vigenciaFin: "", prima: "", formaPago: "" as SPoliza["formaPago"] | "",
    tipoPago: "" as "efectivo" | "transferencia" | "tarjeta" | "domiciliacion" | "cheque" | "",
    anosVidaProducto: "", agente: "", ultimoDiaPago: "", numeroRecibo: "",
    registroSistemaCobranza: false, comentarios: "", notas: "", marcaActualizacion: false,
    divisas: "MXN", primaTotal: "", diasGraciaPrimerRecibo: "", diasGraciaSubsecuentes: "", primerRecibo: "", recibosSubsecuentes: "",
  })

  const [nuevoCliente, setNuevoCliente] = useState({ nombre: "", email: "", telefono: "", empresa: "" })

  // Estado edición
  const [editForm, setEditForm] = useState({
    estatus: "" as SPoliza["estatus"] | "",
    comentarios: "", notas: "", prima: "", formaPago: "" as SPoliza["formaPago"] | "",
    ultimoDiaPago: "", vigenciaFin: "",
  })

  useEffect(() => {
    const filtro = searchParams.get("filtro")
    if (filtro === "renovaciones") setFiltroEstatus("por-renovar")
  }, [searchParams])

  // Calcular prima total, recibos subsecuentes y número de recibos automáticamente
  useEffect(() => {
    if (nuevaPoliza.prima && nuevaPoliza.formaPago && nuevaPoliza.primerRecibo && nuevaPoliza.vigenciaInicio && nuevaPoliza.vigenciaFin) {
      const primaNum = parseFloat(nuevaPoliza.prima)
      const primerReciboNum = parseFloat(nuevaPoliza.primerRecibo)
      
      if (!isNaN(primaNum) && !isNaN(primerReciboNum) && primaNum > 0 && primerReciboNum > 0) {
        try {
          // Calcular período real entre fecha inicio y fin
          const fechaInicio = new Date(nuevaPoliza.vigenciaInicio)
          const fechaFin = new Date(nuevaPoliza.vigenciaFin)
          
          // Calcular diferencia en días
          const diferenciaTiempo = fechaFin.getTime() - fechaInicio.getTime()
          const diferenciaDias = Math.ceil(diferenciaTiempo / (1000 * 60 * 60 * 24))
          const diferenciaMeses = diferenciaDias / 30.44 // promedio de días por mes
          
          // Determinar cantidad de recibos según forma de pago y período real
          const recibosFormaPago = {
            mensual: Math.ceil(diferenciaMeses),
            trimestral: Math.ceil(diferenciaMeses / 3),
            semestral: Math.ceil(diferenciaMeses / 6),
            anual: Math.ceil(diferenciaMeses / 12)
          }[nuevaPoliza.formaPago as string] ?? 1

          // Asegurar mínimo 1 recibo
          const totalRecibos = Math.max(1, recibosFormaPago)

          // Calcular prima total (anual)
          const primaTotalCalculada = primaNum

          // Calcular recibos subsecuentes
          const primaRestante = primaTotalCalculada - primerReciboNum
          const recibosSubsecuentesNum = totalRecibos - 1
          const reciboPorSubsecuente = recibosSubsecuentesNum > 0 ? primaRestante / recibosSubsecuentesNum : 0

          // Actualizar campos
          setNuevaPoliza(p => ({
            ...p,
            primaTotal: primaTotalCalculada.toString(),
            recibosSubsecuentes: reciboPorSubsecuente > 0 ? reciboPorSubsecuente.toFixed(2) : "0",
            numeroRecibo: `1/${totalRecibos}`
          }))
        } catch (error) {
          console.error("Error al calcular período:", error)
        }
      }
    }

    // Para seguros de vida, calcular recibos según años
    if (nuevaPoliza.ramo === "vida" && nuevaPoliza.anosVidaProducto && nuevaPoliza.formaPago) {
      const anos = parseInt(nuevaPoliza.anosVidaProducto)
      if (!isNaN(anos) && anos > 0) {
        const recibosAnuales = { mensual: 12, trimestral: 4, semestral: 2, anual: 1 }[nuevaPoliza.formaPago as string] ?? 1
        const totalRecibos = anos * recibosAnuales
        setNuevaPoliza(p => ({ ...p, numeroRecibo: `1/${totalRecibos}` }))
      }
    }
  }, [nuevaPoliza.prima, nuevaPoliza.formaPago, nuevaPoliza.primerRecibo, nuevaPoliza.vigenciaInicio, nuevaPoliza.vigenciaFin, nuevaPoliza.ramo, nuevaPoliza.anosVidaProducto])

  const resetFormulario = () => {
    setNuevaPoliza({
      clienteId: "", companiaId: "", ramo: "", numeroPoliza: "", incisoEndoso: "",
      nombreAsegurado: "", vigenciaInicio: "", vigenciaFin: "", prima: "", formaPago: "",
      tipoPago: "", anosVidaProducto: "", agente: "", ultimoDiaPago: "", numeroRecibo: "",
      registroSistemaCobranza: false, comentarios: "", notas: "", marcaActualizacion: false,
      divisas: "MXN", primaTotal: "", diasGraciaPrimerRecibo: "", diasGraciaSubsecuentes: "", primerRecibo: "", recibosSubsecuentes: "",
    })
    setNuevoCliente({ nombre: "", email: "", telefono: "", empresa: "" })
    setBusquedaCliente("")
    setModoNuevoCliente(false)
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
    if (nuevaPoliza.ramo === "vida" && !nuevaPoliza.anosVidaProducto) {
      toast.error("Para seguros de vida especifique los años del producto")
      return
    }
    const primaNum = parseFloat(nuevaPoliza.prima)
    if (isNaN(primaNum) || primaNum <= 0) {
      toast.error("La prima debe ser un número válido mayor a 0")
      return
    }

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
        fechaRegistro: new Date().toISOString().split("T")[0],
        estatus: "activo",
      })
      if (!nuevoId) return
      clienteIdFinal = nuevoId
    }

    await agregarPoliza({
      clienteId: clienteIdFinal,
      companiaId: nuevaPoliza.companiaId,
      ramo: nuevaPoliza.ramo as SPoliza["ramo"],
      numeroPoliza: nuevaPoliza.numeroPoliza,
      vigenciaInicio: nuevaPoliza.vigenciaInicio,
      vigenciaFin: nuevaPoliza.vigenciaFin,
      prima: primaNum,
      formaPago: nuevaPoliza.formaPago as SPoliza["formaPago"],
      estatus: "activa",
      folios: [],
      tramites: 0,
      primaEmitida: primaNum,
      primaCobrada: 0,
      fechaEmision: new Date().toISOString().split("T")[0],
      agente: nuevaPoliza.agente || "AG001",
      incisoEndoso: nuevaPoliza.incisoEndoso || undefined,
      nombreAsegurado: nuevaPoliza.nombreAsegurado || undefined,
      ultimoDiaPago: nuevaPoliza.ultimoDiaPago || undefined,
      numeroRecibo: nuevaPoliza.numeroRecibo || "1/1",
      primaTotalRecibo: primaNum,
      tipoPago: nuevaPoliza.tipoPago || undefined,
      registroSistemaCobranza: nuevaPoliza.registroSistemaCobranza,
      comentarios: nuevaPoliza.comentarios || undefined,
      notas: nuevaPoliza.notas || undefined,
      marcaActualizacion: nuevaPoliza.marcaActualizacion,
      anosVidaProducto: nuevaPoliza.anosVidaProducto ? parseInt(nuevaPoliza.anosVidaProducto) : undefined,
      primerRecibo: nuevaPoliza.primerRecibo ? parseFloat(nuevaPoliza.primerRecibo) : undefined,
      recibosSubsecuentes: nuevaPoliza.recibosSubsecuentes ? parseFloat(nuevaPoliza.recibosSubsecuentes) : undefined,
      diasGraciaPrimerRecibo: nuevaPoliza.diasGraciaPrimerRecibo ? parseInt(nuevaPoliza.diasGraciaPrimerRecibo) : undefined,
      diasGraciaSubsecuentes: nuevaPoliza.diasGraciaSubsecuentes ? parseInt(nuevaPoliza.diasGraciaSubsecuentes) : undefined,
    })

    setModalNuevaPoliza(false)
    resetFormulario()
  }

  const abrirEdicion = (poliza: SPoliza) => {
    setPolizaEditar(poliza)
    setEditForm({
      estatus: poliza.estatus,
      comentarios: poliza.comentarios || "",
      notas: poliza.notas || "",
      prima: poliza.prima.toString(),
      formaPago: poliza.formaPago,
      ultimoDiaPago: poliza.ultimoDiaPago || "",
      vigenciaFin: poliza.vigenciaFin,
    })
    setPolizaSeleccionada(null)
    setModalEditarPoliza(true)
  }

  const guardarEdicion = async () => {
    if (!polizaEditar) return
    const primaNum = parseFloat(editForm.prima)
    await actualizarPoliza(polizaEditar.id, {
      estatus: editForm.estatus as SPoliza["estatus"],
      comentarios: editForm.comentarios || undefined,
      notas: editForm.notas || undefined,
      prima: isNaN(primaNum) ? polizaEditar.prima : primaNum,
      formaPago: editForm.formaPago as SPoliza["formaPago"],
      ultimoDiaPago: editForm.ultimoDiaPago || undefined,
      vigenciaFin: editForm.vigenciaFin,
    })
    setModalEditarPoliza(false)
    setPolizaEditar(null)
  }

  const handleRenovar = (poliza: SPoliza) => {
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
    setModalNuevaPoliza(true)
    setModalRenovar(false)
    toast.success("Abre el formulario de nueva póliza para renovar")
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
  })

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
                    <SelectItem value="activa">Activa</SelectItem>
                    <SelectItem value="vigente">Vigente</SelectItem>
                    <SelectItem value="por-renovar">Por Renovar</SelectItem>
                    <SelectItem value="en-movimientos">En Movimientos</SelectItem>
                    <SelectItem value="gracia">En Gracia</SelectItem>
                    <SelectItem value="vencida">Vencida</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                    <SelectItem value="cancelada-cliente">Cancelada (Cliente)</SelectItem>
                    <SelectItem value="cancelada-falta-pago">Cancelada (Falta Pago)</SelectItem>
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
                    <th className="text-left p-3 font-semibold">Prima</th>
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
                          <p>{new Date(poliza.vigenciaInicio).toLocaleDateString("es-MX")}</p>
                          <p className="text-muted-foreground">{new Date(poliza.vigenciaFin).toLocaleDateString("es-MX")}</p>
                        </td>
                        <td className="p-3">
                          <p className="font-semibold">${poliza.prima.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground capitalize">{poliza.formaPago}</p>
                        </td>
                        <td className="p-3">
                          <Badge className={ESTATUS_COLORS[poliza.estatus] || ESTATUS_COLORS.activa} variant="outline">
                            {poliza.estatus}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                              onClick={e => { e.stopPropagation(); handleRenovar(poliza) }}>
                              <RefreshCw className="w-3 h-3 mr-1" /> Renovar
                            </Button>
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
                        <Badge className={ESTATUS_COLORS[poliza.estatus] || ESTATUS_COLORS.activa} variant="outline">{poliza.estatus}</Badge>
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
                      <p className="text-xs text-muted-foreground">{new Date(poliza.vigenciaFin).toLocaleDateString("es-MX")}</p>
                    </div>
                  </GlassCard></div>
                </motion.div>
              )
            })}
          </div>

          {/* Modal detalle */}
          <Dialog open={!!polizaSeleccionada} onOpenChange={() => setPolizaSeleccionada(null)}>
            <DialogContent className="glass-strong max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">Detalle de Póliza</DialogTitle>
                <DialogDescription>Información completa de la póliza</DialogDescription>
              </DialogHeader>
              {polizaSeleccionada && (() => {
                const cliente = clientes.find(c => c.id === polizaSeleccionada.clienteId)
                const compania = companias.find(c => c.id === polizaSeleccionada.companiaId)
                return (
                  <div className="space-y-4 mt-2">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {[
                        ["Cliente", cliente?.nombre || "—"],
                        ["# Póliza", polizaSeleccionada.numeroPoliza],
                        ["Asegurado", polizaSeleccionada.nombreAsegurado || cliente?.nombre || "—"],
                        ["Aseguradora", compania?.nombre || "—"],
                        ["Ramo", polizaSeleccionada.ramo.replace("-", " ")],
                        ["Prima", `$${polizaSeleccionada.prima.toLocaleString()}`],
                        ["Forma de Pago", polizaSeleccionada.formaPago],
                        ["Vigencia Inicio", new Date(polizaSeleccionada.vigenciaInicio).toLocaleDateString("es-MX")],
                        ["Vigencia Fin", new Date(polizaSeleccionada.vigenciaFin).toLocaleDateString("es-MX")],
                        ["Último Día Pago", polizaSeleccionada.ultimoDiaPago ? new Date(polizaSeleccionada.ultimoDiaPago).toLocaleDateString("es-MX") : "—"],
                        ["# Recibo", polizaSeleccionada.numeroRecibo || "1/1"],
                        ["Agente", polizaSeleccionada.agente || "—"],
                      ].map(([label, value]) => (
                        <div key={label} className="space-y-1">
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="font-medium capitalize">{value}</p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Estatus</p>
                      <Badge className={ESTATUS_COLORS[polizaSeleccionada.estatus] || ESTATUS_COLORS.activa} variant="outline">
                        {polizaSeleccionada.estatus}
                      </Badge>
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
              <div className="space-y-4 mt-2">
                <div>
                  <Label className="text-xs">Estatus</Label>
                  <Select value={editForm.estatus} onValueChange={v => setEditForm(f => ({ ...f, estatus: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activa">Activa</SelectItem>
                      <SelectItem value="vigente">Vigente</SelectItem>
                      <SelectItem value="en-movimientos">En Movimientos</SelectItem>
                      <SelectItem value="por-renovar">Por Renovar</SelectItem>
                      <SelectItem value="gracia">En Período de Gracia</SelectItem>
                      <SelectItem value="vencida">Vencida</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                      <SelectItem value="cancelada-cliente">Cancelada a Petición del Cliente</SelectItem>
                      <SelectItem value="cancelada-falta-pago">Cancelada por Falta de Pago</SelectItem>
                      <SelectItem value="rehabilitada">Rehabilitada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Prima</Label>
                    <Input type="number" value={editForm.prima} onChange={e => setEditForm(f => ({ ...f, prima: e.target.value }))} className="h-8" />
                  </div>
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
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Vigencia Fin</Label>
                    <Input type="date" value={editForm.vigenciaFin} onChange={e => setEditForm(f => ({ ...f, vigenciaFin: e.target.value }))} className="h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">Último Día de Pago</Label>
                    <Input type="date" value={editForm.ultimoDiaPago} onChange={e => setEditForm(f => ({ ...f, ultimoDiaPago: e.target.value }))} className="h-8" />
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
            <DialogContent className="glass-strong max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl flex items-center gap-2">
                  <FileText className="w-6 h-6" />Nueva Póliza
                </DialogTitle>
                <DialogDescription>Ingresa los datos de la nueva póliza</DialogDescription>
              </DialogHeader>

              <div className="space-y-5 mt-4">
                {/* Toggle cliente */}
                <div className="flex gap-2 p-1 bg-muted rounded-lg">
                  <button type="button" onClick={() => setModoNuevoCliente(false)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${!modoNuevoCliente ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                    <User className="w-4 h-4" />Cliente Existente
                  </button>
                  <button type="button" onClick={() => setModoNuevoCliente(true)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${modoNuevoCliente ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                    <UserPlus className="w-4 h-4" />Nuevo Cliente
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
                  <div className="space-y-4 p-4 border border-primary/20 rounded-2xl bg-primary/5">
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
                    <Label>Vigencia Inicio *</Label>
                    <Input type="date" value={nuevaPoliza.vigenciaInicio}
                      onChange={e => setNuevaPoliza(p => ({ ...p, vigenciaInicio: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Vigencia Fin *</Label>
                    <Input type="date" value={nuevaPoliza.vigenciaFin}
                      onChange={e => setNuevaPoliza(p => ({ ...p, vigenciaFin: e.target.value }))} />
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
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Prima Total *</Label>
                    <Input type="number" placeholder="Ej: 12500" value={nuevaPoliza.prima}
                      onChange={e => setNuevaPoliza(p => ({ ...p, prima: e.target.value }))} />
                  </div>
                </div>

                {/* Prima anual y forma de pago */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prima Anual</Label>
                    <Input type="number" placeholder="Auto-calculada" value={nuevaPoliza.primaTotal}
                      onChange={e => setNuevaPoliza(p => ({ ...p, primaTotal: e.target.value }))}
                      disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground">Se calcula automáticamente según forma de pago</p>
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
                    <Label>Primer Recibo</Label>
                    <Input placeholder="Ej: $5,000" value={nuevaPoliza.primerRecibo}
                      onChange={e => setNuevaPoliza(p => ({ ...p, primerRecibo: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Recibos Subsecuentes</Label>
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

                {/* Años vida (solo vida) */}
                {nuevaPoliza.ramo === "vida" && (
                  <div className="space-y-2 p-4 border border-purple-200 dark:border-purple-800 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                    <Label className="font-semibold">Años de Vida del Producto *</Label>
                    <Input type="number" min="1" max="100" placeholder="Ej: 10, 20, 30"
                      value={nuevaPoliza.anosVidaProducto}
                      onChange={e => setNuevaPoliza(p => ({ ...p, anosVidaProducto: e.target.value }))} />
                    {nuevaPoliza.numeroRecibo && (
                      <p className="text-xs text-purple-600">📊 Recibos calculados: {nuevaPoliza.numeroRecibo}</p>
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
                  <Label>ID Agente</Label>
                  <Input placeholder="Ej: AG001" value={nuevaPoliza.agente}
                    onChange={e => setNuevaPoliza(p => ({ ...p, agente: e.target.value }))} />
                  <p className="text-xs text-muted-foreground">El registro en sistema de cobranza se realiza automáticamente</p>
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
                  <Button onClick={handleSubmit}>
                    <Plus className="w-4 h-4 mr-2" />
                    {modoNuevoCliente ? "Crear Cliente y Póliza" : "Crear Póliza"}
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
                    Prima: ${polizaAccion?.prima.toLocaleString()}
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
                    Prima: ${polizaAccion?.prima.toLocaleString()}
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
