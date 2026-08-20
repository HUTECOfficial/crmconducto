"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { MessageCircle, Copy, Check } from "lucide-react"
import { toast } from "sonner"

interface WhatsAppFormat {
  id: string
  nombre: string
  template: string
  descripcion?: string
}

interface WhatsAppShareButtonProps {
  clienteNombre?: string
  clienteTelefono?: string
  polizaNumero?: string
  formats?: WhatsAppFormat[]
}

const DEFAULT_FORMATS: WhatsAppFormat[] = [
  {
    id: "cotizacion",
    nombre: "Cotización",
    template: "Hola {nombre}, te envío la cotización solicitada para tu póliza {poliza}. Por favor revísala y confirma si tienes dudas.",
    descripcion: "Enviar cotización de póliza"
  },
  {
    id: "recordatorio-pago",
    nombre: "Recordatorio de Pago",
    template: "Hola {nombre}, te recordamos que tu póliza {poliza} vence próximamente. Por favor realiza el pago a tiempo.",
    descripcion: "Recordar pago de póliza"
  },
  {
    id: "confirmacion-renovacion",
    nombre: "Confirmación de Renovación",
    template: "Hola {nombre}, tu póliza {poliza} ha sido renovada exitosamente. Adjunto encontrarás los documentos.",
    descripcion: "Confirmar renovación"
  },
  {
    id: "seguimiento",
    nombre: "Seguimiento",
    template: "Hola {nombre}, te contacto para dar seguimiento a tu póliza {poliza}. ¿Hay algo en lo que pueda ayudarte?",
    descripcion: "Hacer seguimiento al cliente"
  },
  {
    id: "bienvenida",
    nombre: "Bienvenida",
    template: "¡Hola {nombre}! Bienvenido a nuestros servicios. Estamos aquí para ayudarte con tu póliza {poliza}. ¿Tienes alguna pregunta?",
    descripcion: "Dar bienvenida a nuevo cliente"
  },
]

export function WhatsAppShareButton({
  clienteNombre = "Cliente",
  clienteTelefono,
  polizaNumero = "N/A",
  formats = DEFAULT_FORMATS,
}: WhatsAppShareButtonProps) {
  const [open, setOpen] = useState(false)
  const [selectedFormats, setSelectedFormats] = useState<string[]>([])
  const [copied, setCopied] = useState<string | null>(null)

  const toggleFormat = (id: string) => {
    setSelectedFormats(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    )
  }

  const generateMessage = (template: string) => {
    return template
      .replace("{nombre}", clienteNombre)
      .replace("{poliza}", polizaNumero)
  }

  const sendViaWhatsApp = (template: string) => {
    const message = generateMessage(template)
    if (!clienteTelefono) {
      toast.error("No hay número de teléfono disponible")
      return
    }
    
    // Formato: https://wa.me/[número]?text=[mensaje]
    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/${clienteTelefono.replace(/\D/g, '')}?text=${encodedMessage}`
    window.open(whatsappUrl, "_blank")
  }

  const copyToClipboard = (template: string) => {
    const message = generateMessage(template)
    navigator.clipboard.writeText(message)
    setCopied(template)
    toast.success("Mensaje copiado al portapapeles")
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="gap-2 text-green-600 border-green-600/30 hover:bg-green-500/10"
        onClick={() => setOpen(true)}
      >
        <MessageCircle className="w-4 h-4" />
        WhatsApp
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Compartir por WhatsApp</DialogTitle>
            <DialogDescription>
              Selecciona un formato y envía por WhatsApp a {clienteNombre}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Información del cliente */}
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-sm font-medium">{clienteNombre}</p>
              {clienteTelefono && (
                <p className="text-xs text-muted-foreground">{clienteTelefono}</p>
              )}
              {polizaNumero !== "N/A" && (
                <p className="text-xs text-muted-foreground">Póliza: {polizaNumero}</p>
              )}
            </div>

            {/* Formatos disponibles */}
            <div className="space-y-3">
              <p className="text-sm font-semibold">Formatos disponibles:</p>
              {formats.map(format => (
                <div key={format.id} className="space-y-2 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={format.id}
                      checked={selectedFormats.includes(format.id)}
                      onCheckedChange={() => toggleFormat(format.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <Label htmlFor={format.id} className="text-sm font-medium cursor-pointer">
                        {format.nombre}
                      </Label>
                      {format.descripcion && (
                        <p className="text-xs text-muted-foreground mt-0.5">{format.descripcion}</p>
                      )}
                    </div>
                  </div>

                  {/* Preview del mensaje */}
                  <div className="ml-6 p-2 rounded bg-muted/50 text-xs text-muted-foreground line-clamp-3">
                    {generateMessage(format.template)}
                  </div>

                  {/* Botones de acción */}
                  <div className="ml-6 flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1 text-green-600 hover:bg-green-500/10"
                      onClick={() => sendViaWhatsApp(format.template)}
                      disabled={!clienteTelefono}
                    >
                      <MessageCircle className="w-3 h-3" />
                      Enviar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1"
                      onClick={() => copyToClipboard(format.template)}
                    >
                      {copied === format.template ? (
                        <>
                          <Check className="w-3 h-3" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copiar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border/30">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
