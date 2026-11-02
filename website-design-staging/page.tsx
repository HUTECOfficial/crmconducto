"use client";

import Image from "next/image";
import { Toaster } from "sonner";
import { ShieldCheck } from "lucide-react";
import { QuotePortal } from "@/components/quote-portal";

export default function Home() {
  return <div className="site-shell min-h-screen bg-slate-50"><Toaster richColors position="top-center" /><header className="site-header border-b border-slate-200/80 bg-white/90 px-5 py-4 backdrop-blur"><div className="mx-auto flex max-w-6xl items-center justify-between"><Image src="/491894161_18048071162523473_1277026373025483120_n.jpg" alt="Conducto Asesores" width={124} height={40} className="h-9 w-auto object-contain" priority /><span className="hidden items-center gap-2 text-sm font-medium text-slate-600 sm:inline-flex"><ShieldCheck className="h-4 w-4 text-primary" /> Atención de asesores</span></div></header><main className="site-main mx-auto max-w-6xl px-5 py-12 sm:py-16"><QuotePortal /></main><footer className="site-footer border-t border-slate-200 bg-white px-5 py-6 text-center text-sm text-slate-500">© {new Date().getFullYear()} Conducto Asesores · Solicitudes de cotización de seguros</footer></div>;
}
