"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { PageHeader } from "@/components/page-header"
import { GlassCard } from "@/components/glass-card"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  Car, HeartPulse, Stethoscope, Calculator, FileText,
  User, Mail, Phone, MapPin, ArrowRight, Save, Send,
  ChevronRight, CheckCircle, Clock, DollarSign, Users
} from "lucide-react"

// Tipos de cotización
const TIPOS_COTIZACION = [
  { id: "auto", nombre: "Seguro Auto", icono: Car, color: "text-blue-500", bg: "bg-blue-500/10" },
  { id: "vida", nombre: "Seguro Vida", icono: HeartPulse, color: "text-red-500", bg: "bg-red-500/10" },
  { id: "gastos", nombre: "Gastos Médicos", icono: Stethoscope, color: "text-green-500", bg: "bg-green-500/10" },
]

// Responsables (del sistema)
const RESPONSABLES = [
  { id: "javier", nombre: "Javier Garcia", email: "javier@crm.com" },
  { id: "monse", nombre: "Monse", email: "monse@crm.com" },
  { id: "daniela", nombre: "Daniela", email: "dani@crm.com" },
]

export default function MulticotizadorPage() {
  const [tipoActivo, setTipoActivo] = useState<string | null>(null)
  const [paso, setPaso] = useState(1)
  
  // Datos comunes del solicitante
  const [solicitante, setSolicitante] = useState({
    nombre: "",
    email: "",
    telefono: "",
    cp: "",
    direccion: "",
    edad: "",
    sexo: "",
  })

  // Datos específicos por tipo
  const [datosAuto, setDatosAuto] = useState({
    marca: "",
    modelo: "",
    año: "",
    placas: "",
    serie: "",
    uso: "personal",
    cobertura: "amplia",
  })

  const [datosVida, setDatosVida] = useState({
    sumaAsegurada: "",
    plazo: "10",
    fuma: "no",
    ocupacion: "",
    beneficiarios: "",
  })

  const [datosGastos, setDatosGastos] = useState({
    deducible: "",
    sumaAsegurada: "",
    tipoPlan: "individual",
    dependientes: "0",
    hospitalPreferencia: "",
  })

  const [cotizacionGenerada, setCotizacionGenerada] = useState(false)
  const [responsableAsignado, setResponsableAsignado] = useState<string | null>(null)

  const setSolicitanteField = (key: string, val: string) => 
    setSolicitante(prev => ({ ...prev, [key]: val }))

  const generarCotizacion = () => {
    setCotizacionGenerada(true)
    toast.success("Cotización generada correctamente")
  }

  const enviarWhatsApp = (responsableId: string) => {
    const responsable = RESPONSABLES.find(r => r.id === responsableId)
    if (!responsable) return

    const tipoNombre = TIPOS_COTIZACION.find(t => t.id === tipoActivo)?.nombre || "Seguro"
    const mensaje = `Nueva cotización ${tipoNombre}%0ACliente: ${solicitante.nombre}%0ATel: ${solicitante.telefono}%0ACP: ${solicitante.cp}`
    window.open(`https://wa.me/?text=${mensaje}`, "_blank")
    setResponsableAsignado(responsableId)
    toast.success(`Info enviada a ${responsable.nombre}`)
  }

  const resetear = () => {
    setTipoActivo(null)
    setPaso(1)
    setSolicitante({ nombre: "", email: "", telefono: "", cp: "", direccion: "", edad: "", sexo: "" })
    setCotizacionGenerada(false)
    setResponsableAsignado(null)
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="main-content-aligned">
          <PageHeader 
            title="Multicotizador" 
            subtitle="Genera cotizaciones para diferentes tipos de seguros"
          />

          {!tipoActivo ? (
            // Selección de tipo de seguro
            <div className="space-y-6">
              <p className="text-muted-foreground text-center max-w-lg mx-auto">
                Selecciona el tipo de seguro que deseas cotizar. Cada flujo está optimizado para capturar la información necesaria.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                {TIPOS_COTIZACION.map((tipo) => (
                  <motion.button
                    key={tipo.id}
                    onClick={() => setTipoActivo(tipo.id)}
                    className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 text-left transition-all hover:border-primary/50 hover:shadow-lg"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className={`mb-4 inline-flex rounded-xl ${tipo.bg} p-3`}>
                      <tipo.icono className={`w-6 h-6 ${tipo.color}`} />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">{tipo.nombre}</h3>
                    <p className="text-sm text-muted-foreground">
                      Cotización rápida para {tipo.nombre.toLowerCase()}
                    </p>
                    <ChevronRight className="absolute right-4 bottom-4 w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </motion.button>
                ))}
              </div>

              {/* Historial de cotizaciones recientes (mock local) */}
              <div className="max-w-4xl mx-auto mt-12">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                  Cotizaciones recientes
                </h3>
                <GlassCard className="p-4">
                  <div className="text-center text-muted-foreground py-8">
                    <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Las cotizaciones generadas aparecerán aquí</p>
                  </div>
                </GlassCard>
              </div>
            </div>
          ) : (
            // Flujo de cotización
            <div className="max-w-3xl mx-auto">
              {/* Header del tipo */}
              <div className="flex items-center gap-3 mb-6">
                <button 
                  onClick={resetear}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  ← Volver
                </button>
                {(() => {
                  const tipo = TIPOS_COTIZACION.find(t => t.id === tipoActivo)
                  if (!tipo) return null
                  return (
                    <>
                      <div className={`p-2 rounded-xl ${tipo.bg}`}>
                        <tipo.icono className={`w-5 h-5 ${tipo.color}`} />
                      </div>
                      <h2 className="text-xl font-semibold">{tipo.nombre}</h2>
                    </>
                  )
                })()}
              </div>

              {/* Indicador de pasos */}
              <div className="flex gap-2 mb-8">
                {[1, 2, 3].map(p => (
                  <div 
                    key={p}
                    className={`flex-1 h-2 rounded-full transition-colors ${
                      paso >= p ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </div>

              {/* Paso 1: Datos del solicitante */}
              {paso === 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <GlassCard className="p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <User className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">Datos del solicitante</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nombre completo *</Label>
                        <Input 
                          value={solicitante.nombre} 
                          onChange={e => setSolicitanteField("nombre", e.target.value)}
                          placeholder="Juan Pérez García"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input 
                          type="email"
                          value={solicitante.email} 
                          onChange={e => setSolicitanteField("email", e.target.value)}
                          placeholder="juan@email.com"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Teléfono *</Label>
                        <Input 
                          value={solicitante.telefono} 
                          onChange={e => setSolicitanteField("telefono", e.target.value)}
                          placeholder="+52 55 1234 5678"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Código Postal *</Label>
                        <Input 
                          value={solicitante.cp} 
                          onChange={e => setSolicitanteField("cp", e.target.value)}
                          placeholder="01000"
                          maxLength={5}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> Dirección
                      </Label>
                      <Input 
                        value={solicitante.direccion} 
                        onChange={e => setSolicitanteField("direccion", e.target.value)}
                        placeholder="Calle, número, colonia"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Edad</Label>
                        <Input 
                          value={solicitante.edad} 
                          onChange={e => setSolicitanteField("edad", e.target.value)}
                          placeholder="35"
                          type="number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Sexo</Label>
                        <Select 
                          value={solicitante.sexo} 
                          onValueChange={v => setSolicitanteField("sexo", v)}
                        >
                          <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="masculino">Masculino</SelectItem>
                            <SelectItem value="femenino">Femenino</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </GlassCard>

                  <div className="flex justify-end">
                    <Button 
                      onClick={() => setPaso(2)}
                      disabled={!solicitante.nombre || !solicitante.telefono || !solicitante.cp}
                    >
                      Continuar <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Paso 2: Datos específicos del seguro */}
              {paso === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <GlassCard className="p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">Datos del seguro</h3>
                    </div>

                    {/* Campos específicos por tipo */}
                    {tipoActivo === "auto" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Marca *</Label>
                            <Input 
                              value={datosAuto.marca} 
                              onChange={e => setDatosAuto({...datosAuto, marca: e.target.value})}
                              placeholder="Toyota"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Modelo *</Label>
                            <Input 
                              value={datosAuto.modelo} 
                              onChange={e => setDatosAuto({...datosAuto, modelo: e.target.value})}
                              placeholder="Corolla"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Año *</Label>
                            <Input 
                              value={datosAuto.año} 
                              onChange={e => setDatosAuto({...datosAuto, año: e.target.value})}
                              placeholder="2023"
                              type="number"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Placas</Label>
                            <Input 
                              value={datosAuto.placas} 
                              onChange={e => setDatosAuto({...datosAuto, placas: e.target.value})}
                              placeholder="ABC-123-D"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Número de serie (VIN)</Label>
                          <Input 
                            value={datosAuto.serie} 
                            onChange={e => setDatosAuto({...datosAuto, serie: e.target.value})}
                            placeholder="3N1AB7AP7KY123456"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Uso del vehículo</Label>
                            <Select 
                              value={datosAuto.uso} 
                              onValueChange={v => setDatosAuto({...datosAuto, uso: v})}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="personal">Personal</SelectItem>
                                <SelectItem value="comercial">Comercial</SelectItem>
                                <SelectItem value="uber">Uber/DiDi</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Tipo de cobertura</Label>
                            <Select 
                              value={datosAuto.cobertura} 
                              onValueChange={v => setDatosAuto({...datosAuto, cobertura: v})}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="basica">Básica (solo daños a terceros)</SelectItem>
                                <SelectItem value="limitada">Limitada</SelectItem>
                                <SelectItem value="amplia">Amplia</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}

                    {tipoActivo === "vida" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Suma asegurada (MXN) *</Label>
                            <Input 
                              value={datosVida.sumaAsegurada} 
                              onChange={e => setDatosVida({...datosVida, sumaAsegurada: e.target.value})}
                              placeholder="1,000,000"
                              type="number"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Plazo (años)</Label>
                            <Select 
                              value={datosVida.plazo} 
                              onValueChange={v => setDatosVida({...datosVida, plazo: v})}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="10">10 años</SelectItem>
                                <SelectItem value="15">15 años</SelectItem>
                                <SelectItem value="20">20 años</SelectItem>
                                <SelectItem value="vida">Vida entera</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>¿Fuma?</Label>
                            <Select 
                              value={datosVida.fuma} 
                              onValueChange={v => setDatosVida({...datosVida, fuma: v})}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="no">No</SelectItem>
                                <SelectItem value="si">Sí</SelectItem>
                                <SelectItem value="ocasional">Ocasionalmente</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Ocupación</Label>
                            <Input 
                              value={datosVida.ocupacion} 
                              onChange={e => setDatosVida({...datosVida, ocupacion: e.target.value})}
                              placeholder="Ingeniero"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" /> Beneficiarios
                          </Label>
                          <Input 
                            value={datosVida.beneficiarios} 
                            onChange={e => setDatosVida({...datosVida, beneficiarios: e.target.value})}
                            placeholder="Nombre(s) de beneficiario(s) y parentesco"
                          />
                        </div>
                      </div>
                    )}

                    {tipoActivo === "gastos" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Tipo de plan</Label>
                            <Select 
                              value={datosGastos.tipoPlan} 
                              onValueChange={v => setDatosGastos({...datosGastos, tipoPlan: v})}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="individual">Individual</SelectItem>
                                <SelectItem value="familiar">Familiar</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Suma asegurada anual (MXN) *</Label>
                            <Input 
                              value={datosGastos.sumaAsegurada} 
                              onChange={e => setDatosGastos({...datosGastos, sumaAsegurada: e.target.value})}
                              placeholder="5,000,000"
                              type="number"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Deducible (MXN)</Label>
                            <Select 
                              value={datosGastos.deducible} 
                              onValueChange={v => setDatosGastos({...datosGastos, deducible: v})}
                            >
                              <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">$0 (sin deducible)</SelectItem>
                                <SelectItem value="5000">$5,000</SelectItem>
                                <SelectItem value="10000">$10,000</SelectItem>
                                <SelectItem value="20000">$20,000</SelectItem>
                                <SelectItem value="50000">$50,000</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Número de dependientes</Label>
                            <Input 
                              value={datosGastos.dependientes} 
                              onChange={e => setDatosGastos({...datosGastos, dependientes: e.target.value})}
                              placeholder="0"
                              type="number"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Hospital de preferencia</Label>
                          <Input 
                            value={datosGastos.hospitalPreferencia} 
                            onChange={e => setDatosGastos({...datosGastos, hospitalPreferencia: e.target.value})}
                            placeholder="Ángeles, Star Médica, etc."
                          />
                        </div>
                      </div>
                    )}
                  </GlassCard>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setPaso(1)}>
                      ← Atrás
                    </Button>
                    <Button 
                      onClick={() => setPaso(3)}
                      disabled={
                        (tipoActivo === "auto" && (!datosAuto.marca || !datosAuto.modelo || !datosAuto.año)) ||
                        (tipoActivo === "vida" && !datosVida.sumaAsegurada) ||
                        (tipoActivo === "gastos" && !datosGastos.sumaAsegurada)
                      }
                    >
                      Continuar <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Paso 3: Generar cotización y asignar */}
              {paso === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  {!cotizacionGenerada ? (
                    <>
                      <GlassCard className="p-8 text-center">
                        <Calculator className="w-12 h-12 mx-auto mb-4 text-primary" />
                        <h3 className="font-semibold text-lg mb-2">Generar cotización</h3>
                        <p className="text-muted-foreground text-sm mb-6">
                          Revisa los datos ingresados y genera la cotización preliminar.
                          <br />En una versión futura, esto conectará con APIs de aseguradoras.
                        </p>
                        <Button size="lg" onClick={generarCotizacion}>
                          <Calculator className="w-4 h-4 mr-2" /> Generar cotización
                        </Button>
                      </GlassCard>

                      <div className="flex justify-start">
                        <Button variant="outline" onClick={() => setPaso(2)}>
                          ← Atrás
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <GlassCard className="p-6 space-y-4">
                        <div className="flex items-center gap-2 text-green-600 mb-4">
                          <CheckCircle className="w-5 h-5" />
                          <h3 className="font-semibold">Cotización generada</h3>
                        </div>

                        <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Tipo</span>
                            <span className="font-medium">
                              {TIPOS_COTIZACION.find(t => t.id === tipoActivo)?.nombre}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Cliente</span>
                            <span className="font-medium">{solicitante.nombre}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Código postal</span>
                            <span className="font-medium">{solicitante.cp}</span>
                          </div>
                          {tipoActivo === "auto" && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Vehículo</span>
                              <span className="font-medium">{datosAuto.marca} {datosAuto.modelo} {datosAuto.año}</span>
                            </div>
                          )}
                          {tipoActivo === "vida" && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Suma asegurada</span>
                              <span className="font-medium">${Number(datosVida.sumaAsegurada).toLocaleString()}</span>
                            </div>
                          )}
                          {tipoActivo === "gastos" && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Cobertura</span>
                              <span className="font-medium">${Number(datosGastos.sumaAsegurada).toLocaleString()} anual</span>
                            </div>
                          )}
                          <div className="border-t border-border/30 pt-3 mt-3">
                            <div className="flex justify-between">
                              <span className="font-semibold">Prima estimada</span>
                              <span className="font-bold text-lg text-primary">
                                $XX,XXX <span className="text-xs font-normal text-muted-foreground">/año</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          * Esta es una cotización preliminar. Los precios finales pueden variar según evaluación de riesgo.
                        </p>
                      </GlassCard>

                      {/* Asignar responsable / Enviar info */}
                      <GlassCard className="p-6 space-y-4">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Send className="w-4 h-4" /> Enviar información
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Selecciona quién recibirá la información para dar seguimiento.
                        </p>

                        <div className="grid grid-cols-3 gap-3">
                          {RESPONSABLES.map(r => (
                            <button
                              key={r.id}
                              onClick={() => enviarWhatsApp(r.id)}
                              className={`p-3 rounded-xl border text-left transition-all ${
                                responsableAsignado === r.id
                                  ? "border-green-500 bg-green-500/10"
                                  : "border-border/50 hover:border-primary/50"
                              }`}
                            >
                              <p className="font-medium text-sm">{r.nombre}</p>
                              <p className="text-xs text-muted-foreground">{r.email}</p>
                              {responsableAsignado === r.id && (
                                <Badge className="mt-2 bg-green-500/20 text-green-600 text-xs">
                                  Enviado ✓
                                </Badge>
                              )}
                            </button>
                          ))}
                        </div>
                      </GlassCard>

                      <div className="flex justify-between">
                        <Button variant="outline" onClick={() => setPaso(2)}>
                          ← Editar datos
                        </Button>
                        <Button variant="outline" onClick={resetear}>
                          <Save className="w-4 h-4 mr-2" /> Guardar y nueva cotización
                        </Button>
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}
