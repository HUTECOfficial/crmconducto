"use client"

import { Button } from "@/components/ui/button"
import { MessageCircle } from "lucide-react"
import { useState } from "react"
import { Poliza } from "@/data/polizas"
import { clientes } from "@/data/clientes"

interface WhatsAppReminderButtonProps {
  poliza: Poliza
  className?: string
}

export function WhatsAppReminderButton({ poliza, className }: WhatsAppReminderButtonProps) {
  const [enviando, setEnviando] = useState(false)

  // Obtener datos del cliente
  const cliente = clientes.find(c => c.id === poliza.clienteId)
  if (!cliente) return null

  const handleSendWhatsApp = () => {
    setEnviando(true)

    // Número de WhatsApp (formato internacional)
    const numeroWhatsApp = "524775805382" // Tu número

    // Calcular prima pendiente
    const primaPendiente = poliza.primaEmitida - poliza.primaCobrada

    // Crear mensaje amable
    const mensaje = `¡Hola ${cliente.nombre}! 👋

Te escribo para recordarte que tu póliza ${poliza.numeroPoliza} tiene un pago pendiente.

📋 *Detalles de tu Póliza:*
• Número: ${poliza.numeroPoliza}
• Compañía: ${poliza.companiaId.toUpperCase()}
• Ramo: ${poliza.ramo}
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
  const primaPendiente = poliza.primaEmitida - poliza.primaCobrada
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
