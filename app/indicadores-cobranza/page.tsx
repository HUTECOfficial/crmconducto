"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { PageHeader } from "@/components/page-header"
import { GlassCard } from "@/components/glass-card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { motion } from "framer-motion"
import {
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Target,
  RefreshCw,
} from "lucide-react"
import { ProtectedRoute } from "@/components/protected-route"
import { useSupabase } from "@/contexts/supabase-context"
import { calcularKPIsCobranza } from "@/lib/kpi-calculator"

export default function IndicadoresCobranzaPage() {
  const { polizas } = useSupabase()
  // Generate basic payment data from polizas for KPI calculation
  const pagosFromPolizas = polizas.map(p => ({
    id: p.id,
    polizaId: p.id,
    monto: p.primaEmitida - p.primaCobrada,
    fechaVencimiento: p.ultimoDiaPago || p.vigenciaFin,
    estatus: p.primaCobrada >= p.primaEmitida ? 'pagado' as const : p.estatus === 'gracia' ? 'vencido' as const : 'pendiente' as const,
    metodoPago: undefined,
    diasMora: 0,
    intentosCobranza: 0,
  }))
  const kpis = calcularKPIsCobranza(polizas as any, pagosFromPolizas as any)

  const getColorTendencia = (valor: number, objetivo: number) => {
    if (valor >= objetivo) return "text-green-600"
    if (valor >= objetivo * 0.9) return "text-yellow-600"
    return "text-red-600"
  }

  const getColorBadge = (valor: number, objetivo: number) => {
    if (valor >= objetivo) return "default"
    if (valor >= objetivo * 0.9) return "secondary"
    return "destructive"
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="main-content-aligned">
          <PageHeader
            title="Indicadores de Cobranza"
            subtitle="KPIs financieros de flujo y gestión de cobranza"
          />

          <Tabs defaultValue="financiero" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="financiero">Financiero</TabsTrigger>
              <TabsTrigger value="aging">Aging</TabsTrigger>
              <TabsTrigger value="canales">Canales</TabsTrigger>
              <TabsTrigger value="gestion">Gestión</TabsTrigger>
            </TabsList>

            {/* TAB 1: INDICADORES FINANCIEROS */}
            <TabsContent value="financiero" className="space-y-6">
              {/* KPI Principal: Efectividad de Cobranza */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0 }}
              >
                <GlassCard className="p-8 border-2 border-primary/20">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Índice de Efectividad de Cobranza
                      </p>
                      <div className="flex items-baseline gap-3">
                        <p className="text-5xl font-bold font-serif">{kpis.efectividadCobranza}%</p>
                        <Badge
                          variant={getColorBadge(kpis.efectividadCobranza, 90)}
                          className="text-lg px-3 py-1"
                        >
                          {kpis.efectividadCobranza >= 90
                            ? "Excelente"
                            : kpis.efectividadCobranza >= 80
                              ? "Bueno"
                              : "Requiere Atención"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-4">
                        Fórmula: (Primas Cobradas / Primas Emitidas) × 100
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-primary/10">
                      <TrendingUp className="w-12 h-12 text-primary" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border/50">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Primas Emitidas</p>
                      <p className="text-2xl font-bold">${kpis.primaTotalEmitida.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Primas Cobradas</p>
                      <p className="text-2xl font-bold text-green-600">
                        ${kpis.primaTotalCobrada.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Prima Pendiente</p>
                      <p className="text-2xl font-bold text-orange-600">
                        ${kpis.primaPendiente.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>

              {/* KPIs Secundarios */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Rehabilitaciones */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <GlassCard className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                          Tasa de Rehabilitación
                        </p>
                        <p className={`text-3xl font-bold ${getColorTendencia(kpis.tasaRehabilitacion, 30)}`}>
                          {kpis.tasaRehabilitacion}%
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-green-500/10">
                        <RefreshCw className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pólizas Rehabilitadas:</span>
                        <span className="font-medium text-green-600">{kpis.polizasRehabilitadas}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        Pólizas canceladas que lograron recuperarse tras gestión exitosa
                      </p>
                    </div>
                  </GlassCard>
                </motion.div>
              </div>
            </TabsContent>

            {/* TAB 2: ANTIGÜEDAD DE SALDOS (AGING) */}
            <TabsContent value="aging" className="space-y-6">
              <GlassCard className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Antigüedad de Saldos (Aging)</h3>
                    <p className="text-sm text-muted-foreground">
                      Clasificación de pagos pendientes por período
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {/* Corriente */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0 }}
                    className="p-4 rounded-xl bg-green-500/10 border border-green-500/20"
                  >
                    <p className="text-xs font-medium text-green-700 mb-2">CORRIENTE</p>
                    <p className="text-2xl font-bold text-green-600">${kpis.agingCorriente.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-2">Al día</p>
                  </motion.div>

                  {/* 1-30 */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20"
                  >
                    <p className="text-xs font-medium text-yellow-700 mb-2">1-30 DÍAS</p>
                    <p className="text-2xl font-bold text-yellow-600">${kpis.aging1a30.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-2">Período crítico</p>
                  </motion.div>

                  {/* 31-60 */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20"
                  >
                    <p className="text-xs font-medium text-orange-700 mb-2">31-60 DÍAS</p>
                    <p className="text-2xl font-bold text-orange-600">${kpis.aging31a60.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-2">Riesgo moderado</p>
                  </motion.div>

                  {/* 61-90 */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="p-4 rounded-xl bg-red-500/10 border border-red-500/20"
                  >
                    <p className="text-xs font-medium text-red-700 mb-2">61-90 DÍAS</p>
                    <p className="text-2xl font-bold text-red-600">${kpis.aging61a90.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-2">Riesgo alto</p>
                  </motion.div>

                  {/* +90 */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="p-4 rounded-xl bg-red-700/10 border border-red-700/20"
                  >
                    <p className="text-xs font-medium text-red-800 mb-2">+90 DÍAS</p>
                    <p className="text-2xl font-bold text-red-700">${kpis.agingMas90.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-2">Incobrables</p>
                  </motion.div>
                </div>

                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">📌 Nota Importante:</p>
                  <p className="text-sm text-muted-foreground">
                    En seguros, el período de 30 días es crítico porque coincide con el "período de gracia". Pasado ese
                    tiempo, la póliza se cancela automáticamente si no hay pago.
                  </p>
                </div>
              </GlassCard>
            </TabsContent>

            {/* TAB 3: MIX DE CANALES DE COBRO */}
            <TabsContent value="canales" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tasa de Rechazo */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0 }}
                >
                  <GlassCard className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Tasa de Rechazo Bancario</p>
                        <p className={`text-3xl font-bold ${getColorTendencia(100 - kpis.tasaRechazo, 95)}`}>
                          {kpis.tasaRechazo}%
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-red-500/10">
                        <AlertCircle className="w-6 h-6 text-red-600" />
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rechazos Totales:</span>
                        <span className="font-medium">{kpis.rechazosTotal}</span>
                      </div>
                      <div className="mt-4 space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Causas:</p>
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between">
                            <span>Fondos insuficientes:</span>
                            <span className="font-medium">{kpis.motivosRechazo.fondosInsuficientes}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tarjeta vencida:</span>
                            <span className="font-medium">{kpis.motivosRechazo.tarjetaVencida}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Bloqueo seguridad:</span>
                            <span className="font-medium">{kpis.motivosRechazo.bloqueoSeguridad}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Otros:</span>
                            <span className="font-medium">{kpis.motivosRechazo.otro}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>

                {/* Mix de Canales */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <GlassCard className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Mix de Canales de Cobro</p>
                        <p className="text-sm text-muted-foreground">Distribución de pagos procesados</p>
                      </div>
                      <div className="p-3 rounded-xl bg-blue-500/10">
                        <PieChart className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      {[
                        { label: "Domiciliación", valor: kpis.canalDomiciliacion, color: "bg-blue-500" },
                        { label: "Transferencia", valor: kpis.canalTransferencia, color: "bg-green-500" },
                        { label: "Tarjeta", valor: kpis.canalTarjeta, color: "bg-purple-500" },
                        { label: "Efectivo", valor: kpis.canalEfectivo, color: "bg-yellow-500" },
                        { label: "Cheque", valor: kpis.canalCheque, color: "bg-orange-500" },
                      ].map((canal) => (
                        <div key={canal.label}>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">{canal.label}</span>
                            <span className="text-sm font-medium">{canal.valor}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className={`${canal.color} h-2 rounded-full transition-all`}
                              style={{ width: `${canal.valor}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-muted-foreground mt-4">
                      💡 Objetivo: Maximizar domiciliación para asegurar recurrencia
                    </p>
                  </GlassCard>
                </motion.div>
              </div>
            </TabsContent>

            {/* TAB 4: GESTIÓN Y COSTOS */}
            <TabsContent value="gestion" className="space-y-6">
              <GlassCard className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Costo por Gestión de Cobranza</p>
                    <p className="text-4xl font-bold">${kpis.costoPromedioPorPeso}</p>
                    <p className="text-sm text-muted-foreground mt-2">Costo de recuperación por peso cobrado</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-primary/10">
                    <DollarSign className="w-12 h-12 text-primary" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border/50">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Intentos Promedio por Pago</p>
                    <p className="text-2xl font-bold">{kpis.intentosCobranzaPromedio}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Costo por Intento</p>
                    <p className="text-2xl font-bold">$50</p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">📊 Análisis:</p>
                  <p className="text-sm text-muted-foreground">
                    El costo de gestión se calcula multiplicando el número de intentos de cobranza por un costo unitario
                    de $50 por intento, dividido entre el total de primas cobradas.
                  </p>
                </div>
              </GlassCard>

              {/* Resumen de Gestión */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0 }}
                >
                  <GlassCard className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-xl bg-blue-500/10">
                        <Activity className="w-5 h-5 text-blue-600" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">Pólizas Activas</p>
                    </div>
                    <p className="text-3xl font-bold">{kpis.polizasActivas}</p>
                  </GlassCard>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <GlassCard className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-xl bg-orange-500/10">
                        <AlertCircle className="w-5 h-5 text-orange-600" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">En Período de Gracia</p>
                    </div>
                    <p className="text-3xl font-bold text-orange-600">{kpis.polizasEnGracia}</p>
                  </GlassCard>
                </motion.div>

              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </ProtectedRoute>
  )
}
