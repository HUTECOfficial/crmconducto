"use client"

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { Loader2, RotateCcw, Send, Smartphone, Sparkles, Square, X } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { registrarEnBitacora } from "@/lib/bitacora-registro"
import { NOMBRE_ASISTENTE, SUGERENCIAS } from "@/lib/asistente/personalidad"

interface Mensaje {
  rol: "user" | "assistant"
  texto: string
}

const CLAVE_CONVERSACION = "crm-coni-conversacion"

/** Markdown mínimo de las respuestas: **negritas**, [enlaces](/ruta), viñetas y saltos de línea. */
function enLinea(texto: string, cerrar: () => void): ReactNode[] {
  const partes: ReactNode[] = []
  const patron = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g
  let ultimo = 0
  for (const coincidencia of texto.matchAll(patron)) {
    const inicio = coincidencia.index ?? 0
    if (inicio > ultimo) partes.push(texto.slice(ultimo, inicio))
    if (coincidencia[1]) {
      partes.push(<strong key={inicio}>{coincidencia[1]}</strong>)
    } else if (coincidencia[3].startsWith("/")) {
      // Sólo rutas internas del CRM: Coni no enlaza a sitios externos.
      partes.push(
        <Link key={inicio} href={coincidencia[3]} onClick={cerrar} className="font-medium text-primary underline underline-offset-2">
          {coincidencia[2]}
        </Link>,
      )
    } else {
      partes.push(coincidencia[2])
    }
    ultimo = inicio + coincidencia[0].length
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo))
  return partes
}

function Respuesta({ texto, cerrar }: { texto: string; cerrar: () => void }) {
  const lineas = texto.split("\n")
  return (
    <div className="space-y-1">
      {lineas.map((linea, indice) => {
        const vineta = linea.match(/^\s*[-*•]\s+(.*)/)
        const numerada = linea.match(/^\s*(\d+)[.)]\s+(.*)/)
        const titulo = linea.match(/^#{1,4}\s+(.*)/)
        if (!linea.trim()) return <div key={indice} className="h-1" />
        if (vineta) return <div key={indice} className="flex gap-2 pl-1"><span className="text-primary">•</span><span>{enLinea(vineta[1], cerrar)}</span></div>
        if (numerada) return <div key={indice} className="flex gap-2 pl-1"><span className="font-semibold text-primary">{numerada[1]}.</span><span>{enLinea(numerada[2], cerrar)}</span></div>
        if (titulo) return <p key={indice} className="font-semibold">{enLinea(titulo[1], cerrar)}</p>
        return <p key={indice}>{enLinea(linea, cerrar)}</p>
      })}
    </div>
  )
}

function Avatar({ chico = false }: { chico?: boolean }) {
  return (
    <div className={`${chico ? "h-7 w-7" : "h-10 w-10"} shrink-0 rounded-full bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center shadow-md ring-2 ring-white/40`}>
      <Sparkles className={`${chico ? "h-3.5 w-3.5" : "h-5 w-5"} text-white`} />
    </div>
  )
}

export function AsistenteConi() {
  const { usuario } = useAuth()
  const pathname = usePathname()
  const [abierto, setAbierto] = useState(false)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [borrador, setBorrador] = useState("")
  const [respondiendo, setRespondiendo] = useState(false)
  const [estado, setEstado] = useState<string | null>(null)
  const abortar = useRef<AbortController | null>(null)
  const final = useRef<HTMLDivElement>(null)
  const entrada = useRef<HTMLTextAreaElement>(null)

  // La conversación sobrevive a cambiar de pantalla (sólo en esta pestaña).
  useEffect(() => {
    try {
      const guardada = sessionStorage.getItem(CLAVE_CONVERSACION)
      if (guardada) setMensajes(JSON.parse(guardada))
    } catch {
      // Sin almacenamiento la conversación empieza de cero.
    }
  }, [])
  useEffect(() => {
    try {
      sessionStorage.setItem(CLAVE_CONVERSACION, JSON.stringify(mensajes))
    } catch {
      // Ignorado: sólo se pierde la conversación al recargar.
    }
    final.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [mensajes, estado])
  useEffect(() => {
    if (abierto) setTimeout(() => entrada.current?.focus(), 150)
  }, [abierto])

  if (!usuario || pathname === "/login") return null
  const primerNombre = usuario.nombre.split(" ")[0]

  const enviar = async (texto: string) => {
    const pregunta = texto.trim()
    if (!pregunta || respondiendo) return
    const historial: Mensaje[] = [...mensajes, { rol: "user", texto: pregunta }]
    setMensajes([...historial, { rol: "assistant", texto: "" }])
    setBorrador("")
    setRespondiendo(true)
    setEstado("Pensando…")
    void registrarEnBitacora({
      accion: "consulta",
      entidad: "asistente",
      descripcion: `Preguntó a ${NOMBRE_ASISTENTE}: "${pregunta.slice(0, 140)}${pregunta.length > 140 ? "…" : ""}"`,
    })

    const agregar = (fragmento: string) => setMensajes(actuales => {
      const copia = [...actuales]
      const ultimo = copia[copia.length - 1]
      copia[copia.length - 1] = { ...ultimo, texto: ultimo.texto + fragmento }
      return copia
    })

    const control = new AbortController()
    abortar.current = control
    try {
      const respuesta = await fetch("/api/asistente/", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-crm-usuario": usuario.email },
        // Sólo los últimos turnos: suficiente contexto sin crecer el costo sin límite.
        body: JSON.stringify({ mensajes: historial.filter(m => m.texto.trim()).slice(-20) }),
        signal: control.signal,
      })
      if (!respuesta.ok || !respuesta.body) {
        const datos = await respuesta.json().catch(() => ({}))
        agregar(datos.error || "No pude conectarme. Intenta de nuevo.")
        return
      }
      const lector = respuesta.body.getReader()
      const decodificador = new TextDecoder()
      let pendiente = ""
      while (true) {
        const { done, value } = await lector.read()
        if (done) break
        pendiente += decodificador.decode(value, { stream: true })
        const lineas = pendiente.split("\n")
        pendiente = lineas.pop() || ""
        for (const linea of lineas) {
          if (!linea.trim()) continue
          const evento = JSON.parse(linea) as { tipo: string; texto?: string }
          if (evento.tipo === "texto" && evento.texto) {
            setEstado(null)
            agregar(evento.texto)
          } else if (evento.tipo === "estado" && evento.texto) {
            setEstado(evento.texto)
          } else if (evento.tipo === "error" && evento.texto) {
            agregar(`\n\n${evento.texto}`)
          }
        }
      }
    } catch (error: any) {
      if (error?.name !== "AbortError") agregar("\n\nSe cortó la conexión. Intenta de nuevo.")
    } finally {
      setRespondiendo(false)
      setEstado(null)
      abortar.current = null
      // Si no llegó nada, que no quede una burbuja vacía.
      setMensajes(actuales => {
        const ultimo = actuales[actuales.length - 1]
        return ultimo?.rol === "assistant" && !ultimo.texto.trim()
          ? [...actuales.slice(0, -1), { rol: "assistant", texto: "No obtuve respuesta. ¿Lo intentamos otra vez?" }]
          : actuales
      })
    }
  }

  const nuevaConversacion = () => {
    abortar.current?.abort()
    setMensajes([])
  }

  return (
    <>
      <AnimatePresence>
        {abierto && (
          <motion.section
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="fixed z-50 bottom-24 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-[400px] h-[min(620px,calc(100vh-8rem))] flex flex-col overflow-hidden rounded-3xl border border-border/60 bg-background/95 shadow-2xl backdrop-blur-xl"
            aria-label={`Asistente ${NOMBRE_ASISTENTE}`}
          >
            <header className="flex items-center gap-3 bg-gradient-to-r from-primary via-accent to-primary px-4 py-3 text-white">
              <Avatar />
              <div className="min-w-0 flex-1">
                <p className="font-serif text-lg font-bold leading-tight">{NOMBRE_ASISTENTE}</p>
                <p className="text-xs text-white/80">Tu copiloto en Conducto CRM</p>
              </div>
              <Link href="/coni-telegram" onClick={() => setAbierto(false)} className="rounded-full p-2 hover:bg-white/15" title="Usar en Telegram">
                <Smartphone className="h-4 w-4" />
              </Link>
              {mensajes.length > 0 && (
                <button type="button" onClick={nuevaConversacion} className="rounded-full p-2 hover:bg-white/15" title="Nueva conversación">
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
              <button type="button" onClick={() => setAbierto(false)} className="rounded-full p-2 hover:bg-white/15" title="Cerrar">
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 text-sm">
              {mensajes.length === 0 && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Avatar chico />
                    <div className="rounded-2xl rounded-tl-sm bg-muted/60 px-3 py-2">
                      <p>¡Hola, {primerNombre}! Soy <strong>{NOMBRE_ASISTENTE}</strong>.</p>
                      <p className="mt-1">Te ayudo a encontrar pólizas y clientes, revisar qué hay que cobrar, ver renovaciones o resolver cómo se hace algo en el CRM. ¿Por dónde empezamos?</p>
                      <Link href="/coni-telegram" onClick={() => setAbierto(false)} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-2">
                        <Smartphone className="h-3 w-3" />También me puedes usar en Telegram
                      </Link>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pl-9">
                    {SUGERENCIAS.map(sugerencia => (
                      <button
                        key={sugerencia}
                        type="button"
                        onClick={() => void enviar(sugerencia)}
                        className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs text-primary hover:bg-primary/10"
                      >
                        {sugerencia}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mensajes.map((mensaje, indice) => (
                <Fragment key={indice}>
                  {mensaje.rol === "user" ? (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-primary-foreground">{mensaje.texto}</div>
                    </div>
                  ) : mensaje.texto ? (
                    <div className="flex gap-2">
                      <Avatar chico />
                      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted/60 px-3 py-2">
                        <Respuesta texto={mensaje.texto} cerrar={() => setAbierto(false)} />
                      </div>
                    </div>
                  ) : null}
                </Fragment>
              ))}

              {respondiendo && estado && (
                <div className="flex items-center gap-2 pl-9 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />{estado}
                </div>
              )}
              <div ref={final} />
            </div>

            <form
              onSubmit={event => { event.preventDefault(); void enviar(borrador) }}
              className="flex items-end gap-2 border-t border-border/60 p-3"
            >
              <textarea
                ref={entrada}
                value={borrador}
                onChange={event => setBorrador(event.target.value)}
                onKeyDown={event => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    void enviar(borrador)
                  }
                }}
                rows={1}
                maxLength={4000}
                placeholder={`Pregúntale a ${NOMBRE_ASISTENTE}…`}
                className="max-h-32 min-h-[40px] flex-1 resize-none rounded-2xl border border-border/60 bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
              {respondiendo ? (
                <button type="button" onClick={() => abortar.current?.abort()} className="h-10 w-10 shrink-0 rounded-full bg-muted flex items-center justify-center" title="Detener">
                  <Square className="h-4 w-4" />
                </button>
              ) : (
                <button type="submit" disabled={!borrador.trim()} className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center disabled:opacity-40" title="Enviar">
                  <Send className="h-4 w-4" />
                </button>
              )}
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setAbierto(actual => !actual)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        className="group fixed z-50 bottom-6 right-4 sm:right-6 flex items-center gap-2 rounded-full bg-gradient-to-br from-primary via-accent to-primary p-3.5 text-white shadow-xl shadow-primary/30 ring-4 ring-primary/10"
        aria-label={abierto ? `Cerrar ${NOMBRE_ASISTENTE}` : `Abrir ${NOMBRE_ASISTENTE}`}
      >
        {abierto ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
        {!abierto && <span className="hidden sm:group-hover:inline pr-1 text-sm font-semibold">Pregúntale a {NOMBRE_ASISTENTE}</span>}
      </motion.button>
    </>
  )
}
