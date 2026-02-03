"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { PageHeader } from "@/components/page-header"
import { NeoButton } from "@/components/neo-button"
import { KanbanBoard } from "@/components/kanban-board"
import { ProspectoForm } from "@/components/prospecto-form"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Plus, 
  Users, 
  TrendingUp, 
  FileText, 
  DollarSign,
  Calendar,
  BarChart3,
  Target,
  Clock,
  CheckCircle
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ProtectedRoute } from "@/components/protected-route"
import { motion } from "framer-motion"

interface ProspectoFormal {
  id: string
  nombre: string
  empresa: string
  equipoInterno: string[]
  aperturaFinanciera: {
    presupuesto: number
    aprobado: boolean
    contactoFinanciero: string
  }
  cotizacion: {
    estado: "pendiente" | "enviada" | "aprobada" | "rechazada"
    monto: number
    fechaEnvio?: string
  }
  propuestaNegocio: {
    estado: "borrador" | "enviada" | "negociacion" | "cerrada"
    documentos: string[]
  }
  inventario: {
    productos: number
    graficas: string[]
  }
  cronologia: {
    fecha: string
    evento: string
    responsable: string
  }[]
}

const prospectosFormalesMock: ProspectoFormal[] = [
  {
    id: "1",
    nombre: "Empresa ABC S.A.",
    empresa: "Tecnología",
    equipoInterno: ["Carlos Admin", "María Asesora"],
    aperturaFinanciera: {
      presupuesto: 150000,
      aprobado: true,
      contactoFinanciero: "CFO Juan Pérez"
    },
    cotizacion: {
      estado: "enviada",
      monto: 125000,
      fechaEnvio: "2024-01-15"
    },
    propuestaNegocio: {
      estado: "negociacion",
      documentos: ["Propuesta_Comercial.pdf", "Términos_Condiciones.pdf"]
    },
    inventario: {
      productos: 5,
      graficas: ["grafica_cobertura.png", "comparativo_precios.png"]
    },
    cronologia: [
      {
        fecha: "2024-01-10",
        evento: "Primer contacto",
        responsable: "María Asesora"
      },
      {
        fecha: "2024-01-12",
        evento: "Reunión apertura financiera",
        responsable: "Carlos Admin"
      },
      {
        fecha: "2024-01-15",
        evento: "Envío de cotización",
        responsable: "María Asesora"
      }
    ]
  }
]

export default function ProspeccionPage() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("kanban")
  const [prospectosFormales] = useState<ProspectoFormal[]>(prospectosFormalesMock)

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "aprobada":
      case "cerrada":
        return "default"
      case "enviada":
      case "negociacion":
        return "secondary"
      case "pendiente":
      case "borrador":
        return "outline"
      case "rechazada":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case "aprobada":
      case "cerrada":
        return <CheckCircle className="w-4 h-4" />
      case "enviada":
      case "negociacion":
        return <Clock className="w-4 h-4" />
      case "pendiente":
      case "borrador":
        return <FileText className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="main-content-aligned">
          <PageHeader
            title="Prospección"
            subtitle="Gestiona tu embudo de ventas y convierte leads en clientes"
            action={
              <NeoButton onClick={() => setIsFormOpen(true)} className="gap-2">
                <Plus className="w-5 h-5" />
                Nuevo Prospecto
              </NeoButton>
            }
          />

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="kanban" className="gap-2">
                <Target className="w-4 h-4" />
                Embudo Kanban
              </TabsTrigger>
              <TabsTrigger value="formales" className="gap-2">
                <Users className="w-4 h-4" />
                Prospectos Formales
              </TabsTrigger>
              <TabsTrigger value="inventario" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Inventario & Gráficas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="kanban">
              <KanbanBoard />
            </TabsContent>

            <TabsContent value="formales" className="space-y-6">
              {/* Estadísticas de prospectos formales */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <GlassCard className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-blue-500/10">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Prospectos Formales</p>
                      <p className="text-2xl font-bold">{prospectosFormales.length}</p>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-green-500/10">
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Valor Pipeline</p>
                      <p className="text-2xl font-bold">
                        ${prospectosFormales.reduce((sum, p) => sum + p.cotizacion.monto, 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-orange-500/10">
                      <FileText className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">En Negociación</p>
                      <p className="text-2xl font-bold">
                        {prospectosFormales.filter(p => p.propuestaNegocio.estado === "negociacion").length}
                      </p>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-purple-500/10">
                      <TrendingUp className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tasa Conversión</p>
                      <p className="text-2xl font-bold">68.5%</p>
                    </div>
                  </div>
                </GlassCard>
              </div>

              {/* Lista de prospectos formales */}
              <div className="space-y-4">
                {prospectosFormales.map((prospecto, index) => (
                  <motion.div
                    key={prospecto.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <GlassCard className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-semibold">{prospecto.nombre}</h3>
                          <p className="text-muted-foreground">{prospecto.empresa}</p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={getEstadoColor(prospecto.cotizacion.estado)} className="gap-1">
                            {getEstadoIcon(prospecto.cotizacion.estado)}
                            Cotización: {prospecto.cotizacion.estado}
                          </Badge>
                          <Badge variant={getEstadoColor(prospecto.propuestaNegocio.estado)} className="gap-1">
                            {getEstadoIcon(prospecto.propuestaNegocio.estado)}
                            Propuesta: {prospecto.propuestaNegocio.estado}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Equipo Interno */}
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Equipo Interno
                          </h4>
                          <div className="space-y-1">
                            {prospecto.equipoInterno.map(miembro => (
                              <Badge key={miembro} variant="outline" className="mr-1">
                                {miembro}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Apertura Financiera */}
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            Apertura Financiera
                          </h4>
                          <div className="space-y-1 text-sm">
                            <p>Presupuesto: ${prospecto.aperturaFinanciera.presupuesto.toLocaleString()}</p>
                            <p>Estado: {prospecto.aperturaFinanciera.aprobado ? "✅ Aprobado" : "⏳ Pendiente"}</p>
                            <p>Contacto: {prospecto.aperturaFinanciera.contactoFinanciero}</p>
                          </div>
                        </div>

                        {/* Inventario */}
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" />
                            Inventario
                          </h4>
                          <div className="space-y-1 text-sm">
                            <p>Productos: {prospecto.inventario.productos}</p>
                            <p>Gráficas: {prospecto.inventario.graficas.length}</p>
                          </div>
                        </div>
                      </div>

                      {/* Cronología */}
                      <div className="mt-6">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Cronología de Propuesta
                        </h4>
                        <div className="space-y-2">
                          {prospecto.cronologia.slice(-3).map((evento, idx) => (
                            <div key={idx} className="flex items-center gap-3 text-sm">
                              <div className="w-2 h-2 rounded-full bg-primary"></div>
                              <span className="text-muted-foreground">
                                {new Date(evento.fecha).toLocaleDateString()}
                              </span>
                              <span>{evento.evento}</span>
                              <Badge variant="outline" className="text-xs">
                                {evento.responsable}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 mt-6">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            alert(`Mostrando cronología completa de ${prospecto.nombre}`)
                            console.log("Cronología completa:", prospecto.cronologia)
                          }}
                        >
                          Ver Cronología Completa
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const nuevaPropuesta = {
                              id: Date.now().toString(),
                              prospecto: prospecto.nombre,
                              fecha: new Date().toISOString(),
                              estado: "generada"
                            }
                            console.log("Propuesta generada:", nuevaPropuesta)
                            alert(`Propuesta comercial generada para ${prospecto.nombre}`)
                          }}
                        >
                          Generar Propuesta
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => {
                            const nuevoEstado = prompt("Nuevo estado (borrador/enviada/negociacion/cerrada):", prospecto.propuestaNegocio.estado)
                            if (nuevoEstado) {
                              console.log(`Estado actualizado para ${prospecto.nombre}: ${nuevoEstado}`)
                              alert(`Estado actualizado a: ${nuevoEstado}`)
                            }
                          }}
                        >
                          Actualizar Estado
                        </Button>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="inventario">
              <GlassCard className="p-6">
                <div className="text-center py-12">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">Inventario con Gráficas</h3>
                  <p className="text-muted-foreground mb-4">
                    Visualización de inventario de productos y gráficas comparativas
                  </p>
                  <Button
                    onClick={() => {
                      alert("Configurando inventario de productos y gráficas...")
                      console.log("Configuración de inventario iniciada")
                    }}
                  >
                    Configurar Inventario
                  </Button>
                </div>
              </GlassCard>
            </TabsContent>
          </Tabs>

          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto backdrop-blur-3xl bg-background/40 border-2 border-primary/20 shadow-2xl">
              <DialogHeader className="pb-6 border-b border-border/20">
                <DialogTitle className="font-serif text-3xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Nuevo Prospecto
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-base">
                  Agrega un nuevo prospecto al embudo de ventas
                </DialogDescription>
              </DialogHeader>
              <div className="mt-6">
                <ProspectoForm onClose={() => setIsFormOpen(false)} />
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </ProtectedRoute>
  )
}
