"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { PageHeader } from "@/components/page-header"
import { GlassCard } from "@/components/glass-card"
import { useSupabase, type Cliente } from "@/contexts/supabase-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ProtectedRoute } from "@/components/protected-route"
import { PdfUploadZone } from "@/components/pdf-upload-zone"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  Plus, Search, X, User, Mail, Phone, Building2, FileText,
  Edit2, Trash2, Users, CheckCircle, XCircle
} from "lucide-react"

const emptyForm = {
  nombre: "", email: "", telefono: "", empresa: "",
  rfc: "", direccion: "", ciudad: "", estado: "",
  codigoPostal: "", notas: "", estatus: "activo" as "activo" | "inactivo",
}

export default function ClientesPage() {
  const { clientes, loadingClientes, agregarCliente, actualizarCliente, eliminarCliente, polizas } = useSupabase()

  const [busqueda, setBusqueda] = useState("")
  const [filtroEstatus, setFiltroEstatus] = useState("todos")

  const [modalNuevo, setModalNuevo] = useState(false)
  const [modalEditar, setModalEditar] = useState(false)
  const [modalDetalle, setModalDetalle] = useState(false)
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null)

  const [form, setForm] = useState({ ...emptyForm })
  const [loading, setLoading] = useState(false)
  const [confirmarBorrar, setConfirmarBorrar] = useState<string | null>(null)

  const set = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }))

  const clientesFiltrados = clientes.filter(c => {
    if (filtroEstatus !== "todos" && c.estatus !== filtroEstatus) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return (
        c.nombre.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.telefono.includes(q) ||
        (c.empresa || "").toLowerCase().includes(q) ||
        (c.rfc || "").toLowerCase().includes(q)
      )
    }
    return true
  })

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre || !form.telefono) {
      toast.error("Nombre y teléfono son obligatorios")
      return
    }
    setLoading(true)
    try {
      await agregarCliente({
        nombre: form.nombre,
        email: form.email,
        telefono: form.telefono,
        empresa: form.empresa || undefined,
        rfc: form.rfc || undefined,
        direccion: form.direccion || undefined,
        ciudad: form.ciudad || undefined,
        estado: form.estado || undefined,
        codigoPostal: form.codigoPostal || undefined,
        notas: form.notas || undefined,
        estatus: form.estatus,
        fechaRegistro: new Date().toISOString().split("T")[0],
      })
      setModalNuevo(false)
      setForm({ ...emptyForm })
    } finally {
      setLoading(false)
    }
  }

  const abrirEdicion = (cliente: Cliente) => {
    setClienteSeleccionado(cliente)
    setForm({
      nombre: cliente.nombre,
      email: cliente.email,
      telefono: cliente.telefono,
      empresa: cliente.empresa || "",
      rfc: cliente.rfc || "",
      direccion: cliente.direccion || "",
      ciudad: cliente.ciudad || "",
      estado: cliente.estado || "",
      codigoPostal: cliente.codigoPostal || "",
      notas: cliente.notas || "",
      estatus: cliente.estatus,
    })
    setModalDetalle(false)
    setModalEditar(true)
  }

  const handleEditar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clienteSeleccionado) return
    setLoading(true)
    try {
      await actualizarCliente(clienteSeleccionado.id, {
        nombre: form.nombre,
        email: form.email,
        telefono: form.telefono,
        empresa: form.empresa || undefined,
        rfc: form.rfc || undefined,
        direccion: form.direccion || undefined,
        ciudad: form.ciudad || undefined,
        estado: form.estado || undefined,
        codigoPostal: form.codigoPostal || undefined,
        notas: form.notas || undefined,
        estatus: form.estatus,
      })
      setModalEditar(false)
      setClienteSeleccionado(null)
    } finally {
      setLoading(false)
    }
  }

  const handleEliminar = async (id: string) => {
    await eliminarCliente(id)
    setConfirmarBorrar(null)
    setModalDetalle(false)
  }

  const polizasCliente = (clienteId: string) =>
    polizas.filter(p => p.clienteId === clienteId)

  const FieldGroup = ({ label, icon: Icon, children }: { label: string; icon: any; children: React.ReactNode }) => (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </Label>
      {children}
    </div>
  )

  const ClienteForm = ({ onSubmit }: { onSubmit: (e: React.FormEvent) => void }) => (
    <form onSubmit={onSubmit} className="space-y-5">
      <PdfUploadZone
        onExtracted={data => {
          setForm(prev => ({
            ...prev,
            nombre: data.nombre && !prev.nombre ? data.nombre : prev.nombre,
            email: data.email && !prev.email ? data.email : prev.email,
            telefono: data.telefono && !prev.telefono ? data.telefono : prev.telefono,
            empresa: data.empresa && !prev.empresa ? data.empresa : prev.empresa,
            notas: data.fullText
              ? (prev.notas ? prev.notas + "\n\n" : "") + "--- PDF ---\n" + data.fullText.slice(0, 800)
              : prev.notas,
          }))
        }}
      />

      <div className="grid grid-cols-2 gap-4">
        <FieldGroup label="Nombre *" icon={User}>
          <Input value={form.nombre} onChange={e => set("nombre", e.target.value)} placeholder="Juan Pérez García" required />
        </FieldGroup>
        <FieldGroup label="Empresa" icon={Building2}>
          <Input value={form.empresa} onChange={e => set("empresa", e.target.value)} placeholder="Empresa SA de CV" />
        </FieldGroup>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FieldGroup label="Email" icon={Mail}>
          <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="juan@empresa.com" />
        </FieldGroup>
        <FieldGroup label="Teléfono *" icon={Phone}>
          <Input value={form.telefono} onChange={e => set("telefono", e.target.value)} placeholder="+52 55 1234 5678" required />
        </FieldGroup>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FieldGroup label="RFC" icon={FileText}>
          <Input value={form.rfc} onChange={e => set("rfc", e.target.value)} placeholder="PEGJ840101ABC" />
        </FieldGroup>
        <FieldGroup label="Estatus" icon={CheckCircle}>
          <Select value={form.estatus} onValueChange={v => set("estatus", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="activo">✅ Activo</SelectItem>
              <SelectItem value="inactivo">⛔ Inactivo</SelectItem>
            </SelectContent>
          </Select>
        </FieldGroup>
      </div>

      <div className="rounded-2xl border border-border/40 p-4 space-y-3 bg-muted/20">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dirección (opcional)</p>
        <div className="grid grid-cols-2 gap-3">
          <Input value={form.direccion} onChange={e => set("direccion", e.target.value)} placeholder="Calle y número" />
          <Input value={form.ciudad} onChange={e => set("ciudad", e.target.value)} placeholder="Ciudad" />
          <Input value={form.estado} onChange={e => set("estado", e.target.value)} placeholder="Estado" />
          <Input value={form.codigoPostal} onChange={e => set("codigoPostal", e.target.value)} placeholder="CP" />
        </div>
      </div>

      <FieldGroup label="Notas" icon={FileText}>
        <Textarea value={form.notas} onChange={e => set("notas", e.target.value)} placeholder="Información adicional..." rows={3} />
      </FieldGroup>

      <div className="flex gap-3 pt-4 border-t border-border/30">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? "Guardando..." : clienteSeleccionado ? "Guardar Cambios" : "Crear Cliente"}
        </Button>
        <Button type="button" variant="outline" onClick={() => { setModalNuevo(false); setModalEditar(false) }} className="flex-1">
          Cancelar
        </Button>
      </div>
    </form>
  )

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="main-content-aligned">
          <PageHeader title="Clientes" subtitle={`${clientes.filter(c => c.estatus === "activo").length} clientes activos`} />

          {/* Barra superior */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6 items-start sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email, empresa, RFC..."
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
            <div className="flex gap-2 items-center">
              <Select value={filtroEstatus} onValueChange={setFiltroEstatus}>
                <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="activo">Activos</SelectItem>
                  <SelectItem value="inactivo">Inactivos</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => { setForm({ ...emptyForm }); setModalNuevo(true) }} className="shrink-0">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Cliente
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: "Total", value: clientes.length, icon: Users, color: "text-primary" },
              { label: "Activos", value: clientes.filter(c => c.estatus === "activo").length, icon: CheckCircle, color: "text-green-500" },
              { label: "Inactivos", value: clientes.filter(c => c.estatus === "inactivo").length, icon: XCircle, color: "text-red-400" },
            ].map(s => (
              <GlassCard key={s.label} className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-muted/60 ${s.color}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </GlassCard>
            ))}
          </div>

          <p className="text-xs text-muted-foreground mb-3">{clientesFiltrados.length} clientes {busqueda && `para "${busqueda}"`}</p>

          {/* Tabla */}
          <GlassCard className="overflow-hidden">
            {loadingClientes ? (
              <div className="p-12 text-center text-muted-foreground">Cargando clientes...</div>
            ) : clientesFiltrados.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-muted-foreground">{busqueda ? `Sin resultados para "${busqueda}"` : "No hay clientes registrados"}</p>
                {!busqueda && (
                  <Button className="mt-4" onClick={() => { setForm({ ...emptyForm }); setModalNuevo(true) }}>
                    <Plus className="w-4 h-4 mr-2" /> Agregar primer cliente
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-xs text-muted-foreground uppercase">
                      <th className="text-left p-3 font-semibold">Cliente</th>
                      <th className="text-left p-3 font-semibold hidden md:table-cell">Contacto</th>
                      <th className="text-left p-3 font-semibold hidden lg:table-cell">Empresa</th>
                      <th className="text-center p-3 font-semibold hidden md:table-cell">Pólizas</th>
                      <th className="text-left p-3 font-semibold">Estatus</th>
                      <th className="text-center p-3 font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientesFiltrados.map((cliente, index) => {
                      const nPolizas = polizasCliente(cliente.id).length
                      return (
                        <motion.tr
                          key={cliente.id}
                          className="border-b border-border/30 hover:bg-muted/40 cursor-pointer transition-colors"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                          onClick={() => { setClienteSeleccionado(cliente); setModalDetalle(true) }}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                {cliente.nombre.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium">{cliente.nombre}</p>
                                {cliente.rfc && <p className="text-xs text-muted-foreground">{cliente.rfc}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 hidden md:table-cell">
                            <p className="text-xs">{cliente.email}</p>
                            <p className="text-xs text-muted-foreground">{cliente.telefono}</p>
                          </td>
                          <td className="p-3 hidden lg:table-cell text-sm text-muted-foreground">
                            {cliente.empresa || "—"}
                          </td>
                          <td className="p-3 hidden md:table-cell text-center">
                            <Badge variant={nPolizas > 0 ? "secondary" : "outline"} className="text-xs">
                              {nPolizas} {nPolizas === 1 ? "póliza" : "pólizas"}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className={cliente.estatus === "activo"
                                ? "bg-green-500/10 text-green-600 border-green-500/20"
                                : "bg-gray-500/10 text-gray-500 border-gray-500/20"}
                            >
                              {cliente.estatus}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm" variant="ghost" className="h-7 w-7 p-0"
                                onClick={e => { e.stopPropagation(); abrirEdicion(cliente) }}
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm" variant="ghost" className="h-7 w-7 p-0 hover:text-destructive hover:bg-destructive/10"
                                onClick={e => { e.stopPropagation(); setConfirmarBorrar(cliente.id) }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>

          {/* Modal Nuevo Cliente */}
          <Dialog open={modalNuevo} onOpenChange={setModalNuevo}>
            <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" /> Nuevo Cliente
                </DialogTitle>
                <DialogDescription>Registra un nuevo cliente. Puedes subir un PDF para auto-completar los datos.</DialogDescription>
              </DialogHeader>
              <ClienteForm onSubmit={handleCrear} />
            </DialogContent>
          </Dialog>

          {/* Modal Editar */}
          <Dialog open={modalEditar} onOpenChange={setModalEditar}>
            <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-primary" /> Editar: {clienteSeleccionado?.nombre}
                </DialogTitle>
              </DialogHeader>
              <ClienteForm onSubmit={handleEditar} />
            </DialogContent>
          </Dialog>

          {/* Modal Detalle */}
          <Dialog open={modalDetalle} onOpenChange={setModalDetalle}>
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-lg font-bold text-primary">
                    {clienteSeleccionado?.nombre.charAt(0).toUpperCase()}
                  </div>
                  {clienteSeleccionado?.nombre}
                </DialogTitle>
                <DialogDescription>
                  <Badge
                    variant="outline"
                    className={clienteSeleccionado?.estatus === "activo"
                      ? "bg-green-500/10 text-green-600 border-green-500/20"
                      : "bg-gray-500/10 text-gray-500 border-gray-500/20"}
                  >
                    {clienteSeleccionado?.estatus}
                  </Badge>
                </DialogDescription>
              </DialogHeader>

              {clienteSeleccionado && (
                <div className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      ["Email", clienteSeleccionado.email, Mail],
                      ["Teléfono", clienteSeleccionado.telefono, Phone],
                      ["Empresa", clienteSeleccionado.empresa || "—", Building2],
                      ["RFC", clienteSeleccionado.rfc || "—", FileText],
                    ].map(([label, value, Icon]: any) => (
                      <div key={label} className="flex items-start gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="font-medium">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {(clienteSeleccionado.ciudad || clienteSeleccionado.estado) && (
                    <div className="text-sm">
                      <p className="text-xs text-muted-foreground mb-1">Dirección</p>
                      <p>{[clienteSeleccionado.direccion, clienteSeleccionado.ciudad, clienteSeleccionado.estado, clienteSeleccionado.codigoPostal].filter(Boolean).join(", ")}</p>
                    </div>
                  )}

                  {/* Pólizas del cliente */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Pólizas ({polizasCliente(clienteSeleccionado.id).length})
                    </p>
                    {polizasCliente(clienteSeleccionado.id).length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sin pólizas registradas</p>
                    ) : (
                      <div className="space-y-1 max-h-36 overflow-y-auto">
                        {polizasCliente(clienteSeleccionado.id).map(p => (
                          <div key={p.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/40">
                            <span className="font-mono font-medium">{p.numeroPoliza}</span>
                            <div className="flex items-center gap-2">
                              <span className="capitalize text-muted-foreground">{p.ramo}</span>
                              <Badge variant="outline" className="text-xs">{p.estatus}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {clienteSeleccionado.notas && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Notas</p>
                      <p className="text-sm bg-muted/30 rounded-xl p-3 whitespace-pre-line">{clienteSeleccionado.notas}</p>
                    </div>
                  )}

                  {confirmarBorrar === clienteSeleccionado.id ? (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 space-y-2">
                      <p className="text-sm text-red-500">¿Eliminar este cliente permanentemente?</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleEliminar(clienteSeleccionado.id)}>
                          Eliminar
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => setConfirmarBorrar(null)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 pt-2 border-t border-border/30">
                      <Button className="flex-1" onClick={() => abrirEdicion(clienteSeleccionado)}>
                        <Edit2 className="w-4 h-4 mr-2" /> Editar
                      </Button>
                      <Button variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => setConfirmarBorrar(clienteSeleccionado.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

        </main>
      </div>
    </ProtectedRoute>
  )
}
