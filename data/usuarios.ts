export type Rol = "administrador" | "gerencia" | "asesor" | "administrativo"

export interface Usuario {
  id: string
  nombre: string
  email: string
  rol: Rol
  avatar?: string
  activo: boolean
}

export const usuarios: Usuario[] = [
  {
    id: "1",
    nombre: "Mauricio Portillo",
    email: "admin@crm.com",
    rol: "administrador",
    avatar: "/placeholder.svg?height=40&width=40",
    activo: true,
  },
  {
    id: "2",
    nombre: "Javier Garcia",
    email: "javier@crm.com",
    rol: "gerencia",
    avatar: "/placeholder.svg?height=40&width=40",
    activo: true,
  },
  {
    id: "3",
    nombre: "Monse",
    email: "monse@crm.com",
    rol: "gerencia",
    avatar: "/placeholder.svg?height=40&width=40",
    activo: true,
  },
  {
    id: "4",
    nombre: "Dani",
    email: "dani@crm.com",
    rol: "gerencia",
    avatar: "/placeholder.svg?height=40&width=40",
    activo: true,
  },
]

// Permisos por rol
export const permisos = {
  administrador: {
    dashboard: true,
    prospeccion: true,
    polizas: true,
    "consulta-polizas": true,
    calendario: true,
    pagos: true,
    "pago-semestral": true,
    documentacion: true,
    "manejador-cuentas": true,
    recordatorios: true,
    reportes: true,
    ajustes: true,
    usuarios: true,
    autorizaciones: true,
    verTodo: true,
  },
  gerencia: {
    dashboard: true,
    prospeccion: true,
    polizas: true,
    "consulta-polizas": true,
    calendario: true,
    pagos: true,
    "pago-semestral": true,
    documentacion: true,
    "manejador-cuentas": true,
    recordatorios: true,
    reportes: true,
    ajustes: true,
    usuarios: true,
    autorizaciones: false,
    verTodo: true,
  },
  asesor: {
    dashboard: true,
    prospeccion: true,
    polizas: true,
    "consulta-polizas": true,
    calendario: true,
    pagos: true,
    "pago-semestral": false,
    documentacion: true,
    "manejador-cuentas": true,
    recordatorios: true,
    reportes: false,
    ajustes: false,
    usuarios: false,
    autorizaciones: false,
    verTodo: false,
  },
  administrativo: {
    dashboard: true,
    prospeccion: false,
    polizas: true,
    "consulta-polizas": true,
    calendario: true,
    pagos: true,
    "pago-semestral": true,
    documentacion: true,
    "manejador-cuentas": false,
    recordatorios: true,
    reportes: true,
    ajustes: false,
    usuarios: false,
    autorizaciones: false,
    verTodo: true,
  },
}
