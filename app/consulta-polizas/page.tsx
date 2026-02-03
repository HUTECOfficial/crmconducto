"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { PageHeader } from "@/components/page-header"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { Search, RefreshCw, Eye, Download, Clock, CheckCircle, AlertCircle } from "lucide-react"
import { ProtectedRoute } from "@/components/protected-route"
import { polizas } from "@/data/polizas"
import { clientes } from "@/data/clientes"
import { companias } from "@/data/companias"

interface ConsultaResult {
  id: string
  numeroPoliza: string
  cliente: string
  compania: string
  estatus: string
  vigenciaInicio: string
  vigenciaFin: string
  prima: number
  ultimaActualizacion: string
  estatusReal: "activa" | "vencida" | "cancelada" | "suspendida"
}

export default function ConsultaPolizasPage() {
  const [numeroPoliza, setNumeroPoliza] = useState("")
  const [nombreCliente, setNombreCliente] = useState("")
  const [nombreAsegurado, setNombreAsegurado] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [resultados, setResultados] = useState<ConsultaResult[]>([])
  const [ultimaConsulta, setUltimaConsulta] = useState<Date | null>(null)

  const simularConsultaReal = async (numero: string, nombre: string, asegurado: string): Promise<ConsultaResult[]> => {
    // Simular llamada a API real de aseguradora (IMEC)
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const polizasEncontradas = polizas.filter(poliza => {
      const cliente = clientes.find(c => c.id === poliza.clienteId)
      const matchNumero = numero ? poliza.numeroPoliza.toLowerCase().includes(numero.toLowerCase()) : true
      const matchNombre = nombre ? cliente?.nombre.toLowerCase().includes(nombre.toLowerCase()) : true
      const matchAsegurado = asegurado ? poliza.nombreAsegurado?.toLowerCase().includes(asegurado.toLowerCase()) : true
      return matchNumero && matchNombre && matchAsegurado
    })

    return polizasEncontradas.map(poliza => {
      const cliente = clientes.find(c => c.id === poliza.clienteId)
      const compania = companias.find(c => c.id === poliza.companiaId)
      
      // Simular estatus en tiempo real (puede diferir del estatus local)
      const estatusReal = Math.random() > 0.8 ? "suspendida" : poliza.estatus as any
      
      return {
        id: poliza.id,
        numeroPoliza: poliza.numeroPoliza,
        cliente: cliente?.nombre || "Cliente no encontrado",
        compania: compania?.nombre || "Compañía no encontrada",
        estatus: poliza.estatus,
        vigenciaInicio: poliza.vigenciaInicio,
        vigenciaFin: poliza.vigenciaFin,
        prima: poliza.prima,
        ultimaActualizacion: new Date().toISOString(),
        estatusReal
      }
    })
  }

  const handleConsulta = async () => {
    if (!numeroPoliza && !nombreCliente && !nombreAsegurado) return
    
    setIsLoading(true)
    try {
      const resultados = await simularConsultaReal(numeroPoliza, nombreCliente, nombreAsegurado)
      setResultados(resultados)
      setUltimaConsulta(new Date())
    } catch (error) {
      console.error("Error en consulta:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getEstatusColor = (estatus: string, estatusReal: string) => {
    if (estatus !== estatusReal) {
      return "destructive" // Hay diferencia entre local y real
    }
    
    switch (estatus) {
      case "activa":
        return "default"
      case "vencida":
        return "secondary"
      case "cancelada":
        return "destructive"
      case "suspendida":
        return "outline"
      default:
        return "secondary"
    }
  }

  const getEstatusIcon = (estatus: string, estatusReal: string) => {
    if (estatus !== estatusReal) {
      return <AlertCircle className="w-4 h-4" />
    }
    
    switch (estatus) {
      case "activa":
        return <CheckCircle className="w-4 h-4" />
      case "vencida":
        return <Clock className="w-4 h-4" />
      case "cancelada":
        return <AlertCircle className="w-4 h-4" />
      case "suspendida":
        return <AlertCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="main-content-aligned">
          <PageHeader
            title="Consulta de Pólizas - IMEC"
            subtitle="Consulta el estatus en tiempo real de las pólizas con las aseguradoras"
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Formulario de consulta */}
            <div className="lg:col-span-1">
              <GlassCard className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Search className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">Consulta IMEC</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="numero-poliza">Número de Póliza</Label>
                    <Input
                      id="numero-poliza"
                      value={numeroPoliza}
                      onChange={(e) => setNumeroPoliza(e.target.value)}
                      placeholder="Ej: POL-2024-001"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="nombre-cliente">Nombre del Cliente/Contratante</Label>
                    <Input
                      id="nombre-cliente"
                      value={nombreCliente}
                      onChange={(e) => setNombreCliente(e.target.value)}
                      placeholder="Ej: Juan Pérez"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="nombre-asegurado">Nombre del Asegurado</Label>
                    <Input
                      id="nombre-asegurado"
                      value={nombreAsegurado}
                      onChange={(e) => setNombreAsegurado(e.target.value)}
                      placeholder="Ej: María González"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleConsulta} 
                    disabled={isLoading || (!numeroPoliza && !nombreCliente && !nombreAsegurado)}
                    className="w-full gap-2"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    {isLoading ? "Consultando..." : "Consultar"}
                  </Button>
                  
                  {ultimaConsulta && (
                    <div className="text-xs text-muted-foreground text-center">
                      Última consulta: {ultimaConsulta.toLocaleString()}
                    </div>
                  )}
                </div>
              </GlassCard>

              {/* Información de conexión */}
              <GlassCard className="p-6 mt-6">
                <h4 className="font-semibold mb-3">Estado de Conexiones</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>GNP Seguros</span>
                    <Badge variant="default" className="text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Conectado
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>AXA Seguros</span>
                    <Badge variant="default" className="text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Conectado
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Mapfre</span>
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      Lento
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Zurich</span>
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Sin conexión
                    </Badge>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Resultados */}
            <div className="lg:col-span-2">
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Resultados de Consulta</h3>
                  {resultados.length > 0 && (
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="w-4 h-4" />
                      Exportar
                    </Button>
                  )}
                </div>

                {resultados.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Ingresa los datos y presiona "Consultar" para ver los resultados</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {resultados.map((resultado, index) => (
                      <motion.div
                        key={resultado.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="glass rounded-2xl p-4 hover:scale-[1.01] transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold">{resultado.numeroPoliza}</h4>
                            <p className="text-sm text-muted-foreground">{resultado.cliente}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={getEstatusColor(resultado.estatus, resultado.estatusReal)}
                              className="gap-1"
                            >
                              {getEstatusIcon(resultado.estatus, resultado.estatusReal)}
                              {resultado.estatusReal}
                            </Badge>
                            {resultado.estatus !== resultado.estatusReal && (
                              <Badge variant="outline" className="text-xs">
                                Local: {resultado.estatus}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Compañía:</span>
                            <p className="font-medium">{resultado.compania}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Prima:</span>
                            <p className="font-medium">${resultado.prima.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Vigencia:</span>
                            <p className="font-medium">
                              {new Date(resultado.vigenciaFin).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Actualizado:</span>
                            <p className="font-medium text-xs">
                              {new Date(resultado.ultimaActualizacion).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex justify-end mt-4 gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2"
                            onClick={() => {
                              alert(`Mostrando detalles de póliza ${resultado.numeroPoliza}`)
                              console.log("Detalles de póliza:", resultado)
                            }}
                          >
                            <Eye className="w-4 h-4" />
                            Ver Detalles
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2"
                            onClick={async () => {
                              console.log("Actualizando póliza:", resultado.numeroPoliza)
                              // Simular actualización
                              await new Promise(resolve => setTimeout(resolve, 1000))
                              alert(`Póliza ${resultado.numeroPoliza} actualizada`)
                            }}
                          >
                            <RefreshCw className="w-4 h-4" />
                            Actualizar
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
