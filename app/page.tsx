"use client"

import { Sidebar } from "@/components/sidebar"
import { PageHeader } from "@/components/page-header"
import { MetricTile } from "@/components/metric-tile"
import { GlassCard } from "@/components/glass-card"
import { ProximosEventos } from "@/components/proximos-eventos"
import { Button } from "@/components/ui/button"
import { FileText, DollarSign, RefreshCw, Calendar, Eye, ArrowRight, AlertCircle } from "lucide-react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/contexts/supabase-context"

export default function DashboardPage() {
  const { usuario } = useAuth()
  const router = useRouter()
  const { polizas, clientes, companias } = useSupabase()

  const hoy = new Date()

  // Pólizas por cobrar: activas, en gracia, por-renovar y vencidas
  const polizasPorCobrar = polizas.filter(p =>
    p.estatus === "activa" || p.estatus === "gracia" || p.estatus === "por-renovar" || p.estatus === "vencida"
  ).length

  // Próximas renovaciones (próximos 60 días)
  const renovacionesProximas = polizas.filter(p => {
    const vigenciaFin = new Date(p.vigenciaFin)
    const dias = Math.ceil((vigenciaFin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
    return dias > 0 && dias <= 60
  }).length

  // Registro de pólizas activas
  const registroPolizas = polizas.filter(p => p.estatus === "activa").length

  // Total pólizas
  const totalPolizas = polizas.length
  const registroMovimientos = totalPolizas

  // Renovaciones ordenadas por urgencia
  const renovacionesCercanas = polizas
    .filter(p => p.estatus === "por-renovar" || p.estatus === "gracia" || p.estatus === "vencida")
    .sort((a, b) => {
      const diasA = Math.ceil((new Date(a.vigenciaFin).getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
      const diasB = Math.ceil((new Date(b.vigenciaFin).getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
      if (diasA !== diasB) return diasA - diasB
      return b.prima - a.prima
    })
    .slice(0, 5)

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="main-content-aligned">
          <PageHeader title="Dashboard" subtitle="Resumen general de tu cartera de seguros" />

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div onClick={() => router.push('/polizas-pendientes?filtro=vencidas')} className="cursor-pointer">
              <MetricTile 
                title="Pólizas por Cobrar" 
                value={polizasPorCobrar} 
                icon={AlertCircle} 
                trend="neutral" 
              />
            </div>
            <div onClick={() => router.push('/polizas?filtro=renovaciones')} className="cursor-pointer">
              <MetricTile
                title="Próximas Renovaciones"
                value={renovacionesProximas}
                change="60 días"
                icon={RefreshCw}
                trend="neutral"
              />
            </div>
            <div onClick={() => router.push('/polizas')} className="cursor-pointer">
              <MetricTile 
                title="Registro Póliza" 
                value={registroPolizas} 
                icon={FileText} 
                trend="neutral" 
              />
            </div>
            <div onClick={() => router.push('/pagos')} className="cursor-pointer">
              <MetricTile
                title="Registro de Movimiento"
                value={registroMovimientos}
                icon={DollarSign}
                trend="neutral"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Renovaciones próximas */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold font-serif">Renovaciones Pendientes</h2>
                    <p className="text-sm text-muted-foreground">Pólizas por renovar ordenadas por importancia</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => router.push('/polizas?filtro=renovaciones')}
                  className="gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Ver Todas
                </Button>
              </div>

              <div className="space-y-3">
                {renovacionesCercanas.map((poliza, index) => {
                  const cliente = clientes.find((c) => c.id === poliza.clienteId)
                  const compania = companias.find((c) => c.id === poliza.companiaId)
                  const fechaVencimiento = new Date(poliza.vigenciaFin)
                  const diasDiferencia = Math.ceil(
                    (fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24),
                  )
                  const yaVencida = diasDiferencia < 0

                  return (
                    <motion.div
                      key={poliza.id}
                      className="p-4 rounded-2xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => router.push('/polizas?filtro=renovaciones')}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-semibold">{cliente?.nombre}</p>
                          <p className="text-sm text-muted-foreground">{poliza.numeroPoliza}</p>
                        </div>
                        <Badge
                          variant={yaVencida ? "destructive" : diasDiferencia <= 7 ? "default" : "secondary"}
                        >
                          {yaVencida ? `Vencida ${Math.abs(diasDiferencia)}d` : `${diasDiferencia}d restantes`}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" style={{ borderColor: compania?.color, color: compania?.color }}>
                          {compania?.nombre}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">${poliza.prima.toLocaleString()}</span>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </GlassCard>

            {/* Próximos Eventos */}
            <ProximosEventos />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `Hace ${diffMins} minutos`
  if (diffHours < 24) return `Hace ${diffHours} horas`
  return `Hace ${diffDays} días`
}
