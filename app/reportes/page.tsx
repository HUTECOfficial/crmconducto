"use client"

import { Sidebar } from "@/components/sidebar"
import { PageHeader } from "@/components/page-header"
import { GlassCard } from "@/components/glass-card"
import { NeoButton } from "@/components/neo-button"
import { polizas } from "@/data/polizas"
import { companias } from "@/data/companias"
import { Download } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

export default function ReportesPage() {
  // Producción por aseguradora
  const produccionPorCompania = companias.map((compania) => {
    const polizasCompania = polizas.filter((p) => p.companiaId === compania.id && p.estatus === "activa")
    const total = polizasCompania.reduce((sum, p) => sum + p.prima, 0)
    return {
      nombre: compania.nombre,
      total,
      color: compania.color,
    }
  })

  // Distribución por ramo
  const ramos = ["autos", "vida", "gastos-medicos", "empresa", "hogar"]
  const distribucionRamos = ramos.map((ramo) => {
    const polizasRamo = polizas.filter((p) => p.ramo === ramo && p.estatus === "activa")
    return {
      nombre: ramo.replace("-", " "),
      cantidad: polizasRamo.length,
      total: polizasRamo.reduce((sum, p) => sum + p.prima, 0),
    }
  })

  // Renovaciones
  const renovaciones = {
    porRenovar: polizas.filter((p) => p.estatus === "por-renovar").length,
    activas: polizas.filter((p) => p.estatus === "activa").length,
    vencidas: polizas.filter((p) => p.estatus === "vencida").length,
  }

  const renovacionesData = [
    { nombre: "Por Renovar", valor: renovaciones.porRenovar, color: "#fbbf24" },
    { nombre: "Activas", valor: renovaciones.activas, color: "#34d399" },
    { nombre: "Vencidas", valor: renovaciones.vencidas, color: "#ef4444" },
  ]

  const exportarDatos = (tipo: "json" | "csv") => {
    console.log(`[v0] Exportando datos como ${tipo}`)
    const datos = { produccionPorCompania, distribucionRamos, renovaciones }

    if (tipo === "json") {
      const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `reporte-${new Date().toISOString().split("T")[0]}.json`
      a.click()
    } else {
      // CSV simplificado
      let csv = "Aseguradora,Total\n"
      produccionPorCompania.forEach((c) => {
        csv += `${c.nombre},${c.total}\n`
      })
      const blob = new Blob([csv], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `reporte-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 p-8">
        <PageHeader
          title="Reportes"
          subtitle="Análisis y estadísticas de tu cartera"
          action={
            <div className="flex gap-2">
              <NeoButton onClick={() => exportarDatos("json")} variant="secondary" className="gap-2">
                <Download className="w-5 h-5" />
                JSON
              </NeoButton>
              <NeoButton onClick={() => exportarDatos("csv")} variant="secondary" className="gap-2">
                <Download className="w-5 h-5" />
                CSV
              </NeoButton>
            </div>
          }
        />

        <div className="space-y-6">
          {/* Producción por aseguradora */}
          <GlassCard className="p-6">
            <h3 className="font-bold font-serif text-xl mb-6">Producción por Aseguradora</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={produccionPorCompania}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="nombre" stroke="currentColor" />
                <YAxis stroke="currentColor" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(0,0,0,0.8)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                  }}
                  formatter={(value: number) => `$${value.toLocaleString()}`}
                />
                <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                  {produccionPorCompania.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribución por ramo */}
            <GlassCard className="p-6">
              <h3 className="font-bold font-serif text-xl mb-6">Top Ramos por Cantidad</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={distribucionRamos} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis type="number" stroke="currentColor" />
                  <YAxis dataKey="nombre" type="category" stroke="currentColor" width={120} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0,0,0,0.8)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                    }}
                  />
                  <Bar dataKey="cantidad" fill="#60a5fa" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>

            {/* Estado de renovaciones */}
            <GlassCard className="p-6">
              <h3 className="font-bold font-serif text-xl mb-6">Estado de Renovaciones</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={renovacionesData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ nombre, valor }) => `${nombre}: ${valor}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="valor"
                  >
                    {renovacionesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0,0,0,0.8)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </GlassCard>
          </div>

          {/* Resumen numérico */}
          <GlassCard className="p-6">
            <h3 className="font-bold font-serif text-xl mb-6">Resumen General</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-4xl font-bold font-serif text-primary mb-2">{polizas.length}</p>
                <p className="text-muted-foreground">Total Pólizas</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold font-serif text-green-500 mb-2">{renovaciones.activas}</p>
                <p className="text-muted-foreground">Activas</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold font-serif text-yellow-500 mb-2">{renovaciones.porRenovar}</p>
                <p className="text-muted-foreground">Por Renovar</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold font-serif text-primary mb-2">
                  ${polizas.reduce((sum, p) => sum + p.prima, 0).toLocaleString()}
                </p>
                <p className="text-muted-foreground">Prima Total</p>
              </div>
            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  )
}
