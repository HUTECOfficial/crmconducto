"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { PageHeader } from "@/components/page-header"
import { GlassCard } from "@/components/glass-card"
import { etapas } from "@/data/etapas"
import { companias } from "@/data/companias"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { motion } from "framer-motion"
import { Palette, Layers, Users } from "lucide-react"

export default function AjustesPage() {
  const [blurIntensity, setBlurIntensity] = useState([24])
  const [shadowDepth, setShadowDepth] = useState([8])
  const [borderRadius, setBorderRadius] = useState([24])

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 p-8">
        <PageHeader title="Ajustes" subtitle="Personaliza tu experiencia en el CRM" />

        <div className="space-y-6">
          {/* Etapas del embudo */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-primary/10">
                <Layers className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold font-serif text-xl">Etapas del Embudo</h3>
                <p className="text-sm text-muted-foreground">Configura las etapas de tu proceso de ventas</p>
              </div>
            </div>

            <div className="space-y-4">
              {etapas.map((etapa, index) => (
                <motion.div
                  key={etapa.id}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-muted/50"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-background">
                      <span className="font-bold text-sm">{etapa.orden}</span>
                    </div>
                    <Input value={etapa.nombre} className="glass max-w-xs" readOnly />
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full" style={{ backgroundColor: etapa.color }} />
                      <Input type="color" value={etapa.color} className="w-20 h-10" readOnly />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassCard>

          {/* Colores por aseguradora */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-primary/10">
                <Palette className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold font-serif text-xl">Colores por Aseguradora</h3>
                <p className="text-sm text-muted-foreground">Personaliza los colores de identificación</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {companias.map((compania, index) => (
                <motion.div
                  key={compania.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-muted/50"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full" style={{ backgroundColor: compania.color }} />
                    <span className="font-semibold">{compania.nombre}</span>
                  </div>
                  <Input type="color" value={compania.color} className="w-20 h-10" readOnly />
                </motion.div>
              ))}
            </div>
          </GlassCard>

          {/* Roles (UI únicamente) */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold font-serif text-xl">Roles y Permisos</h3>
                <p className="text-sm text-muted-foreground">Gestión visual de roles (solo UI)</p>
              </div>
            </div>

            <div className="space-y-3">
              {["Administrador", "Agente", "Supervisor"].map((rol, index) => (
                <motion.div
                  key={rol}
                  className="flex items-center justify-between p-4 rounded-2xl bg-muted/50"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={index === 0 ? "default" : "secondary"}>{rol}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {index === 0 ? "Acceso completo" : index === 1 ? "Gestión de clientes" : "Supervisión de equipo"}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassCard>

          {/* Tema visual */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-primary/10">
                <Palette className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold font-serif text-xl">Personalización de Tema</h3>
                <p className="text-sm text-muted-foreground">Ajusta la intensidad de los efectos visuales</p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Intensidad de Blur</Label>
                  <span className="text-sm text-muted-foreground">{blurIntensity[0]}px</span>
                </div>
                <Slider
                  value={blurIntensity}
                  onValueChange={setBlurIntensity}
                  min={8}
                  max={40}
                  step={4}
                  className="w-full"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Profundidad de Sombra</Label>
                  <span className="text-sm text-muted-foreground">{shadowDepth[0]}px</span>
                </div>
                <Slider
                  value={shadowDepth}
                  onValueChange={setShadowDepth}
                  min={4}
                  max={16}
                  step={2}
                  className="w-full"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Radio de Borde</Label>
                  <span className="text-sm text-muted-foreground">{borderRadius[0]}px</span>
                </div>
                <Slider
                  value={borderRadius}
                  onValueChange={setBorderRadius}
                  min={8}
                  max={32}
                  step={4}
                  className="w-full"
                />
              </div>

              {/* Vista previa */}
              <div className="mt-6">
                <p className="text-sm font-medium mb-3">Vista Previa</p>
                <div
                  className="p-6 rounded-2xl"
                  style={{
                    backdropFilter: `blur(${blurIntensity[0]}px)`,
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    boxShadow: `0 ${shadowDepth[0]}px ${shadowDepth[0] * 2}px rgba(0, 0, 0, 0.1)`,
                    borderRadius: `${borderRadius[0]}px`,
                  }}
                >
                  <p className="font-semibold mb-2">Tarjeta de ejemplo</p>
                  <p className="text-sm text-muted-foreground">Así se verán las tarjetas con la configuración actual</p>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  )
}
