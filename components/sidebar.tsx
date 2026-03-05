"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import {
  LayoutDashboard,
  Users,
  FileText,
  CreditCard,
  Bell,
  BarChart3,
  Settings,
  UserCog,
  LogOut,
  Shield,
  UserIcon,
  Building2,
  FolderOpen,
  Search,
  UserCheck,
  Calendar,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Menu,
  X,
  Target,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, permiso: "dashboard" as const },
  { name: "Prospección", href: "/prospeccion", icon: Users, permiso: "prospeccion" as const },
  { name: "Clientes", href: "/clientes", icon: UserCheck, permiso: "prospeccion" as const },
  { name: "Pólizas", href: "/polizas", icon: FileText, permiso: "polizas" as const },
  { name: "Pólizas Pendientes", href: "/polizas-pendientes", icon: AlertCircle, permiso: "polizas" as const },
  { name: "Consulta Pólizas", href: "/consulta-polizas", icon: Search, permiso: "consulta-polizas" as const },
  { 
    name: "Calendario", 
    icon: Calendar, 
    permiso: "calendario" as const,
    submenu: [
      { name: "General", href: "/calendario", permiso: "calendario" as const },
      { name: "Notificaciones", href: "/calendario-notificaciones", permiso: "calendario" as const },
      { name: "Pagos", href: "/pagos", permiso: "pagos" as const },
    ]
  },
  { name: "Indicadores Cobranza", href: "/indicadores-cobranza", icon: BarChart3, permiso: "reportes" as const },
  { name: "Objetivos", href: "/objetivos", icon: Target, permiso: "reportes" as const },
  { name: "Documentación", href: "/documentacion", icon: FolderOpen, permiso: "documentacion" as const },
  { name: "Recordatorios", href: "/recordatorios", icon: Bell, permiso: "recordatorios" as const },
  { name: "Reportes", href: "/reportes", icon: BarChart3, permiso: "reportes" as const },
  { name: "Ajustes", href: "/ajustes", icon: Settings, permiso: "ajustes" as const },
  { name: "Usuarios", href: "/usuarios", icon: UserCog, permiso: "usuarios" as const },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { usuario, tienePermiso, logout } = useAuth()
  const [submenuAbierto, setSubmenuAbierto] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Cerrar sidebar cuando cambia la ruta (en móvil)
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // Cerrar sidebar con Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false)
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [])

  if (!usuario) return null

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const getRolIcon = () => {
    switch (usuario.rol) {
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

  const getRolColor = () => {
    switch (usuario.rol) {
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

  // Filtrar navegación según permisos
  const navItems = navigation.filter((item) => tienePermiso(item.permiso))

  return (
    <>
      {/* Header móvil */}
      <header className="mobile-header">
        <button 
          className="hamburger-btn"
          onClick={() => setSidebarOpen(true)}
          aria-label="Abrir menú"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold font-serif bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
          CONDUCTO CRM
        </h1>
        <div className="w-11" /> {/* Spacer para centrar el título */}
      </header>

      {/* Overlay para cerrar sidebar en móvil */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'sidebar-open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`liquid-glass-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="flex flex-col h-full p-4 lg:p-6">
          {/* Header con botón cerrar en móvil */}
          <div className="mb-6 lg:mb-8 flex items-center justify-between">
            <h1 className="text-xl lg:text-2xl font-bold font-serif bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              CONDUCTO CRM
            </h1>
            <button 
              className="lg:hidden p-2 rounded-xl hover:bg-muted transition-colors"
              onClick={() => setSidebarOpen(false)}
              aria-label="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        {/* Usuario */}
        <div className="mb-6 glass rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-xl bg-gradient-to-br ${getRolColor()} text-white`}>{getRolIcon()}</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{usuario.nombre}</p>
            <p className="text-xs text-muted-foreground capitalize">{usuario.rol}</p>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="space-y-2 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          // Si el item tiene submenu
          if ('submenu' in item && item.submenu) {
            const isSubmenuActive = item.submenu.some(subitem => pathname === subitem.href)
            const isOpen = submenuAbierto === item.name
            
            return (
              <div key={item.name}>
                <motion.div
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 cursor-pointer",
                    isSubmenuActive
                      ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSubmenuAbierto(isOpen ? null : item.name)}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium flex-1">{item.name}</span>
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </motion.div>
                
                {/* Submenu */}
                <motion.div
                  initial={false}
                  animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="ml-4 mt-2 space-y-1">
                    {item.submenu.map((subitem) => {
                      const isActive = pathname === subitem.href
                      return (
                        <Link key={subitem.name} href={subitem.href}>
                          <motion.div
                            className={cn(
                              "flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200",
                              isActive
                                ? "bg-primary/20 text-primary border-l-2 border-primary"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                            )}
                            whileHover={{ x: 2 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="w-2 h-2 rounded-full bg-current opacity-50" />
                            <span className="font-medium text-sm">{subitem.name}</span>
                          </motion.div>
                        </Link>
                      )
                    })}
                  </div>
                </motion.div>
              </div>
            )
          }
          
          // Items normales sin submenu
          const isActive = pathname === item.href
          return (
            <Link key={item.name} href={item.href || '#'}>
              <motion.div
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </motion.div>
            </Link>
          )
        })}
      </nav>

        {/* Botón de logout */}
        <Button onClick={handleLogout} variant="outline" className="w-full mt-4 group bg-transparent" size="lg">
          <LogOut className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Cerrar Sesión
        </Button>
      </div>
    </aside>
    </>
  )
}
