"use client"

import { useState } from "react"
import { useSupabase, type FlotillaUnidad } from "@/contexts/supabase-context"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit2, Eye, XCircle } from "lucide-react"
import { toast } from "sonner"

const emptyForm = {
  numeroInciso: "",
  descripcion: "",
  marca: "",
  modelo: "",
  placas: "",
  numeroSerie: "",
  primaTotal: "",
}

export function FlotillaUnidades({ polizaId }: { polizaId: string }) {
  const { flotillaUnidades, agregarUnidadFlotilla, actualizarUnidadFlotilla, desactivarUnidadFlotilla } = useSupabase()
  const [form, setForm] = useState(emptyForm)
  const [editando, setEditando] = useState<FlotillaUnidad | null>(null)
  const [detalle, setDetalle] = useState<FlotillaUnidad | null>(null)
  const [modalForm, setModalForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const unidades = flotillaUnidades.filter(unidad => unidad.polizaId === polizaId)

  const abrirAlta = () => {
    setEditando(null)
    setForm(emptyForm)
    setModalForm(true)
  }

  const abrirEdicion = (unidad: FlotillaUnidad) => {
    setEditando(unidad)
    setForm({
      numeroInciso: unidad.numeroInciso,
      descripcion: unidad.descripcion || "",
      marca: unidad.marca || "",
      modelo: unidad.modelo || "",
      placas: unidad.placas || "",
      numeroSerie: unidad.numeroSerie || "",
      primaTotal: unidad.primaTotal?.toString() || "",
    })
    setDetalle(null)
    setModalForm(true)
  }

  const guardar = async () => {
    if (!form.numeroInciso.trim()) {
      toast.error("El número de inciso es obligatorio")
      return
    }
    const primaTotal = form.primaTotal ? Number(form.primaTotal) : undefined
    if (primaTotal !== undefined && (!Number.isFinite(primaTotal) || primaTotal < 0)) {
      toast.error("La prima total de la unidad no es válida")
      return
    }

    setGuardando(true)
    try {
      const datos = {
        numeroInciso: form.numeroInciso.trim(),
        descripcion: form.descripcion || undefined,
        marca: form.marca || undefined,
        modelo: form.modelo || undefined,
        placas: form.placas || undefined,
        numeroSerie: form.numeroSerie || undefined,
        primaTotal,
        activa: editando?.activa ?? true,
      }
      if (editando) await actualizarUnidadFlotilla(editando.id, datos)
      else await agregarUnidadFlotilla(polizaId, datos)
      setModalForm(false)
      setForm(emptyForm)
      setEditando(null)
      toast.success(editando ? "Unidad actualizada" : "Unidad agregada")
    } catch (error: any) {
      toast.error(error.message || "No fue posible guardar la unidad")
    } finally {
      setGuardando(false)
    }
  }

  const desactivar = async (unidad: FlotillaUnidad) => {
    try {
      await desactivarUnidadFlotilla(unidad.id)
      setDetalle(null)
      toast.success("Unidad desactivada sin eliminar su historial")
    } catch (error: any) {
      toast.error(error.message || "No fue posible desactivar la unidad")
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Unidades de flotilla</p>
          <p className="text-xs text-muted-foreground">{unidades.filter(unidad => unidad.activa).length} unidades activas</p>
        </div>
        <Button size="sm" onClick={abrirAlta}><Plus className="w-4 h-4 mr-1" />Agregar unidad</Button>
      </div>

      {unidades.length === 0 ? (
        <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">No hay unidades registradas.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/50">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr>
                <th className="p-2 text-left">Número de inciso</th>
                <th className="p-2 text-left">Unidad</th>
                <th className="p-2 text-left">Placas</th>
                <th className="p-2 text-left">Estatus</th>
                <th className="p-2 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {unidades.map(unidad => (
                <tr key={unidad.id} className="border-t border-border/40">
                  <td className="p-2 font-mono font-semibold">{unidad.numeroInciso}</td>
                  <td className="p-2">{[unidad.marca, unidad.modelo].filter(Boolean).join(" ") || unidad.descripcion || "—"}</td>
                  <td className="p-2">{unidad.placas || "—"}</td>
                  <td className="p-2"><Badge variant="outline">{unidad.activa ? "Activa" : "Inactiva"}</Badge></td>
                  <td className="p-2">
                    <div className="flex justify-center gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDetalle(unidad)}><Eye className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => abrirEdicion(unidad)}><Edit2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={modalForm} onOpenChange={setModalForm}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader><DialogTitle>{editando ? "Editar unidad" : "Alta de unidad"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Número de inciso *</Label><Input value={form.numeroInciso} onChange={event => setForm(prev => ({ ...prev, numeroInciso: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Prima total</Label><Input type="number" min="0" step="0.01" value={form.primaTotal} onChange={event => setForm(prev => ({ ...prev, primaTotal: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Marca</Label><Input value={form.marca} onChange={event => setForm(prev => ({ ...prev, marca: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Modelo</Label><Input value={form.modelo} onChange={event => setForm(prev => ({ ...prev, modelo: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Placas</Label><Input value={form.placas} onChange={event => setForm(prev => ({ ...prev, placas: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Número de serie</Label><Input value={form.numeroSerie} onChange={event => setForm(prev => ({ ...prev, numeroSerie: event.target.value }))} /></div>
            <div className="space-y-1 col-span-2"><Label>Descripción</Label><Input value={form.descripcion} onChange={event => setForm(prev => ({ ...prev, descripcion: event.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setModalForm(false)}>Cancelar</Button><Button disabled={guardando} onClick={guardar}>{guardando ? "Guardando..." : "Guardar"}</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detalle} onOpenChange={open => { if (!open) setDetalle(null) }}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader><DialogTitle>Unidad · Inciso {detalle?.numeroInciso}</DialogTitle></DialogHeader>
          {detalle && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Número de inciso", detalle.numeroInciso],
                  ["Descripción", detalle.descripcion || "—"],
                  ["Marca", detalle.marca || "—"],
                  ["Modelo", detalle.modelo || "—"],
                  ["Placas", detalle.placas || "—"],
                  ["Número de serie", detalle.numeroSerie || "—"],
                  ["Prima total", detalle.primaTotal === undefined ? "—" : `$${detalle.primaTotal.toLocaleString()}`],
                  ["Estatus", detalle.activa ? "Activa" : "Inactiva"],
                ].map(([label, value]) => <div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium">{value}</p></div>)}
              </div>
              <div className="flex justify-end gap-2">
                {detalle.activa && <Button variant="outline" className="text-destructive" onClick={() => desactivar(detalle)}><XCircle className="w-4 h-4 mr-1" />Desactivar</Button>}
                <Button onClick={() => abrirEdicion(detalle)}><Edit2 className="w-4 h-4 mr-1" />Editar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
