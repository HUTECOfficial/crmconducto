"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { PageHeader } from "@/components/page-header"
import { GlassCard } from "@/components/glass-card"
import { NeoButton } from "@/components/neo-button"
import { usuarios, type Usuario, type Rol } from "@/data/usuarios"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { Shield, UserIcon, Building2, Plus, Edit, Trash2, CheckCircle, XCircle } from "lucide-react"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/contexts/auth-context"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export default function UsuariosPage() {
  const { tienePermiso } = useAuth()
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<Usuario | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    rol: "asesor" as Rol,
    activo: true,
  })

  // Verificar permisos
  if (!tienePermiso("usuarios")) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Sidebar />
          <main className="ml-64 p-8">
            <GlassCard className="p-12 text-center">
              <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Acceso Denegado</h2>
              <p className="text-muted-foreground">No tienes permisos para acceder a esta sección</p>
            </GlassCard>
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  const getRolIcon = (rol: Rol) => {
    switch (rol) {
      case "administrador":
        return <Shield className="w-5 h-5" />
      case "gerencia":
        return <Building2 className="w-5 h-5" />
      case "asesor":
        return <UserIcon className="w-5 h-5" />
      case "administrativo":
        return <Building2 className="w-5 h-5" />
      default:
        return <UserIcon className="w-5 h-5" />
    }
  }

  const getRolColor = (rol: Rol) => {
    switch (rol) {
      case "administrador":
        return "from-primary to-secondary"
      case "gerencia":
        return "from-blue-500 to-indigo-600"
      case "asesor":
        return "from-accent to-primary"
      case "administrativo":
        return "from-warning to-accent"
      default:
        return "from-primary to-secondary"
    }
  }

  const getRolBadgeColor = (rol: Rol) => {
    switch (rol) {
      case "administrador":
        return "bg-primary/10 text-primary border-primary/20"
      case "gerencia":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20"
      case "asesor":
        return "bg-accent/10 text-accent border-accent/20"
      case "administrativo":
        return "bg-warning/10 text-warning border-warning/20"
      default:
        return "bg-primary/10 text-primary border-primary/20"
    }
  }

  const handleNuevoUsuario = () => {
    setFormData({
      nombre: "",
      email: "",
      rol: "asesor",
      activo: true,
    })
    setIsFormOpen(true)
  }

  const handleEditarUsuario = (usuario: Usuario) => {
    setFormData({
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      activo: usuario.activo,
    })
    setUsuarioSeleccionado(usuario)
    setIsFormOpen(true)
  }

  const handleGuardar = () => {
    // En una app real, aquí se guardaría en la base de datos
    console.log("Guardando usuario:", formData)
    setIsFormOpen(false)
    setUsuarioSeleccionado(null)
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="main-content-aligned">
          <PageHeader
            title="Gestión de Usuarios"
            subtitle="Administra usuarios, roles y permisos del sistema"
            action={
              <NeoButton onClick={handleNuevoUsuario} className="gap-2">
                <Plus className="w-5 h-5" />
                Nuevo Usuario
              </NeoButton>
            }
          />

          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <GlassCard className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-secondary text-white">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{usuarios.filter((u) => u.rol === "administrador").length}</p>
                  <p className="text-sm text-muted-foreground">Administradores</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{usuarios.filter((u) => u.rol === "gerencia").length}</p>
                  <p className="text-sm text-muted-foreground">Gerencia</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-accent to-primary text-white">
                  <UserIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{usuarios.filter((u) => u.rol === "asesor" || u.rol === "administrativo").length}</p>
                  <p className="text-sm text-muted-foreground">Otros</p>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Lista de usuarios */}
          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-4 font-semibold">Usuario</th>
                    <th className="text-left p-4 font-semibold">Email</th>
                    <th className="text-left p-4 font-semibold">Rol</th>
                    <th className="text-left p-4 font-semibold">Estado</th>
                    <th className="text-left p-4 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((usuario, index) => (
                    <motion.tr
                      key={usuario.id}
                      className="border-b border-border/30 hover:bg-muted/50 transition-colors"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl bg-gradient-to-br ${getRolColor(usuario.rol)} text-white`}>
                            {getRolIcon(usuario.rol)}
                          </div>
                          <div>
                            <p className="font-semibold">{usuario.nombre}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-muted-foreground">{usuario.email}</p>
                      </td>
                      <td className="p-4">
                        <Badge className={getRolBadgeColor(usuario.rol)} variant="outline">
                          {usuario.rol}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {usuario.activo ? (
                          <Badge className="bg-success/10 text-success border-success/20" variant="outline">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Activo
                          </Badge>
                        ) : (
                          <Badge className="bg-destructive/10 text-destructive border-destructive/20" variant="outline">
                            <XCircle className="w-3 h-3 mr-1" />
                            Inactivo
                          </Badge>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditarUsuario(usuario)}
                            className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* Modal de formulario */}
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className="glass-strong max-w-md">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">
                  {usuarioSeleccionado ? "Editar Usuario" : "Nuevo Usuario"}
                </DialogTitle>
                <DialogDescription>
                  {usuarioSeleccionado ? "Modifica la información del usuario" : "Agrega un nuevo usuario al sistema"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre completo</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Juan Pérez"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="juan@ejemplo.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rol">Rol</Label>
                  <Select value={formData.rol} onValueChange={(value: Rol) => setFormData({ ...formData, rol: value })}>
                    <SelectTrigger id="rol">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="administrador">Administrador</SelectItem>
                      <SelectItem value="gerencia">Gerencia</SelectItem>
                      <SelectItem value="asesor">Asesor</SelectItem>
                      <SelectItem value="administrativo">Administrativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                  <div className="space-y-0.5">
                    <Label htmlFor="activo">Usuario activo</Label>
                    <p className="text-sm text-muted-foreground">El usuario puede acceder al sistema</p>
                  </div>
                  <Switch
                    id="activo"
                    checked={formData.activo}
                    onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <NeoButton onClick={handleGuardar} className="flex-1">
                    Guardar
                  </NeoButton>
                  <NeoButton
                    onClick={() => {
                      setIsFormOpen(false)
                      setUsuarioSeleccionado(null)
                    }}
                    className="flex-1 bg-muted hover:bg-muted/80"
                  >
                    Cancelar
                  </NeoButton>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </ProtectedRoute>
  )
}
