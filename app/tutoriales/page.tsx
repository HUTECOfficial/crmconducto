"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Sidebar } from "@/components/sidebar"
import { PageHeader } from "@/components/page-header"
import { GlassCard } from "@/components/glass-card"
import { ProtectedRoute } from "@/components/protected-route"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle2, PlayCircle } from "lucide-react"
import { TUTORIALES, urlTutorial, type Tutorial } from "@/lib/tutoriales"

const CLAVE_VISTOS = "crm-tutoriales-vistos"

/** Tutoriales vistos en este navegador (sólo una comodidad visual; puede no estar disponible). */
function leerVistos(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(CLAVE_VISTOS) || "[]"))
  } catch {
    return new Set()
  }
}

export default function TutorialesPage() {
  const [actual, setActual] = useState<Tutorial>(TUTORIALES[0])
  const [vistos, setVistos] = useState<Set<string>>(new Set())

  // Enlace directo: /tutoriales?video=04 abre ese tutorial.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("video")
    const elegido = TUTORIALES.find(tutorial => tutorial.id === id)
    if (elegido) setActual(elegido)
    setVistos(leerVistos())
  }, [])

  const elegir = (tutorial: Tutorial) => {
    setActual(tutorial)
    window.history.replaceState(null, "", `?video=${tutorial.id}`)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const marcarVisto = (id: string) => setVistos(previos => {
    const siguientes = new Set(previos).add(id)
    try {
      localStorage.setItem(CLAVE_VISTOS, JSON.stringify([...siguientes]))
    } catch {
      // Sin almacenamiento local sólo se pierde la marca de "visto".
    }
    return siguientes
  })

  const url = urlTutorial(actual)
  const indice = TUTORIALES.findIndex(tutorial => tutorial.id === actual.id)
  const siguiente = TUTORIALES[indice + 1]

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="main-content-aligned">
          <PageHeader
            title="Tutoriales"
            subtitle={`${TUTORIALES.length} videos para aprender a usar el CRM · ${vistos.size} vistos`}
            showSearch={false}
          />

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_22rem] gap-6 items-start">
            <GlassCard className="p-4 space-y-4">
              {url ? (
                <video
                  // key: cambia de video sin reutilizar el anterior a medio cargar.
                  key={actual.id}
                  src={url}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full aspect-video rounded-xl bg-black"
                  onEnded={() => {
                    marcarVisto(actual.id)
                    if (siguiente) elegir(siguiente)
                  }}
                />
              ) : (
                <div className="w-full aspect-video rounded-xl bg-muted flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
                  Los videos aún no están conectados: falta configurar NEXT_PUBLIC_TUTORIALES_URL.
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Tutorial {actual.id} de {TUTORIALES.length}</p>
                  <h2 className="text-xl font-semibold">{actual.titulo}</h2>
                  <p className="text-sm text-muted-foreground">{actual.descripcion}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {actual.ruta && (
                    <Button asChild variant="outline" size="sm" className="gap-1">
                      <Link href={actual.ruta}>Ir a la pantalla<ArrowRight className="h-3 w-3" /></Link>
                    </Button>
                  )}
                  {siguiente && (
                    <Button size="sm" onClick={() => elegir(siguiente)}>Siguiente</Button>
                  )}
                </div>
              </div>
            </GlassCard>

            <div className="space-y-2">
              {TUTORIALES.map(tutorial => {
                const activo = tutorial.id === actual.id
                const visto = vistos.has(tutorial.id)
                return (
                  <button key={tutorial.id} type="button" onClick={() => elegir(tutorial)} className="w-full text-left">
                    <GlassCard className={`p-3 flex gap-3 items-start transition-colors ${activo ? "ring-2 ring-primary" : "hover:bg-muted/30"}`}>
                      {visto
                        ? <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 mt-0.5" />
                        : <PlayCircle className={`h-5 w-5 shrink-0 mt-0.5 ${activo ? "text-primary" : "text-muted-foreground"}`} />}
                      <div className="min-w-0">
                        <p className="font-medium leading-tight">{tutorial.id}. {tutorial.titulo}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{tutorial.descripcion}</p>
                      </div>
                      {activo && <Badge variant="outline" className="ml-auto shrink-0 text-[10px]">Viendo</Badge>}
                    </GlassCard>
                  </button>
                )
              })}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
