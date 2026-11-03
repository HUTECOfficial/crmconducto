"use client"

import { Button } from "@/components/ui/button"
import { MessageCircle } from "lucide-react"
import { useState } from "react"
import { useSupabase, type Poliza } from "@/contexts/supabase-context"
import { etiquetaRamo } from "@/lib/ramos"

interface WhatsAppReminderButtonProps {
  poliza: Poliza
  className?: string
  /** Saldo calculado desde los recibos por cobrar; sin él se usa prima emitida - cobrada. */
  montoPendiente?: number
}

export function WhatsAppReminderButton({ poliza, className, montoPendiente }: WhatsAppReminderButtonProps) {
  const { clientesPorId } = useSupabase()
  const [enviando, setEnviando] = useState(false)

  // Obtener datos del cliente
  const cliente = clientesPorId.get(poliza.clienteId)
  if (!cliente) return null

  const handleSendWhatsApp = () => {
    setEnviando(true)

    // Número de WhatsApp (formato internacional)
    const numeroWhatsApp = "524775805382" // Tu número

    // Calcular prima pendiente
    const primaPendiente = montoPendiente ?? poliza.primaEmitida - poliza.primaCobrada

    // Crear mensaje amable
    const mensaje = `¡Hola ${cliente.nombre}! 👋

Te escribo para recordarte que tu póliza ${poliza.numeroPoliza} tiene un pago pendiente.

📋 *Detalles de tu Póliza:*
• Número: ${poliza.numeroPoliza}
• Compañía: ${poliza.companiaId.toUpperCase()}
• Ramo: ${etiquetaRamo(poliza.ramo)}
• Prima Pendiente: $${primaPendiente.toLocaleString()}
• Estatus: ${poliza.estatus}
• Vigencia: ${poliza.vigenciaInicio} a ${poliza.vigenciaFin}

💳 *Forma de Pago:* ${poliza.formaPago}

Por favor, realiza el pago lo antes posible para mantener tu cobertura activa.

Si tienes dudas, no dudes en contactarnos.

¡Gracias! 🙏`

    // Codificar mensaje para URL
    const mensajeEncodificado = encodeURIComponent(mensaje)

    // Crear URL de WhatsApp
    const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${mensajeEncodificado}`

    // Abrir WhatsApp
    window.open(urlWhatsApp, "_blank")

    setEnviando(false)
  }

  // Solo mostrar si hay prima pendiente
  const primaPendiente = montoPendiente ?? poliza.primaEmitida - poliza.primaCobrada
  if (primaPendiente <= 0) return null

  return (
    <Button
      onClick={handleSendWhatsApp}
      disabled={enviando}
      className={`gap-2 bg-green-600 hover:bg-green-700 ${className}`}
      size="sm"
    >
      <MessageCircle className="w-4 h-4" />
      {enviando ? "Abriendo..." : "Recordar por WhatsApp"}
    </Button>
  )
}
