"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { PageHeader } from "@/components/page-header"
import { GlassCard } from "@/components/glass-card"
import { usePolizas } from "@/contexts/polizas-context"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { clientes as clientesData, type Cliente } from "@/data/clientes"
import { companias } from "@/data/companias"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { motion } from "framer-motion"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Poliza } from "@/data/polizas"
import { ProtectedRoute } from "@/components/protected-route"
import { Plus, FileText, UserPlus, User } from "lucide-react"
import { toast } from "sonner"

export default function PolizasPage() {
  const searchParams = useSearchParams()
  const { polizas, agregarPoliza } = usePolizas()
  const [clientes, setClientes] = useLocalStorage<Cliente[]>("crm-clientes", clientesData)
  const [filtroCompania, setFiltroCompania] = useState<string>("todas")
  const [filtroRamo, setFiltroRamo] = useState<string>("todos")
  const [filtroEstatus, setFiltroEstatus] = useState<string>("todos")
  const [polizaSeleccionada, setPolizaSeleccionada] = useState<Poliza | null>(null)
  const [modalNuevaPoliza, setModalNuevaPoliza] = useState(false)
  const [modoNuevoCliente, setModoNuevoCliente] = useState(false)
  
  // Estado del formulario de nueva póliza
  const [nuevaPoliza, setNuevaPoliza] = useState({
    clienteId: "",
    companiaId: "",
    ramo: "" as Poliza["ramo"] | "",
    numeroPoliza: "",
    incisoEndoso: "",
    nombreAsegurado: "",
    vigenciaInicio: "",
    vigenciaFin: "",
    prima: "",
    formaPago: "" as Poliza["formaPago"] | "",
    tipoPago: "" as "efectivo" | "transferencia" | "tarjeta" | "domiciliacion" | "cheque" | "",
    anosVidaProducto: "", // Solo para seguros de vida
    agente: "",
    ultimoDiaPago: "",
    numeroRecibo: "",
    registroSistemaCobranza: false,
    comentarios: "",
    notas: "",
    marcaActualizacion: false,
  })

  // Estado del formulario de nuevo cliente
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: "",
    email: "",
    telefono: "",
    empresa: "",
  })

  // Aplicar filtro desde URL si viene de dashboard
  useEffect(() => {
    const filtro = searchParams.get("filtro")
    if (filtro === "renovaciones") {
      setFiltroEstatus("por-renovar")
    }
  }, [searchParams])

  // Calcular automáticamente el número de recibos para seguros de vida
  useEffect(() => {
    if (nuevaPoliza.ramo === "vida" && nuevaPoliza.anosVidaProducto && nuevaPoliza.formaPago) {
      const anos = parseInt(nuevaPoliza.anosVidaProducto)
      if (!isNaN(anos) && anos > 0) {
        let recibosAnuales = 1
        switch (nuevaPoliza.formaPago) {
          case "mensual":
            recibosAnuales = 12
            break
          case "trimestral":
            recibosAnuales = 4
            break
          case "semestral":
            recibosAnuales = 2
            break
          case "anual":
            recibosAnuales = 1
            break
        }
        const totalRecibos = anos * recibosAnuales
        setNuevaPoliza(prev => ({
          ...prev,
          numeroRecibo: `1/${totalRecibos}`
        }))
      }
    }
  }, [nuevaPoliza.ramo, nuevaPoliza.anosVidaProducto, nuevaPoliza.formaPago])

  const resetFormulario = () => {
    setNuevaPoliza({
      clienteId: "",
      companiaId: "",
      ramo: "",
      numeroPoliza: "",
      incisoEndoso: "",
      nombreAsegurado: "",
      vigenciaInicio: "",
      vigenciaFin: "",
      prima: "",
      formaPago: "",
      tipoPago: "",
      anosVidaProducto: "",
      agente: "",
      ultimoDiaPago: "",
      numeroRecibo: "",
      registroSistemaCobranza: false,
      comentarios: "",
      notas: "",
      marcaActualizacion: false,
    })
    setNuevoCliente({
      nombre: "",
      email: "",
      telefono: "",
      empresa: "",
    })
    setModoNuevoCliente(false)
  }

  const handleCrearCliente = () => {
    if (!nuevoCliente.nombre || !nuevoCliente.telefono) {
      toast.error("Nombre y teléfono son obligatorios para el cliente")
      return null
    }

    const clienteNuevo: Cliente = {
      id: (clientes.length + 1).toString(),
      nombre: nuevoCliente.nombre,
      email: nuevoCliente.email || `${nuevoCliente.nombre.toLowerCase().replace(/\s/g, ".")}@email.com`,
      telefono: nuevoCliente.telefono,
      empresa: nuevoCliente.empresa || undefined,
      fechaRegistro: new Date().toISOString().split("T")[0],
      estatus: "activo",
    }

    setClientes([...clientes, clienteNuevo])
    toast.success(`Cliente "${clienteNuevo.nombre}" creado`)
    return clienteNuevo.id
  }

  const handleSubmit = () => {
    // Validaciones
    if (!nuevaPoliza.clienteId && !modoNuevoCliente) {
      toast.error("Seleccione un cliente o cree uno nuevo")
      return
    }
    if (modoNuevoCliente && (!nuevoCliente.nombre || !nuevoCliente.telefono)) {
      toast.error("Complete los campos obligatorios del nuevo cliente")
      return
    }
    if (!nuevaPoliza.companiaId || !nuevaPoliza.ramo || !nuevaPoliza.numeroPoliza || 
        !nuevaPoliza.vigenciaInicio || !nuevaPoliza.vigenciaFin || !nuevaPoliza.prima || 
        !nuevaPoliza.formaPago || !nuevaPoliza.tipoPago) {
      toast.error("Complete todos los campos obligatorios, incluyendo el Tipo de Pago")
      return
    }

    // Validación específica para seguros de vida
    if (nuevaPoliza.ramo === "vida" && !nuevaPoliza.anosVidaProducto) {
      toast.error("Para seguros de vida, debe especificar los años de vida del producto")
      return
    }

    const primaNum = parseFloat(nuevaPoliza.prima)
    if (isNaN(primaNum) || primaNum <= 0) {
      toast.error("La prima debe ser un número válido mayor a 0")
      return
    }

    let clienteIdFinal = nuevaPoliza.clienteId

    // Si está en modo nuevo cliente, crear primero el cliente
    if (modoNuevoCliente) {
      const nuevoClienteId = handleCrearCliente()
      if (!nuevoClienteId) return
      clienteIdFinal = nuevoClienteId
    }

    agregarPoliza({
      clienteId: clienteIdFinal,
      companiaId: nuevaPoliza.companiaId,
      ramo: nuevaPoliza.ramo as Poliza["ramo"],
      numeroPoliza: nuevaPoliza.numeroPoliza,
      vigenciaInicio: nuevaPoliza.vigenciaInicio,
      vigenciaFin: nuevaPoliza.vigenciaFin,
      prima: primaNum,
      formaPago: nuevaPoliza.formaPago as Poliza["formaPago"],
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
      registroSistemaCobranza: nuevaPoliza.registroSistemaCobranza,
      comentarios: nuevaPoliza.comentarios || undefined,
      notas: nuevaPoliza.notas || undefined,
      marcaActualizacion: nuevaPoliza.marcaActualizacion,
    })

    setModalNuevaPoliza(false)
    resetFormulario()
    toast.success("Póliza creada exitosamente")
  }

  const polizasFiltradas = polizas.filter((poliza) => {
    if (filtroCompania !== "todas" && poliza.companiaId !== filtroCompania) return false
    if (filtroRamo !== "todos" && poliza.ramo !== filtroRamo) return false
    if (filtroEstatus !== "todos" && poliza.estatus !== filtroEstatus) return false
    return true
  })

  const estatusColors: Record<Poliza["estatus"], string> = {
    activa: "bg-green-500/10 text-green-500 border-green-500/20",
    "por-renovar": "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    vencida: "bg-red-500/10 text-red-500 border-red-500/20",
    cancelada: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    gracia: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    rehabilitada: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="main-content-aligned">
          <PageHeader title="Pólizas" subtitle="Gestiona todas las pólizas de tu cartera" />

          {/* Botón Nueva Póliza */}
          <div className="flex justify-end mb-6">
            <Button 
              onClick={() => setModalNuevaPoliza(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Póliza
            </Button>
          </div>

          {/* Filtros */}
          <GlassCard className="p-4 lg:p-6 mb-4 lg:mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Aseguradora</label>
                <Select value={filtroCompania} onValueChange={setFiltroCompania}>
                  <SelectTrigger className="glass">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    {companias.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Ramo</label>
                <Select value={filtroRamo} onValueChange={setFiltroRamo}>
                  <SelectTrigger className="glass">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="autos">Autos</SelectItem>
                    <SelectItem value="vida">Vida</SelectItem>
                    <SelectItem value="gastos-medicos">Gastos Médicos</SelectItem>
                    <SelectItem value="empresa">Empresa</SelectItem>
                    <SelectItem value="hogar">Hogar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Estatus</label>
                <Select value={filtroEstatus} onValueChange={setFiltroEstatus}>
                  <SelectTrigger className="glass">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="activa">Activa</SelectItem>
                    <SelectItem value="por-renovar">Por Renovar</SelectItem>
                    <SelectItem value="vencida">Vencida</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </GlassCard>

          {/* Tabla de pólizas - Desktop */}
          <GlassCard className="overflow-hidden hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-4 font-semibold">Cliente</th>
                    <th className="text-left p-4 font-semibold">Póliza</th>
                    <th className="text-left p-4 font-semibold">Aseguradora</th>
                    <th className="text-left p-4 font-semibold">Ramo</th>
                    <th className="text-left p-4 font-semibold">Vigencia</th>
                    <th className="text-left p-4 font-semibold">Prima</th>
                    <th className="text-left p-4 font-semibold">Estatus</th>
                  </tr>
                </thead>
                <tbody>
                  {polizasFiltradas.map((poliza, index) => {
                    const cliente = clientes.find((c) => c.id === poliza.clienteId)
                    const compania = companias.find((c) => c.id === poliza.companiaId)

                    return (
                      <motion.tr
                        key={poliza.id}
                        className="border-b border-border/30 hover:bg-muted/50 cursor-pointer transition-colors"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => setPolizaSeleccionada(poliza)}
                      >
                        <td className="p-4">
                          <div>
                            <p className="font-medium">{cliente?.nombre}</p>
                            <p className="text-sm text-muted-foreground">{cliente?.email}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="font-mono text-sm">{poliza.numeroPoliza}</p>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" style={{ borderColor: compania?.color, color: compania?.color }}>
                            {compania?.nombre}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <span className="capitalize">{poliza.ramo.replace("-", " ")}</span>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">
                            <p>{new Date(poliza.vigenciaInicio).toLocaleDateString()}</p>
                            <p className="text-muted-foreground">{new Date(poliza.vigenciaFin).toLocaleDateString()}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="font-semibold">${poliza.prima.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground capitalize">{poliza.formaPago}</p>
                        </td>
                        <td className="p-4">
                          <Badge className={estatusColors[poliza.estatus]} variant="outline">
                            {poliza.estatus}
                          </Badge>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* Vista de Cards para Móvil/Tablet */}
          <div className="lg:hidden space-y-3">
            {polizasFiltradas.map((poliza, index) => {
              const cliente = clientes.find((c) => c.id === poliza.clienteId)
              const compania = companias.find((c) => c.id === poliza.companiaId)

              return (
                <motion.div
                  key={poliza.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => setPolizaSeleccionada(poliza)}
                >
                  <GlassCard className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{cliente?.nombre}</p>
                        <p className="font-mono text-xs text-muted-foreground">{poliza.numeroPoliza}</p>
                      </div>
                      <Badge className={estatusColors[poliza.estatus]} variant="outline">
                        {poliza.estatus}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" style={{ borderColor: compania?.color, color: compania?.color }}>
                        {compania?.nombre}
                      </Badge>
                      <span className="text-xs capitalize text-muted-foreground">{poliza.ramo.replace("-", " ")}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-semibold">${poliza.prima.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground capitalize">{poliza.formaPago}</p>
                      </div>
                      <div className="text-right text-xs">
                        <p>{new Date(poliza.vigenciaInicio).toLocaleDateString()}</p>
                        <p className="text-muted-foreground">{new Date(poliza.vigenciaFin).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )
            })}
          </div>

          {/* Modal de detalle */}
          <Dialog open={!!polizaSeleccionada} onOpenChange={() => setPolizaSeleccionada(null)}>
            <DialogContent className="glass-strong max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">Detalle de Póliza</DialogTitle>
                <DialogDescription>Información completa de la póliza seleccionada</DialogDescription>
              </DialogHeader>

              {polizaSeleccionada && (
                <div className="space-y-6 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Cliente</p>
                      <p className="font-semibold">
                        {clientes.find((c) => c.id === polizaSeleccionada.clienteId)?.nombre}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Número de Póliza</p>
                      <p className="font-mono font-semibold">{polizaSeleccionada.numeroPoliza}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Aseguradora</p>
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: companias.find((c) => c.id === polizaSeleccionada.companiaId)?.color,
                          color: companias.find((c) => c.id === polizaSeleccionada.companiaId)?.color,
                        }}
                      >
                        {companias.find((c) => c.id === polizaSeleccionada.companiaId)?.nombre}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Ramo</p>
                      <p className="font-semibold capitalize">{polizaSeleccionada.ramo.replace("-", " ")}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Vigencia Inicio</p>
                      <p className="font-semibold">
                        {new Date(polizaSeleccionada.vigenciaInicio).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Vigencia Fin</p>
                      <p className="font-semibold">{new Date(polizaSeleccionada.vigenciaFin).toLocaleDateString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Prima</p>
                      <p className="font-semibold text-lg">${polizaSeleccionada.prima.toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Forma de Pago</p>
                      <p className="font-semibold capitalize">{polizaSeleccionada.formaPago}</p>
                    </div>
                  </div>

                  {polizaSeleccionada.folios && polizaSeleccionada.folios.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Folios</p>
                      <div className="flex gap-2 flex-wrap">
                        {polizaSeleccionada.folios.map((folio) => (
                          <Badge key={folio} variant="secondary">
                            {folio}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Trámites</p>
                    <p className="font-semibold">{polizaSeleccionada.tramites || 0} trámites registrados</p>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Modal Nueva Póliza */}
          <Dialog open={modalNuevaPoliza} onOpenChange={(open) => {
            setModalNuevaPoliza(open)
            if (!open) resetFormulario()
          }}>
            <DialogContent className="glass-strong max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl flex items-center gap-2">
                  <FileText className="w-6 h-6" />
                  Nueva Póliza
                </DialogTitle>
                <DialogDescription>Ingresa los datos de la nueva póliza</DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Selector: Cliente existente o nuevo */}
                <div className="flex gap-2 p-1 bg-muted rounded-lg">
                  <button
                    type="button"
                    onClick={() => setModoNuevoCliente(false)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                      !modoNuevoCliente ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <User className="w-4 h-4" />
                    Cliente Existente
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoNuevoCliente(true)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                      modoNuevoCliente ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <UserPlus className="w-4 h-4" />
                    Nuevo Cliente
                  </button>
                </div>

                {/* Cliente existente */}
                {!modoNuevoCliente && (
                  <div className="space-y-2">
                    <Label htmlFor="cliente">Cliente *</Label>
                    <Select 
                      value={nuevaPoliza.clienteId} 
                      onValueChange={(value) => setNuevaPoliza({...nuevaPoliza, clienteId: value})}
                    >
                      <SelectTrigger className="glass">
                        <SelectValue placeholder="Selecciona un cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.filter(c => c.estatus === "activo").map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.id}>
                            {cliente.nombre} {cliente.empresa ? `(${cliente.empresa})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Nuevo cliente */}
                {modoNuevoCliente && (
                  <div className="space-y-4 p-4 border border-primary/20 rounded-lg bg-primary/5">
                    <p className="text-sm font-semibold text-primary flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      Datos del Nuevo Cliente
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nombre Completo *</Label>
                        <Input
                          placeholder="Ej: Juan Pérez García"
                          value={nuevoCliente.nombre}
                          onChange={(e) => setNuevoCliente({...nuevoCliente, nombre: e.target.value})}
                          className="glass"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Teléfono *</Label>
                        <Input
                          placeholder="Ej: +52 55 1234 5678"
                          value={nuevoCliente.telefono}
                          onChange={(e) => setNuevoCliente({...nuevoCliente, telefono: e.target.value})}
                          className="glass"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          placeholder="Ej: juan@email.com"
                          value={nuevoCliente.email}
                          onChange={(e) => setNuevoCliente({...nuevoCliente, email: e.target.value})}
                          className="glass"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Empresa</Label>
                        <Input
                          placeholder="Ej: Empresa SA de CV"
                          value={nuevoCliente.empresa}
                          onChange={(e) => setNuevoCliente({...nuevoCliente, empresa: e.target.value})}
                          className="glass"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Nombre del asegurado */}
                <div className="space-y-2 p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <Label htmlFor="nombreAsegurado" className="text-base font-semibold">
                    Nombre del Asegurado *
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Puede ser el mismo cliente o una persona diferente
                  </p>
                  <Input
                    id="nombreAsegurado"
                    placeholder="Ej: María González López"
                    value={nuevaPoliza.nombreAsegurado}
                    onChange={(e) => setNuevaPoliza({...nuevaPoliza, nombreAsegurado: e.target.value})}
                    className="glass"
                  />
                </div>

                {/* Aseguradora y Ramo */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="compania">Aseguradora *</Label>
                    <Select 
                      value={nuevaPoliza.companiaId} 
                      onValueChange={(value) => setNuevaPoliza({...nuevaPoliza, companiaId: value})}
                    >
                      <SelectTrigger className="glass">
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                      <SelectContent>
                        {companias.map((compania) => (
                          <SelectItem key={compania.id} value={compania.id}>
                            {compania.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ramo">Ramo *</Label>
                    <Select 
                      value={nuevaPoliza.ramo} 
                      onValueChange={(value) => setNuevaPoliza({...nuevaPoliza, ramo: value as Poliza["ramo"]})}
                    >
                      <SelectTrigger className="glass">
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
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

                {/* Número de Póliza e Inciso/Endoso */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="numeroPoliza">Número de Póliza *</Label>
                    <Input
                      id="numeroPoliza"
                      placeholder="Ej: VCI852350000"
                      value={nuevaPoliza.numeroPoliza}
                      onChange={(e) => setNuevaPoliza({...nuevaPoliza, numeroPoliza: e.target.value})}
                      className="glass"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="incisoEndoso">Inciso o Endoso</Label>
                    <Input
                      id="incisoEndoso"
                      placeholder="Ej: 652 | AI749377"
                      value={nuevaPoliza.incisoEndoso}
                      onChange={(e) => setNuevaPoliza({...nuevaPoliza, incisoEndoso: e.target.value})}
                      className="glass"
                    />
                  </div>
                </div>

                {/* Vigencia */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vigenciaInicio">Vigencia Inicio *</Label>
                    <Input
                      id="vigenciaInicio"
                      type="date"
                      value={nuevaPoliza.vigenciaInicio}
                      onChange={(e) => setNuevaPoliza({...nuevaPoliza, vigenciaInicio: e.target.value})}
                      className="glass"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vigenciaFin">Vigencia Fin *</Label>
                    <Input
                      id="vigenciaFin"
                      type="date"
                      value={nuevaPoliza.vigenciaFin}
                      onChange={(e) => setNuevaPoliza({...nuevaPoliza, vigenciaFin: e.target.value})}
                      className="glass"
                    />
                  </div>
                </div>

                {/* Prima y Forma de Pago */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prima">Prima Total (MXN) *</Label>
                    <Input
                      id="prima"
                      type="number"
                      placeholder="Ej: 12500"
                      value={nuevaPoliza.prima}
                      onChange={(e) => setNuevaPoliza({...nuevaPoliza, prima: e.target.value})}
                      className="glass"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="formaPago">Forma de Pago *</Label>
                    <Select 
                      value={nuevaPoliza.formaPago} 
                      onValueChange={(value) => setNuevaPoliza({...nuevaPoliza, formaPago: value as Poliza["formaPago"]})}
                    >
                      <SelectTrigger className="glass">
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mensual">Mensual</SelectItem>
                        <SelectItem value="trimestral">Trimestral</SelectItem>
                        <SelectItem value="semestral">Semestral</SelectItem>
                        <SelectItem value="anual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Tipo de Pago */}
                <div className="space-y-2 p-4 border border-orange-200 dark:border-orange-800 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                  <Label htmlFor="tipoPago" className="text-base font-semibold">
                    Tipo de Pago * <span className="text-xs font-normal text-muted-foreground">(Requerido)</span>
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Seleccione cómo realizará el pago el cliente
                  </p>
                  <Select 
                    value={nuevaPoliza.tipoPago} 
                    onValueChange={(value: any) => setNuevaPoliza({...nuevaPoliza, tipoPago: value})}
                  >
                    <SelectTrigger className="glass">
                      <SelectValue placeholder="Seleccione el tipo de pago" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">💵 Efectivo</SelectItem>
                      <SelectItem value="transferencia">🏦 Transferencia Bancaria</SelectItem>
                      <SelectItem value="tarjeta">💳 Tarjeta de Crédito/Débito</SelectItem>
                      <SelectItem value="domiciliacion">🔄 Domiciliación</SelectItem>
                      <SelectItem value="cheque">📝 Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Años de Vida del Producto - Solo para Seguros de Vida */}
                {nuevaPoliza.ramo === "vida" && (
                  <div className="space-y-2 p-4 border border-purple-200 dark:border-purple-800 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                    <Label htmlFor="anosVidaProducto" className="text-base font-semibold">
                      Años de Vida del Producto * <span className="text-xs font-normal text-muted-foreground">(Solo seguros de vida)</span>
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Ingrese la duración del seguro en años. El número de recibos se calculará automáticamente según la forma de pago.
                    </p>
                    <Input
                      id="anosVidaProducto"
                      type="number"
                      min="1"
                      max="100"
                      placeholder="Ej: 10, 20, 30"
                      value={nuevaPoliza.anosVidaProducto}
                      onChange={(e) => setNuevaPoliza({...nuevaPoliza, anosVidaProducto: e.target.value})}
                      className="glass"
                    />
                    {nuevaPoliza.anosVidaProducto && nuevaPoliza.formaPago && (
                      <div className="mt-2 p-2 bg-purple-100 dark:bg-purple-900/30 rounded text-xs">
                        <p className="font-semibold text-purple-700 dark:text-purple-300">
                          📊 Cálculo automático: {nuevaPoliza.numeroRecibo || "Calculando..."}
                        </p>
                        <p className="text-purple-600 dark:text-purple-400 mt-1">
                          {nuevaPoliza.anosVidaProducto} años × {
                            nuevaPoliza.formaPago === "mensual" ? "12 pagos/año" :
                            nuevaPoliza.formaPago === "trimestral" ? "4 pagos/año" :
                            nuevaPoliza.formaPago === "semestral" ? "2 pagos/año" :
                            "1 pago/año"
                          }
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Último día de pago y # Recibo */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ultimoDiaPago">Último Día de Pago</Label>
                    <Input
                      id="ultimoDiaPago"
                      type="date"
                      value={nuevaPoliza.ultimoDiaPago}
                      onChange={(e) => setNuevaPoliza({...nuevaPoliza, ultimoDiaPago: e.target.value})}
                      className="glass"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numeroRecibo"># Recibo</Label>
                    <Input
                      id="numeroRecibo"
                      placeholder="Ej: 1/1, 2/4"
                      value={nuevaPoliza.numeroRecibo}
                      onChange={(e) => setNuevaPoliza({...nuevaPoliza, numeroRecibo: e.target.value})}
                      className="glass"
                    />
                  </div>
                </div>

                {/* Agente y Registro en sistema */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="agente">ID Agente</Label>
                    <Input
                      id="agente"
                      placeholder="Ej: AG001"
                      value={nuevaPoliza.agente}
                      onChange={(e) => setNuevaPoliza({...nuevaPoliza, agente: e.target.value})}
                      className="glass"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Registro en Sistema Cobranza</Label>
                    <div className="flex items-center gap-2 h-9">
                      <Checkbox
                        id="registroSistema"
                        checked={nuevaPoliza.registroSistemaCobranza}
                        onCheckedChange={(checked) => 
                          setNuevaPoliza({...nuevaPoliza, registroSistemaCobranza: checked as boolean})
                        }
                      />
                      <label htmlFor="registroSistema" className="text-sm cursor-pointer">
                        Registrado en sistema de cobranza
                      </label>
                    </div>
                  </div>
                </div>

                {/* Comentarios */}
                <div className="space-y-2">
                  <Label htmlFor="comentarios">Comentarios</Label>
                  <Textarea
                    id="comentarios"
                    placeholder="Notas adicionales sobre la póliza..."
                    value={nuevaPoliza.comentarios}
                    onChange={(e) => setNuevaPoliza({...nuevaPoliza, comentarios: e.target.value})}
                    className="glass min-h-[80px]"
                  />
                </div>

                {/* Notas de Recibos */}
                <div className="space-y-2">
                  <Label htmlFor="notas">Notas sobre Recibos del Cliente</Label>
                  <Textarea
                    id="notas"
                    placeholder="Información sobre recibos, número de recibos del cliente, etc..."
                    value={nuevaPoliza.notas}
                    onChange={(e) => setNuevaPoliza({...nuevaPoliza, notas: e.target.value})}
                    className="glass min-h-[80px]"
                  />
                </div>

                {/* Marca por Actualización */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 h-9">
                    <Checkbox
                      id="marcaActualizacion"
                      checked={nuevaPoliza.marcaActualizacion}
                      onCheckedChange={(checked) => 
                        setNuevaPoliza({...nuevaPoliza, marcaActualizacion: checked as boolean})
                      }
                    />
                    <label htmlFor="marcaActualizacion" className="text-sm cursor-pointer">
                      Marca por Actualización
                    </label>
                  </div>
                </div>

                {/* Botones */}
                <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setModalNuevaPoliza(false)
                      resetFormulario()
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleSubmit}>
                    <Plus className="w-4 h-4 mr-2" />
                    {modoNuevoCliente ? "Crear Cliente y Póliza" : "Crear Póliza"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </ProtectedRoute>
  )
}
