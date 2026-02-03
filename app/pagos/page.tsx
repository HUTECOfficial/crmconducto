"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { PageHeader } from "@/components/page-header"
import { GlassCard } from "@/components/glass-card"
import { NeoButton } from "@/components/neo-button"
import { pagos } from "@/data/pagos"
import { polizas } from "@/data/polizas"
import { clientes } from "@/data/clientes"
import { companias } from "@/data/companias"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

export default function PagosPage() {
  const [vistaActual, setVistaActual] = useState<"mes" | "semana" | "lista">("mes")
  const [mesActual, setMesActual] = useState(new Date())

  // Agrupar pagos por fecha
  const pagosPorFecha = pagos.reduce(
    (acc, pago) => {
      const fecha = pago.fechaVencimiento
      if (!acc[fecha]) acc[fecha] = []
      acc[fecha].push(pago)
      return acc
    },
    {} as Record<string, typeof pagos>,
  )

  const getDiasDelMes = () => {
    const year = mesActual.getFullYear()
    const month = mesActual.getMonth()
    const primerDia = new Date(year, month, 1)
    const ultimoDia = new Date(year, month + 1, 0)
    const dias = []

    // Días del mes anterior para completar la primera semana
    const primerDiaSemana = primerDia.getDay()
    for (let i = primerDiaSemana - 1; i >= 0; i--) {
      const dia = new Date(year, month, -i)
      dias.push({ fecha: dia, esDelMes: false })
    }

    // Días del mes actual
    for (let i = 1; i <= ultimoDia.getDate(); i++) {
      dias.push({ fecha: new Date(year, month, i), esDelMes: true })
    }

    return dias
  }

  const cambiarMes = (direccion: number) => {
    setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + direccion, 1))
  }

  const getDiasRestantes = (fechaVencimiento: string) => {
    const hoy = new Date()
    const vencimiento = new Date(fechaVencimiento)
    const diff = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="main-content-aligned">
        <PageHeader
          title="Pagos"
          subtitle="Calendario de pagos y cobranza"
          action={
            <NeoButton className="gap-2">
              <Plus className="w-5 h-5" />
              Registrar Pago
            </NeoButton>
          }
        />

        {/* Controles de vista */}
        <GlassCard className="p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <NeoButton variant="ghost" size="sm" onClick={() => cambiarMes(-1)}>
                <ChevronLeft className="w-5 h-5" />
              </NeoButton>
              <h2 className="text-xl font-bold font-serif min-w-[200px] text-center">
                {mesActual.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
              </h2>
              <NeoButton variant="ghost" size="sm" onClick={() => cambiarMes(1)}>
                <ChevronRight className="w-5 h-5" />
              </NeoButton>
            </div>

            <div className="flex gap-2">
              <NeoButton
                variant={vistaActual === "mes" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setVistaActual("mes")}
              >
                Mes
              </NeoButton>
              <NeoButton
                variant={vistaActual === "lista" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setVistaActual("lista")}
              >
                Lista
              </NeoButton>
            </div>
          </div>
        </GlassCard>

        {vistaActual === "mes" ? (
          <GlassCard className="p-6">
            <div className="grid grid-cols-7 gap-2 mb-4">
              {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((dia) => (
                <div key={dia} className="text-center font-semibold text-sm text-muted-foreground p-2">
                  {dia}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {getDiasDelMes().map((dia, index) => {
                const fechaStr = dia.fecha.toISOString().split("T")[0]
                const pagosDia = pagosPorFecha[fechaStr] || []
                const esHoy = dia.fecha.toDateString() === new Date().toDateString()

                return (
                  <motion.div
                    key={index}
                    className={cn(
                      "min-h-[100px] p-2 rounded-xl border transition-colors",
                      dia.esDelMes ? "bg-card border-border/50" : "bg-muted/20 border-transparent",
                      esHoy && "ring-2 ring-primary",
                    )}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.01 }}
                  >
                    <div className="text-sm font-semibold mb-1">{dia.fecha.getDate()}</div>
                    <div className="space-y-1">
                      {pagosDia.slice(0, 2).map((pago) => {
                        const poliza = polizas.find((p) => p.id === pago.polizaId)
                        const compania = companias.find((c) => c.id === poliza?.companiaId)
                        const diasRestantes = getDiasRestantes(pago.fechaVencimiento)

                        return (
                          <div
                            key={pago.id}
                            className="text-xs p-1 rounded bg-muted/50 truncate"
                            style={{ borderLeft: `3px solid ${compania?.color}` }}
                          >
                            ${pago.monto.toLocaleString()}
                            {diasRestantes <= 7 && diasRestantes > 0 && (
                              <Badge variant="destructive" className="ml-1 text-[10px] px-1 py-0">
                                {diasRestantes}d
                              </Badge>
                            )}
                          </div>
                        )
                      })}
                      {pagosDia.length > 2 && (
                        <div className="text-xs text-muted-foreground">+{pagosDia.length - 2} más</div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-4 font-semibold">Cliente</th>
                    <th className="text-left p-4 font-semibold">Póliza</th>
                    <th className="text-left p-4 font-semibold">Aseguradora</th>
                    <th className="text-left p-4 font-semibold">Monto</th>
                    <th className="text-left p-4 font-semibold">Vencimiento</th>
                    <th className="text-left p-4 font-semibold">Estatus</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map((pago, index) => {
                    const poliza = polizas.find((p) => p.id === pago.polizaId)
                    const cliente = clientes.find((c) => c.id === poliza?.clienteId)
                    const compania = companias.find((c) => c.id === poliza?.companiaId)
                    const diasRestantes = getDiasRestantes(pago.fechaVencimiento)

                    return (
                      <motion.tr
                        key={pago.id}
                        className="border-b border-border/30 hover:bg-muted/50 transition-colors"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <td className="p-4">
                          <p className="font-medium">{cliente?.nombre}</p>
                        </td>
                        <td className="p-4">
                          <p className="font-mono text-sm">{poliza?.numeroPoliza}</p>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" style={{ borderColor: compania?.color, color: compania?.color }}>
                            {compania?.nombre}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <p className="font-semibold">${pago.monto.toLocaleString()}</p>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <p>{new Date(pago.fechaVencimiento).toLocaleDateString()}</p>
                            {diasRestantes <= 15 && diasRestantes > 0 && (
                              <Badge
                                variant={
                                  diasRestantes <= 3 ? "destructive" : diasRestantes <= 7 ? "default" : "secondary"
                                }
                              >
                                {diasRestantes}d
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge
                            variant={
                              pago.estatus === "pagado"
                                ? "default"
                                : pago.estatus === "vencido"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {pago.estatus}
                          </Badge>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}
      </main>
    </div>
  )
}
