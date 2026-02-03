"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Target, Plus, TrendingUp, Calendar, Users, DollarSign, CheckCircle2, Clock, AlertCircle, Edit, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface Objetivo {
  id: string
  titulo: string
  descripcion: string
  tipo: "ventas" | "cobranza" | "prospeccion" | "servicio"
  meta: number
  actual: number
  unidad: string
  fechaInicio: string
  fechaFin: string
  responsable: string
  estado: "activo" | "completado" | "vencido"
  prioridad: "alta" | "media" | "baja"
}

const objetivosIniciales: Objetivo[] = [
  {
    id: "1",
    titulo: "Meta de Ventas Q1 2026",
    descripcion: "Alcanzar $5,000,000 en primas emitidas durante el primer trimestre",
    tipo: "ventas",
    meta: 5000000,
    actual: 3750000,
    unidad: "MXN",
    fechaInicio: "2026-01-01",
    fechaFin: "2026-03-31",
    responsable: "Equipo de Ventas",
    estado: "activo",
    prioridad: "alta"
  },
  {
    id: "2",
    titulo: "Efectividad de Cobranza",
    descripcion: "Mantener índice de efectividad de cobranza superior al 95%",
    tipo: "cobranza",
    meta: 95,
    actual: 92.5,
    unidad: "%",
    fechaInicio: "2026-01-01",
    fechaFin: "2026-12-31",
    responsable: "Departamento de Cobranza",
    estado: "activo",
    prioridad: "alta"
  },
  {
    id: "3",
    titulo: "Prospección Mensual",
    descripcion: "Generar 150 nuevos prospectos calificados por mes",
    tipo: "prospeccion",
    meta: 150,
    actual: 142,
    unidad: "prospectos",
    fechaInicio: "2026-01-01",
    fechaFin: "2026-01-31",
    responsable: "Equipo Comercial",
    estado: "activo",
    prioridad: "media"
  },
  {
    id: "4",
    titulo: "Satisfacción del Cliente",
    descripcion: "Lograr calificación promedio de 4.5/5 en encuestas de satisfacción",
    tipo: "servicio",
    meta: 4.5,
    actual: 4.5,
    unidad: "puntos",
    fechaInicio: "2025-10-01",
    fechaFin: "2025-12-31",
    responsable: "Servicio al Cliente",
    estado: "completado",
    prioridad: "media"
  }
]

export default function ObjetivosPage() {
  const [objetivos, setObjetivos] = useState<Objetivo[]>(objetivosIniciales)
  const [dialogAbierto, setDialogAbierto] = useState(false)
  const [objetivoEditando, setObjetivoEditando] = useState<Objetivo | null>(null)
  const [filtroTipo, setFiltroTipo] = useState<string>("todos")
  const [filtroEstado, setFiltroEstado] = useState<string>("todos")

  const [nuevoObjetivo, setNuevoObjetivo] = useState<Partial<Objetivo>>({
    titulo: "",
    descripcion: "",
    tipo: "ventas",
    meta: 0,
    actual: 0,
    unidad: "MXN",
    fechaInicio: "",
    fechaFin: "",
    responsable: "",
    prioridad: "media"
  })

  const calcularProgreso = (actual: number, meta: number) => {
    return Math.min((actual / meta) * 100, 100)
  }

  const obtenerColorEstado = (estado: string) => {
    switch (estado) {
      case "activo": return "bg-blue-500/10 text-blue-500 border-blue-500/20"
      case "completado": return "bg-green-500/10 text-green-500 border-green-500/20"
      case "vencido": return "bg-red-500/10 text-red-500 border-red-500/20"
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20"
    }
  }

  const obtenerColorPrioridad = (prioridad: string) => {
    switch (prioridad) {
      case "alta": return "bg-red-500/10 text-red-500 border-red-500/20"
      case "media": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
      case "baja": return "bg-green-500/10 text-green-500 border-green-500/20"
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20"
    }
  }

  const obtenerIconoTipo = (tipo: string) => {
    switch (tipo) {
      case "ventas": return <DollarSign className="w-4 h-4" />
      case "cobranza": return <TrendingUp className="w-4 h-4" />
      case "prospeccion": return <Users className="w-4 h-4" />
      case "servicio": return <CheckCircle2 className="w-4 h-4" />
      default: return <Target className="w-4 h-4" />
    }
  }

  const handleGuardarObjetivo = () => {
    if (!nuevoObjetivo.titulo || !nuevoObjetivo.meta || !nuevoObjetivo.fechaFin) {
      toast.error("Por favor completa los campos requeridos")
      return
    }

    if (objetivoEditando) {
      setObjetivos(objetivos.map(obj => 
        obj.id === objetivoEditando.id 
          ? { ...obj, ...nuevoObjetivo } as Objetivo
          : obj
      ))
      toast.success("Objetivo actualizado correctamente")
    } else {
      const objetivo: Objetivo = {
        id: Date.now().toString(),
        titulo: nuevoObjetivo.titulo!,
        descripcion: nuevoObjetivo.descripcion || "",
        tipo: nuevoObjetivo.tipo as any,
        meta: nuevoObjetivo.meta!,
        actual: nuevoObjetivo.actual || 0,
        unidad: nuevoObjetivo.unidad || "MXN",
        fechaInicio: nuevoObjetivo.fechaInicio || new Date().toISOString().split('T')[0],
        fechaFin: nuevoObjetivo.fechaFin!,
        responsable: nuevoObjetivo.responsable || "Sin asignar",
        estado: "activo",
        prioridad: nuevoObjetivo.prioridad as any
      }
      setObjetivos([...objetivos, objetivo])
      toast.success("Objetivo creado correctamente")
    }

    setDialogAbierto(false)
    setObjetivoEditando(null)
    setNuevoObjetivo({
      titulo: "",
      descripcion: "",
      tipo: "ventas",
      meta: 0,
      actual: 0,
      unidad: "MXN",
      fechaInicio: "",
      fechaFin: "",
      responsable: "",
      prioridad: "media"
    })
  }

  const handleEditarObjetivo = (objetivo: Objetivo) => {
    setObjetivoEditando(objetivo)
    setNuevoObjetivo(objetivo)
    setDialogAbierto(true)
  }

  const handleEliminarObjetivo = (id: string) => {
    setObjetivos(objetivos.filter(obj => obj.id !== id))
    toast.success("Objetivo eliminado")
  }

  const objetivosFiltrados = objetivos.filter(obj => {
    const cumpleTipo = filtroTipo === "todos" || obj.tipo === filtroTipo
    const cumpleEstado = filtroEstado === "todos" || obj.estado === filtroEstado
    return cumpleTipo && cumpleEstado
  })

  const estadisticas = {
    total: objetivos.length,
    activos: objetivos.filter(o => o.estado === "activo").length,
    completados: objetivos.filter(o => o.estado === "completado").length,
    progresoPromedio: objetivos.reduce((acc, obj) => acc + calcularProgreso(obj.actual, obj.meta), 0) / objetivos.length
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Objetivos"
        subtitle="Gestiona y da seguimiento a las metas del equipo"
        action={
          <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setObjetivoEditando(null)
                setNuevoObjetivo({
                  titulo: "",
                  descripcion: "",
                  tipo: "ventas",
                  meta: 0,
                  actual: 0,
                  unidad: "MXN",
                  fechaInicio: "",
                  fechaFin: "",
                  responsable: "",
                  prioridad: "media"
                })
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Objetivo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{objetivoEditando ? "Editar Objetivo" : "Crear Nuevo Objetivo"}</DialogTitle>
                <DialogDescription>
                  Define las metas y parámetros del objetivo
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="titulo">Título *</Label>
                  <Input
                    id="titulo"
                    value={nuevoObjetivo.titulo}
                    onChange={(e) => setNuevoObjetivo({...nuevoObjetivo, titulo: e.target.value})}
                    placeholder="Ej: Meta de Ventas Q1"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    value={nuevoObjetivo.descripcion}
                    onChange={(e) => setNuevoObjetivo({...nuevoObjetivo, descripcion: e.target.value})}
                    placeholder="Describe el objetivo en detalle"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="tipo">Tipo</Label>
                    <Select
                      value={nuevoObjetivo.tipo}
                      onValueChange={(value) => setNuevoObjetivo({...nuevoObjetivo, tipo: value as any})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ventas">Ventas</SelectItem>
                        <SelectItem value="cobranza">Cobranza</SelectItem>
                        <SelectItem value="prospeccion">Prospección</SelectItem>
                        <SelectItem value="servicio">Servicio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="prioridad">Prioridad</Label>
                    <Select
                      value={nuevoObjetivo.prioridad}
                      onValueChange={(value) => setNuevoObjetivo({...nuevoObjetivo, prioridad: value as any})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="media">Media</SelectItem>
                        <SelectItem value="baja">Baja</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="meta">Meta *</Label>
                    <Input
                      id="meta"
                      type="number"
                      value={nuevoObjetivo.meta}
                      onChange={(e) => setNuevoObjetivo({...nuevoObjetivo, meta: parseFloat(e.target.value)})}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="actual">Actual</Label>
                    <Input
                      id="actual"
                      type="number"
                      value={nuevoObjetivo.actual}
                      onChange={(e) => setNuevoObjetivo({...nuevoObjetivo, actual: parseFloat(e.target.value)})}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="unidad">Unidad</Label>
                    <Input
                      id="unidad"
                      value={nuevoObjetivo.unidad}
                      onChange={(e) => setNuevoObjetivo({...nuevoObjetivo, unidad: e.target.value})}
                      placeholder="MXN, %, unidades"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="fechaInicio">Fecha Inicio</Label>
                    <Input
                      id="fechaInicio"
                      type="date"
                      value={nuevoObjetivo.fechaInicio}
                      onChange={(e) => setNuevoObjetivo({...nuevoObjetivo, fechaInicio: e.target.value})}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="fechaFin">Fecha Fin *</Label>
                    <Input
                      id="fechaFin"
                      type="date"
                      value={nuevoObjetivo.fechaFin}
                      onChange={(e) => setNuevoObjetivo({...nuevoObjetivo, fechaFin: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="responsable">Responsable</Label>
                  <Input
                    id="responsable"
                    value={nuevoObjetivo.responsable}
                    onChange={(e) => setNuevoObjetivo({...nuevoObjetivo, responsable: e.target.value})}
                    placeholder="Nombre del equipo o persona responsable"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogAbierto(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleGuardarObjetivo}>
                  {objetivoEditando ? "Actualizar" : "Crear"} Objetivo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Objetivos</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estadisticas.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{estadisticas.activos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{estadisticas.completados}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progreso Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estadisticas.progresoPromedio.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Tipo</Label>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ventas">Ventas</SelectItem>
                  <SelectItem value="cobranza">Cobranza</SelectItem>
                  <SelectItem value="prospeccion">Prospección</SelectItem>
                  <SelectItem value="servicio">Servicio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Label>Estado</Label>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="completado">Completado</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        {objetivosFiltrados.map((objetivo, index) => {
          const progreso = calcularProgreso(objetivo.actual, objetivo.meta)
          
          return (
            <motion.div
              key={objetivo.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {obtenerIconoTipo(objetivo.tipo)}
                        <CardTitle>{objetivo.titulo}</CardTitle>
                      </div>
                      <CardDescription>{objetivo.descripcion}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditarObjetivo(objetivo)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEliminarObjetivo(objetivo.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progreso</span>
                      <span className="font-semibold">
                        {objetivo.actual.toLocaleString()} / {objetivo.meta.toLocaleString()} {objetivo.unidad}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <Progress value={progreso} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{progreso.toFixed(1)}% completado</span>
                        <span>{(objetivo.meta - objetivo.actual).toLocaleString()} {objetivo.unidad} restantes</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <Badge variant="outline" className={obtenerColorEstado(objetivo.estado)}>
                        {objetivo.estado.charAt(0).toUpperCase() + objetivo.estado.slice(1)}
                      </Badge>
                      <Badge variant="outline" className={obtenerColorPrioridad(objetivo.prioridad)}>
                        Prioridad {objetivo.prioridad}
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(objetivo.fechaFin).toLocaleDateString()}
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Users className="w-3 h-3" />
                        {objetivo.responsable}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}

        {objetivosFiltrados.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No se encontraron objetivos con los filtros seleccionados</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
