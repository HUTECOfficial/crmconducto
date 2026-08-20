"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { ProtectedRoute } from "@/components/protected-route"

export function AppWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === "/login"

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="ml-64 p-8">{children}</main>
      </div>
    </ProtectedRoute>
  )
}
