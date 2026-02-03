import type React from "react"
import type { Metadata } from "next"
import { Inter, Playfair_Display } from "next/font/google"
import "./globals.css"
import { CommandPaletteProvider } from "@/components/command-palette-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { ToastProvider } from "@/components/toast-provider"
import { ProspectosProvider } from "@/contexts/prospectos-context"
import { PolizasProvider } from "@/contexts/polizas-context"
import { SupabaseProvider } from "@/contexts/supabase-context"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
})

export const metadata: Metadata = {
  title: "CONDUCTO CRM - Gestión Inteligente",
  description: "Sistema de gestión de seguros con estética premium",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${inter.variable} ${playfair.variable} antialiased`} suppressHydrationWarning>
      <body>
        <ToastProvider>
          <AuthProvider>
            <SupabaseProvider>
              <ProspectosProvider>
                <PolizasProvider>
                  <CommandPaletteProvider>{children}</CommandPaletteProvider>
                </PolizasProvider>
              </ProspectosProvider>
            </SupabaseProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
