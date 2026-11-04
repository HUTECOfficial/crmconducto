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
    nombre: "Montse",
    email: "montse@crm.com",
    rol: "gerencia",
    avatar: "/placeholder.svg?height=40&width=40",
    activo: true,
  },
  {
    id: "4",
    nombre: "Daniela",
    email: "dani@crm.com",
    rol: "gerencia",
    avatar: "/placeholder.svg?height=40&width=40",
    activo: true,
  },
  // Encargados de cobranza, con el mismo perfil que Montse.
  {
    id: "5",
    nombre: "Maggie Huape",
    email: "maggie@crm.com",
    rol: "gerencia",
    avatar: "/placeholder.svg?height=40&width=40",
    activo: true,
  },
  {
    id: "6",
    nombre: "Gael García",
    email: "gael@crm.com",
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
    bitacora: true,
    // Sólo Mauricio (administrador) ve la bitácora de todos; los demás, sólo la suya.
    bitacoraCompleta: true,
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
    bitacora: true,
    bitacoraCompleta: false,
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
    bitacora: true,
    bitacoraCompleta: false,
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
    bitacora: true,
    bitacoraCompleta: false,
  },
}
