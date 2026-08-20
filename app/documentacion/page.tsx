"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { PageHeader } from "@/components/page-header"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { motion } from "framer-motion"
import { 
  FolderOpen, 
  Upload, 
  Download, 
  Eye, 
  Trash2, 
  Share2, 
  FileText, 
  Image, 
  File,
  MessageSquare,
  Printer,
  Search
} from "lucide-react"
import { ProtectedRoute } from "@/components/protected-route"

interface Documento {
  id: string
  nombre: string
  tipo: "poliza" | "identificacion" | "comprobante" | "foto" | "whatsapp" | "comercial"
  formato: string
  tamaño: string
  fechaSubida: string
  clienteId: string
  polizaId?: string
  url: string
  descripcion?: string
}

const documentosMock: Documento[] = [
  {
    id: "1",
    nombre: "Póliza_GNP_2024_001.pdf",
    tipo: "poliza",
    formato: "PDF",
    tamaño: "2.3 MB",
    fechaSubida: "2024-01-15",
    clienteId: "1",
    polizaId: "1",
    url: "/docs/poliza1.pdf",
    descripcion: "Póliza de vida GNP"
  },
  {
    id: "2",
    nombre: "INE_Cliente_Frente.jpg",
    tipo: "identificacion",
    formato: "JPG",
    tamaño: "1.8 MB",
    fechaSubida: "2024-01-14",
    clienteId: "1",
    url: "/docs/ine_frente.jpg",
    descripcion: "Identificación oficial frente"
  },
  {
    id: "3",
    nombre: "Comprobante_Domicilio.pdf",
    tipo: "comprobante",
    formato: "PDF",
    tamaño: "0.9 MB",
    fechaSubida: "2024-01-14",
    clienteId: "1",
    url: "/docs/comprobante.pdf",
    descripcion: "Comprobante de domicilio CFE"
  },
  {
    id: "4",
    nombre: "Chat_WhatsApp_Cliente.txt",
    tipo: "whatsapp",
    formato: "TXT",
    tamaño: "0.2 MB",
    fechaSubida: "2024-01-16",
    clienteId: "1",
    url: "/docs/chat.txt",
    descripcion: "Conversación WhatsApp con cliente"
  }
]

export default function DocumentacionPage() {
  const [documentos, setDocumentos] = useState<Documento[]>(documentosMock)
  const [filtroTipo, setFiltroTipo] = useState<string>("todos")
  const [busqueda, setBusqueda] = useState("")
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null)
  const [tipoDocumento, setTipoDocumento] = useState("")

  const documentosFiltrados = documentos.filter(doc => {
    const matchTipo = filtroTipo === "todos" || doc.tipo === filtroTipo
    const matchBusqueda = doc.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                         doc.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
    return matchTipo && matchBusqueda
  })

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setArchivoSeleccionado(file)
    }
  }

  const handleUpload = () => {
    if (!archivoSeleccionado || !tipoDocumento) return

    const nuevoDocumento: Documento = {
      id: Date.now().toString(),
      nombre: archivoSeleccionado.name,
      tipo: tipoDocumento as any,
      formato: archivoSeleccionado.name.split('.').pop()?.toUpperCase() || "UNKNOWN",
      tamaño: `${(archivoSeleccionado.size / 1024 / 1024).toFixed(1)} MB`,
      fechaSubida: new Date().toISOString().split('T')[0],
      clienteId: "1", // Por ahora hardcodeado
      url: URL.createObjectURL(archivoSeleccionado),
      descripcion: `Documento subido el ${new Date().toLocaleDateString()}`
    }

    setDocumentos(prev => [nuevoDocumento, ...prev])
    setArchivoSeleccionado(null)
    setTipoDocumento("")
  }

  const handleDelete = (id: string) => {
    setDocumentos(prev => prev.filter(doc => doc.id !== id))
  }

  const handleWhatsAppUpload = () => {
    // Simular carga desde WhatsApp
    const nuevoChat: Documento = {
      id: Date.now().toString(),
      nombre: `Chat_WhatsApp_${new Date().toLocaleDateString()}.txt`,
      tipo: "whatsapp",
      formato: "TXT",
      tamaño: "0.3 MB",
      fechaSubida: new Date().toISOString().split('T')[0],
      clienteId: "1",
      url: "/docs/chat_nuevo.txt",
      descripcion: "Conversación importada desde WhatsApp"
    }

    setDocumentos(prev => [nuevoChat, ...prev])
    alert("Conversación de WhatsApp importada exitosamente!")
  }

  const handlePrint = (documento: Documento) => {
    // Simular impresión
    console.log("Imprimiendo documento:", documento.nombre)
    window.open(documento.url, '_blank')
  }

  const getIconoTipo = (tipo: string) => {
    switch (tipo) {
      case "poliza":
        return <FileText className="w-5 h-5 text-blue-500" />
      case "identificacion":
        return <Image className="w-5 h-5 text-green-500" />
      case "comprobante":
        return <File className="w-5 h-5 text-orange-500" />
      case "whatsapp":
        return <MessageSquare className="w-5 h-5 text-green-600" />
      case "comercial":
        return <FileText className="w-5 h-5 text-purple-500" />
      default:
        return <File className="w-5 h-5 text-gray-500" />
    }
  }

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "poliza": return "Póliza"
      case "identificacion": return "Identificación"
      case "comprobante": return "Comprobante"
      case "whatsapp": return "WhatsApp"
      case "comercial": return "Comercial"
      default: return "Otro"
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="main-content-aligned">
          <PageHeader
            title="Documentación"
            subtitle="Gestiona todos los documentos de tus clientes y pólizas"
          />

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Panel de carga */}
            <div className="lg:col-span-1">
              <GlassCard className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Upload className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">Subir Documento</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="tipo-documento">Tipo de Documento</Label>
                    <Select value={tipoDocumento} onValueChange={setTipoDocumento}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="poliza">Póliza</SelectItem>
                        <SelectItem value="identificacion">Identificación</SelectItem>
                        <SelectItem value="comprobante">Comprobante</SelectItem>
                        <SelectItem value="foto">Fotografía</SelectItem>
                        <SelectItem value="comercial">Documento Comercial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="archivo">Seleccionar Archivo</Label>
                    <Input
                      id="archivo"
                      type="file"
                      onChange={handleFileSelect}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleUpload}
                    disabled={!archivoSeleccionado || !tipoDocumento}
                    className="w-full gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Subir Documento
                  </Button>
                </div>
              </GlassCard>

              {/* Acciones especiales */}
              <GlassCard className="p-6 mt-6">
                <h4 className="font-semibold mb-4">Acciones Especiales</h4>
                <div className="space-y-3">
                  <Button 
                    onClick={handleWhatsAppUpload}
                    variant="outline" 
                    className="w-full gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Importar WhatsApp
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => {
                      const nuevoComercial: Documento = {
                        id: Date.now().toString(),
                        nombre: `Documento_Comercial_${new Date().toLocaleDateString()}.pdf`,
                        tipo: "comercial",
                        formato: "PDF",
                        tamaño: "1.2 MB",
                        fechaSubida: new Date().toISOString().split('T')[0],
                        clienteId: "1",
                        url: "/docs/comercial_nuevo.pdf",
                        descripcion: "Documento comercial generado automáticamente"
                      }
                      setDocumentos(prev => [nuevoComercial, ...prev])
                      alert("Documento comercial generado exitosamente!")
                    }}
                  >
                    <FileText className="w-4 h-4" />
                    Generar Comercial
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => {
                      alert("Abriendo portal de impresión...")
                      console.log("Portal de impresión activado")
                    }}
                  >
                    <Printer className="w-4 h-4" />
                    Portal de Impresión
                  </Button>
                </div>
              </GlassCard>
            </div>

            {/* Lista de documentos */}
            <div className="lg:col-span-3">
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Archivo de Documentos</h3>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Buscar documentos..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="poliza">Pólizas</SelectItem>
                        <SelectItem value="identificacion">Identificación</SelectItem>
                        <SelectItem value="comprobante">Comprobantes</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="comercial">Comerciales</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  {documentosFiltrados.map((documento, index) => (
                    <motion.div
                      key={documento.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="glass rounded-2xl p-4 hover:scale-[1.01] transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {getIconoTipo(documento.tipo)}
                          <div>
                            <h4 className="font-semibold">{documento.nombre}</h4>
                            <p className="text-sm text-muted-foreground">
                              {documento.descripcion}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="text-right text-sm">
                            <Badge variant="outline">
                              {getTipoLabel(documento.tipo)}
                            </Badge>
                            <p className="text-muted-foreground mt-1">
                              {documento.formato} • {documento.tamaño}
                            </p>
                            <p className="text-muted-foreground">
                              {new Date(documento.fechaSubida).toLocaleDateString()}
                            </p>
                          </div>
                          
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="gap-1"
                              onClick={() => {
                                alert(`Visualizando: ${documento.nombre}`)
                                console.log("Ver documento:", documento)
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="gap-1"
                              onClick={() => {
                                alert(`Descargando: ${documento.nombre}`)
                                console.log("Descargar documento:", documento.url)
                              }}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="gap-1"
                              onClick={() => handlePrint(documento)}
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="gap-1"
                              onClick={() => {
                                alert(`Compartiendo: ${documento.nombre}`)
                                console.log("Compartir documento:", documento)
                              }}
                            >
                              <Share2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="gap-1 text-destructive hover:text-destructive"
                              onClick={() => {
                                if (confirm(`¿Estás seguro de eliminar ${documento.nombre}?`)) {
                                  handleDelete(documento.id)
                                  alert("Documento eliminado exitosamente")
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {documentosFiltrados.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No se encontraron documentos</p>
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
