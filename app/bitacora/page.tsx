"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Sidebar } from "@/components/sidebar"
import { PageHeader } from "@/components/page-header"
import { GlassCard } from "@/components/glass-card"
import { ProtectedRoute } from "@/components/protected-route"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowRight, ChevronDown, ChevronRight, Eye, LogIn, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useSupabase } from "@/contexts/supabase-context"
import { supabase } from "@/lib/supabase"
import { MEXICO_TIME_ZONE, todayDateOnly } from "@/lib/date-only"
import {
  CAMPOS_OCULTOS, MODULOS, agruparEntradas, etiquetaCampo, mapEntradaBitacora, rutaEntrada,
  type AccionBitacora, type EntradaBitacora, type GrupoBitacora,
} from "@/lib/bitacora"

const ACCIONES: Record<AccionBitacora, { etiqueta: string; verbo: string; clase: string; icono: typeof Eye }> = {
  consulta: { etiqueta: "Consulta", verbo: "Consultó", clase: "border-slate-400 text-slate-600 dark:text-slate-300", icono: Eye },
  alta: { etiqueta: "Alta", verbo: "Agregó", clase: "border-green-600 text-green-700 dark:text-green-300", icono: Plus },
  modificacion: { etiqueta: "Modificación", verbo: "Modificó", clase: "border-orange-500 text-orange-700 dark:text-orange-300", icono: Pencil },
  eliminacion: { etiqueta: "Eliminación", verbo: "Eliminó", clase: "border-red-500 text-red-700 dark:text-red-300", icono: Trash2 },
  sesion: { etiqueta: "Sesión", verbo: "", clase: "border-violet-500 text-violet-700 dark:text-violet-300", icono: LogIn },
}

const MAX_ENTRADAS = 20_000
const GRUPOS_POR_PAGINA = 200

/** Ciudad de México está en UTC-6 todo el año desde 2022. */
const rangoDelDia = (fecha: string) => ({
  desde: new Date(`${fecha}T00:00:00-06:00`).toISOString(),
  hasta: new Date(`${fecha}T23:59:59.999-06:00`).toISOString(),
})

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-MX", { timeZone: MEXICO_TIME_ZONE, hour: "2-digit", minute: "2-digit", second: "2-digit" })

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function BitacoraPage() {
  const { tienePermiso } = useAuth()
  const { usuariosSistema, companias, clientes, polizas } = useSupabase()

  const [fecha, setFecha] = useState(todayDateOnly())
  const [entradas, setEntradas] = useState<EntradaBitacora[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actualizado, setActualizado] = useState<string | null>(null)
  const [filtroUsuario, setFiltroUsuario] = useState("todos")
  const [filtroAccion, setFiltroAccion] = useState<"todas" | "cambios" | AccionBitacora>("todas")
  const [filtroModulo, setFiltroModulo] = useState("todos")
  const [busqueda, setBusqueda] = useState("")
  const [abiertos, setAbiertos] = useState<Set<number>>(new Set())
  const [limite, setLimite] = useState(GRUPOS_POR_PAGINA)

  const esHoy = fecha === todayDateOnly()

  const cargar = useCallback(async () => {
    const { desde, hasta } = rangoDelDia(fecha)
    const todas: EntradaBitacora[] = []
    for (let inicio = 0; inicio < MAX_ENTRADAS; inicio += 1000) {
      const { data, error: consultaError } = await supabase
        .from("bitacora")
        .select("*")
        .gte("created_at", desde)
        .lte("created_at", hasta)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(inicio, inicio + 999)
      if (consultaError) {
        setError(consultaError.code === "PGRST205"
          ? "La bitácora aún no está activada: ejecuta supabase-bitacora.sql en el SQL Editor de Supabase."
          : consultaError.message)
        setCargando(false)
        return
      }
      todas.push(...(data || []).map(mapEntradaBitacora))
      if (!data || data.length < 1000) break
    }
    setError(null)
    setEntradas(todas)
    setCargando(false)
    setActualizado(hora(new Date().toISOString()))
  }, [fecha])

  useEffect(() => {
    setCargando(true)
    setLimite(GRUPOS_POR_PAGINA)
    void cargar()
  }, [cargar])

  // El día en curso se refresca solo cada 30 segundos.
  useEffect(() => {
    if (!esHoy) return
    const intervalo = setInterval(() => void cargar(), 30_000)
    return () => clearInterval(intervalo)
  }, [esHoy, cargar])

  const nombres = useMemo(() => {
    const mapa = new Map<string, string>()
    usuariosSistema.forEach(item => mapa.set(item.id, item.nombre))
    companias.forEach(item => mapa.set(item.id, item.nombre))
    clientes.forEach(item => mapa.set(item.id, item.nombre))
    polizas.forEach(item => mapa.set(item.id, `Póliza ${item.numeroPoliza}`))
    return mapa
  }, [usuariosSistema, companias, clientes, polizas])

  const valor = (dato: unknown): string => {
    if (dato === null || dato === undefined || dato === "") return "vacío"
    if (typeof dato === "boolean") return dato ? "Sí" : "No"
    if (typeof dato === "number") return dato.toLocaleString("es-MX", { maximumFractionDigits: 4 })
    if (typeof dato === "string") {
      if (UUID.test(dato)) return nombres.get(dato) || `${dato.slice(0, 8)}…`
      if (/^\d{4}-\d{2}-\d{2}$/.test(dato)) return dato.split("-").reverse().join("/")
      if (/^\d{4}-\d{2}-\d{2}T/.test(dato)) {
        return new Date(dato).toLocaleString("es-MX", { timeZone: MEXICO_TIME_ZONE, dateStyle: "short", timeStyle: "short" })
      }
      return dato.length > 140 ? `${dato.slice(0, 140)}…` : dato
    }
    const texto = JSON.stringify(dato)
    return texto.length > 140 ? `${texto.slice(0, 140)}…` : texto
  }

  const describir = (entrada: EntradaBitacora) => {
    if (entrada.descripcion) return entrada.descripcion
    const accion = ACCIONES[entrada.accion]
    if (entrada.accion === "modificacion" && entrada.cambios) {
      const campos = Object.keys(entrada.cambios).filter(campo => !CAMPOS_OCULTOS.has(campo)).map(etiquetaCampo)
      return `${accion.verbo} ${campos.slice(0, 3).join(", ").toLowerCase()}${campos.length > 3 ? ` y ${campos.length - 3} más` : ""}`
    }
    return `${accion.verbo} ${(entrada.etiqueta || MODULOS[entrada.entidad] || entrada.entidad).toString()}`
  }

  const usuariosDelDia = useMemo(() => {
    const mapa = new Map<string, { nombre: string; rol?: string; cambios: number; consultas: number; ultima: string }>()
    for (const entrada of entradas) {
      const clave = entrada.usuarioEmail || "__sistema__"
      const actual = mapa.get(clave) || {
        nombre: entrada.usuarioNombre || (entrada.usuarioEmail ?? "Sistema / fuera de la app"),
        rol: entrada.usuarioRol,
        cambios: 0,
        consultas: 0,
        ultima: entrada.createdAt,
      }
      if (entrada.accion === "consulta") actual.consultas++
      else if (entrada.accion !== "sesion") actual.cambios += entrada.cantidad || 1
      if (entrada.createdAt > actual.ultima) actual.ultima = entrada.createdAt
      mapa.set(clave, actual)
    }
    return [...mapa.entries()].sort((a, b) => b[1].ultima.localeCompare(a[1].ultima))
  }, [entradas])

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return entradas.filter(entrada => {
      if (filtroUsuario !== "todos" && (entrada.usuarioEmail || "__sistema__") !== filtroUsuario) return false
      if (filtroAccion === "cambios" && !["alta", "modificacion", "eliminacion"].includes(entrada.accion)) return false
      if (filtroAccion !== "todas" && filtroAccion !== "cambios" && entrada.accion !== filtroAccion) return false
      if (filtroModulo !== "todos" && entrada.entidad !== filtroModulo) return false
      if (texto) {
        const campos = [entrada.usuarioNombre, entrada.etiqueta, entrada.polizaNumero, entrada.clienteNombre, entrada.descripcion]
        if (!campos.some(campo => campo?.toLowerCase().includes(texto))) return false
      }
      return true
    })
  }, [entradas, filtroUsuario, filtroAccion, filtroModulo, busqueda])

  const grupos = useMemo(() => agruparEntradas(filtradas), [filtradas])
  const modulos = useMemo(() => [...new Set(entradas.map(entrada => entrada.entidad))].sort(), [entradas])

  const alternar = (id: number) => setAbiertos(previos => {
    const siguientes = new Set(previos)
    if (siguientes.has(id)) siguientes.delete(id)
    else siguientes.add(id)
    return siguientes
  })

  if (!tienePermiso("bitacora")) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Sidebar />
          <main className="main-content-aligned">
            <PageHeader title="Bitácora" subtitle="Sin acceso" showSearch={false} />
            <GlassCard className="p-8 text-center text-muted-foreground">Sólo el administrador puede consultar la bitácora.</GlassCard>
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  const detalleCambios = (entrada: EntradaBitacora) => {
    const cambios = Object.entries(entrada.cambios || {}).filter(([campo]) => !CAMPOS_OCULTOS.has(campo))
    if (!cambios.length) return null
    return (
      <ul className="mt-2 space-y-1 text-sm">
        {cambios.map(([campo, cambio]) => (
          <li key={campo} className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-medium">{etiquetaCampo(campo)}:</span>
            <span className="text-muted-foreground line-through decoration-muted-foreground/50">{valor(cambio?.antes)}</span>
            <ArrowRight className="h-3 w-3 self-center text-muted-foreground" />
            <span>{valor(cambio?.despues)}</span>
          </li>
        ))}
      </ul>
    )
  }

  const detalleRegistro = (entrada: EntradaBitacora) => {
    const campos = Object.entries(entrada.registro || {})
      .filter(([campo, dato]) => !CAMPOS_OCULTOS.has(campo) && dato !== null && dato !== "" && !(Array.isArray(dato) && !dato.length))
    if (!campos.length) return null
    return (
      <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
        {campos.map(([campo, dato]) => (
          <div key={campo} className="flex gap-2 min-w-0">
            <dt className="text-muted-foreground shrink-0">{etiquetaCampo(campo)}:</dt>
            <dd className="truncate">{valor(dato)}</dd>
          </div>
        ))}
      </dl>
    )
  }

  const filaEntrada = (entrada: EntradaBitacora, secundaria = false) => {
    const accion = ACCIONES[entrada.accion]
    const Icono = accion.icono
    const ruta = rutaEntrada(entrada)
    const contexto = [
      entrada.etiqueta && !describir(entrada).includes(entrada.etiqueta) ? entrada.etiqueta : null,
      entrada.polizaNumero && !entrada.etiqueta?.includes(entrada.polizaNumero) ? `Póliza ${entrada.polizaNumero}` : null,
      entrada.clienteNombre && entrada.clienteNombre !== entrada.etiqueta ? entrada.clienteNombre : null,
    ].filter(Boolean)
    const conRegistro = entrada.accion === "alta" || entrada.accion === "eliminacion"
    return (
      <div className={`flex gap-3 ${secundaria ? "py-2" : ""}`}>
        <div className="w-20 shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">{hora(entrada.createdAt)}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={`gap-1 ${accion.clase}`}><Icono className="h-3 w-3" />{accion.etiqueta}</Badge>
            <span className="text-xs text-muted-foreground">{MODULOS[entrada.entidad] || entrada.entidad}</span>
            {entrada.origen === "reconstruido" && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground" title="Reconstruido con los datos que había antes de activar la bitácora">Reconstruido</Badge>
            )}
          </div>
          <p className="mt-1 font-medium">{describir(entrada)}</p>
          {contexto.length > 0 && <p className="text-sm text-muted-foreground">{contexto.join(" · ")}</p>}
          {entrada.pantalla && entrada.accion !== "consulta" && (
            <p className="text-xs text-muted-foreground">Desde {entrada.pantalla}</p>
          )}
          {detalleCambios(entrada)}
          {conRegistro && secundaria && detalleRegistro(entrada)}
        </div>
        {ruta && (
          <Button asChild variant="ghost" size="sm" className="shrink-0 gap-1">
            <Link href={ruta}>Ir<ArrowRight className="h-3 w-3" /></Link>
          </Button>
        )}
      </div>
    )
  }

  const tarjetaGrupo = ({ principal, relacionadas }: GrupoBitacora) => {
    const abierto = abiertos.has(principal.id)
    const conRegistro = (principal.accion === "alta" || principal.accion === "eliminacion") && !!principal.registro
    const desplegable = relacionadas.length > 0 || conRegistro
    return (
      <GlassCard key={principal.id} className="p-4">
        <div className="flex gap-3">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-sm">
              <span className="font-semibold">{principal.usuarioNombre || principal.usuarioEmail || "Sistema / fuera de la app"}</span>
              {principal.usuarioRol && <span className="text-muted-foreground"> · {principal.usuarioRol}</span>}
            </p>
            {filaEntrada(principal)}
          </div>
        </div>
        {desplegable && (
          <button
            type="button"
            onClick={() => alternar(principal.id)}
            className="mt-2 ml-[5.75rem] flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {abierto ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {relacionadas.length > 0
              ? `${relacionadas.length} ${relacionadas.length === 1 ? "cambio relacionado" : "cambios relacionados"}`
              : principal.accion === "alta" ? "Ver lo que se agregó" : "Ver lo que se eliminó"}
          </button>
        )}
        {abierto && (
          <div className="mt-2 ml-[5.75rem] divide-y divide-border/50 border-l-2 border-border/50 pl-3">
            {conRegistro && <div className="py-2">{detalleRegistro(principal)}</div>}
            {relacionadas.map(entrada => <div key={entrada.id}>{filaEntrada(entrada, true)}</div>)}
          </div>
        )}
      </GlassCard>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="main-content-aligned">
          <PageHeader
            title="Bitácora"
            subtitle="Quién consultó, agregó, modificó o eliminó qué, y a qué hora"
            showSearch={false}
            action={
              <Button variant="outline" className="gap-2" disabled={cargando} onClick={() => { setCargando(true); void cargar() }}>
                <RefreshCw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} />Actualizar
              </Button>
            }
          />

          {error && <GlassCard className="p-6 mb-6 text-center text-red-600">{error}</GlassCard>}

          {usuariosDelDia.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
              {usuariosDelDia.map(([clave, resumen]) => {
                const activo = filtroUsuario === clave
                return (
                  <button key={clave} type="button" className="text-left" onClick={() => setFiltroUsuario(activo ? "todos" : clave)}>
                    <GlassCard className={`p-4 h-full transition-colors ${activo ? "ring-2 ring-primary" : "hover:bg-muted/30"}`}>
                      <p className="font-semibold truncate">{resumen.nombre}</p>
                      <p className="text-xs text-muted-foreground mb-2">{resumen.rol || "—"} · última actividad {hora(resumen.ultima)}</p>
                      <p className="text-sm">
                        <span className="font-semibold">{resumen.cambios.toLocaleString("es-MX")}</span> cambios ·{" "}
                        <span className="font-semibold">{resumen.consultas.toLocaleString("es-MX")}</span> consultas
                      </p>
                    </GlassCard>
                  </button>
                )
              })}
            </div>
          )}

          <GlassCard className="p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
              <div className="space-y-1">
                <Label className="text-xs">Día</Label>
                <Input type="date" value={fecha} max={todayDateOnly()} onChange={event => event.target.value && setFecha(event.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Usuario</Label>
                <Select value={filtroUsuario} onValueChange={setFiltroUsuario}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {usuariosDelDia.map(([clave, resumen]) => <SelectItem key={clave} value={clave}>{resumen.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Acción</Label>
                <Select value={filtroAccion} onValueChange={(value: typeof filtroAccion) => setFiltroAccion(value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="cambios">Sólo cambios (altas, modificaciones y eliminaciones)</SelectItem>
                    <SelectItem value="consulta">Consultas</SelectItem>
                    <SelectItem value="alta">Altas</SelectItem>
                    <SelectItem value="modificacion">Modificaciones</SelectItem>
                    <SelectItem value="eliminacion">Eliminaciones</SelectItem>
                    <SelectItem value="sesion">Inicios y cierres de sesión</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Módulo</Label>
                <Select value={filtroModulo} onValueChange={setFiltroModulo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {modulos.map(modulo => <SelectItem key={modulo} value={modulo}>{MODULOS[modulo] || modulo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 lg:col-span-2">
                <Label className="text-xs">Buscar</Label>
                <Input value={busqueda} onChange={event => setBusqueda(event.target.value)} placeholder="Póliza, cliente, usuario o descripción" />
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {filtradas.length.toLocaleString("es-MX")} de {entradas.length.toLocaleString("es-MX")} movimientos
              {actualizado && ` · actualizado ${actualizado}`}
              {esHoy && " · se actualiza cada 30 segundos"}
            </p>
          </GlassCard>

          {cargando && !entradas.length ? (
            <GlassCard className="p-8 text-center text-muted-foreground">Cargando bitácora…</GlassCard>
          ) : !grupos.length && !error ? (
            <GlassCard className="p-8 text-center text-muted-foreground">No hay movimientos con estos filtros.</GlassCard>
          ) : (
            <div className="space-y-3">
              {grupos.slice(0, limite).map(tarjetaGrupo)}
              {grupos.length > limite && (
                <Button variant="outline" className="w-full" onClick={() => setLimite(actual => actual + GRUPOS_POR_PAGINA)}>
                  Mostrar más ({(grupos.length - limite).toLocaleString("es-MX")} restantes)
                </Button>
              )}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}
