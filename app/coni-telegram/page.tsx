"use client"

import { useCallback, useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { PageHeader } from "@/components/page-header"
import { GlassCard } from "@/components/glass-card"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle2, ExternalLink, Loader2, MessageCircle, Send, Smartphone } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"
import { NOMBRE_ASISTENTE } from "@/lib/asistente/personalidad"

interface Vinculo {
  telegram_chat_id: number
  telegram_usuario: string | null
  telegram_nombre: string | null
  vinculado_en: string
}

const EJEMPLOS = [
  ["Consultar", "¿Qué recibos vencen esta semana?"],
  ["Comentar", "Anota en la 2964 que el cliente paga el viernes"],
  ["Recordatorio", "Recuérdame llamar a Lozano mañana a las 10"],
  ["Pago", "📷 Foto del comprobante + \"pago de la 96695U04 por transferencia\""],
]

export default function ConiTelegramPage() {
  const { usuario } = useAuth()
  const [vinculos, setVinculos] = useState<Vinculo[]>([])
  const [bot, setBot] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [password, setPassword] = useState("")
  const [generando, setGenerando] = useState(false)
  const [enlace, setEnlace] = useState<{ enlace: string; codigo: string; bot: string } | null>(null)

  const cargar = useCallback(async () => {
    if (!usuario) return
    const respuesta = await fetch("/api/telegram/vincular/", { headers: { "x-crm-usuario": usuario.email } })
    const datos = await respuesta.json().catch(() => ({}))
    setVinculos(datos.vinculos || [])
    setBot(datos.bot || null)
    setCargando(false)
  }, [usuario])

  useEffect(() => { void cargar() }, [cargar])

  const generar = async () => {
    if (!usuario || !password) return
    setGenerando(true)
    try {
      const respuesta = await fetch("/api/telegram/vincular/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: usuario.email, password }),
      })
      const datos = await respuesta.json().catch(() => ({}))
      if (!respuesta.ok) throw new Error(datos.error || "No se pudo generar el enlace")
      setEnlace(datos)
      setPassword("")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setGenerando(false)
    }
  }

  const desvincular = async (chatId: number) => {
    if (!usuario) return
    await fetch(`/api/telegram/vincular/?chat=${chatId}`, { method: "DELETE", headers: { "x-crm-usuario": usuario.email } })
    toast.success("Telegram desvinculado")
    void cargar()
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="main-content-aligned">
          <PageHeader title={`${NOMBRE_ASISTENTE} en Telegram`} subtitle="Lleva a tu asistente en el celular: consulta la cartera y pide tareas por chat" showSearch={false} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <GlassCard className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center shadow-lg">
                  <Smartphone className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Conecta tu Telegram</h2>
                  <p className="text-sm text-muted-foreground">{bot ? `Bot oficial: @${bot}` : "Un minuto y listo"}</p>
                </div>
              </div>

              {cargando ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Revisando…</p>
              ) : vinculos.length > 0 && (
                <div className="space-y-2">
                  {vinculos.map(vinculo => (
                    <div key={vinculo.telegram_chat_id} className="flex items-center justify-between gap-3 rounded-xl bg-green-500/10 px-3 py-2 text-sm">
                      <span className="flex items-center gap-2 text-green-700 dark:text-green-300">
                        <CheckCircle2 className="h-4 w-4" />
                        Conectado{vinculo.telegram_usuario ? ` como @${vinculo.telegram_usuario}` : vinculo.telegram_nombre ? ` (${vinculo.telegram_nombre})` : ""}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => void desvincular(vinculo.telegram_chat_id)}>Desconectar</Button>
                    </div>
                  ))}
                </div>
              )}

              {enlace ? (
                <div className="space-y-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
                  <p className="text-sm font-medium">Abre este enlace en tu celular y toca <b>Iniciar</b>:</p>
                  <Button asChild className="w-full gap-2">
                    <a href={enlace.enlace} target="_blank" rel="noreferrer"><Send className="h-4 w-4" />Abrir @{enlace.bot} en Telegram<ExternalLink className="h-3 w-3" /></a>
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    ¿Estás en la computadora? Busca <b>@{enlace.bot}</b> en Telegram y mándale: <code className="rounded bg-muted px-1">/start {enlace.codigo}</code>. El código vence en 15 minutos y sólo sirve una vez.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => { setEnlace(null); void cargar() }}>Ya lo conecté</Button>
                </div>
              ) : (
                <form className="space-y-3" onSubmit={event => { event.preventDefault(); void generar() }}>
                  <div className="space-y-1">
                    <Label htmlFor="password-telegram">Confirma tu contraseña del CRM</Label>
                    <Input id="password-telegram" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} />
                    <p className="text-xs text-muted-foreground">Así nadie más puede conectar su Telegram a tu cuenta.</p>
                  </div>
                  <Button type="submit" disabled={!password || generando} className="w-full gap-2">
                    {generando ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                    {vinculos.length ? "Conectar otro Telegram" : "Generar enlace para Telegram"}
                  </Button>
                </form>
              )}
            </GlassCard>

            <GlassCard className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">Qué puedes pedirle</h2>
              <div className="space-y-3">
                {EJEMPLOS.map(([titulo, ejemplo]) => (
                  <div key={titulo} className="rounded-xl bg-muted/40 px-3 py-2">
                    <p className="text-xs font-semibold text-primary">{titulo}</p>
                    <p className="text-sm">{ejemplo}</p>
                  </div>
                ))}
              </div>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Antes de guardar algo, {NOMBRE_ASISTENTE} te muestra el resumen con botones <b>✅ Confirmar</b> / <b>❌ Cancelar</b>.</li>
                <li>• Los pagos quedan <b>por validar</b>; alguien del equipo los valida en Pólizas pendientes, igual que hoy.</li>
                <li>• De lunes a sábado a las 8:00 te manda el resumen del día. Escribe <code>/resumen</code> para pedirlo cuando quieras.</li>
                <li>• Todo lo que hagas por Telegram queda en la Bitácora con tu nombre.</li>
              </ul>
            </GlassCard>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
