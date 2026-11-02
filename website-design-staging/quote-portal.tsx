"use client";

import Image from "next/image";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowLeft, ArrowRight, CarFront, Check, HeartPulse, ShieldPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import CotizadorForm from "@/components/cotizador-form";
import { LifeQuoteForm } from "@/components/life-quote-form";
import { MedicalQuoteForm } from "@/components/medical-quote-form";
import { QuoteConfirmation } from "@/components/quote-confirmation";
import { insuranceProducts } from "@/lib/insurance-products";
import type { ContactData, InsuranceType, SubmissionResult } from "@/lib/quote-types";

type Screen = "catalog" | "information" | "form" | "confirmation";
const icons = { auto: CarFront, medical: ShieldPlus, life: HeartPulse };
const iconColors = { auto: "bg-indigo-100 text-primary", medical: "bg-sky-100 text-sky-700", life: "bg-rose-100 text-rose-700" };
const spring = { type: "spring" as const, stiffness: 280, damping: 26, mass: 0.7 };

export function QuotePortal() {
  const [screen, setScreen] = useState<Screen>("catalog");
  const [product, setProduct] = useState<InsuranceType>("auto");
  const [confirmation, setConfirmation] = useState<{ result: SubmissionResult; contact: ContactData } | null>(null);
  const reduceMotion = useReducedMotion();
  const current = insuranceProducts[product];
  const selectProduct = (type: InsuranceType) => { setProduct(type); setScreen(type === "auto" ? "form" : "information"); };
  const submitted = (result: SubmissionResult, contact: ContactData) => { setConfirmation({ result, contact }); setScreen("confirmation"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const backToCatalog = () => { setScreen("catalog"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const revealChoices = () => document.getElementById("insurance-choices")?.scrollIntoView({ behavior: "smooth", block: "start" });
  const enter = reduceMotion ? { duration: 0.18 } : spring;

  if (screen === "confirmation" && confirmation) return <QuoteConfirmation result={confirmation.result} productName={current.name} contact={confirmation.contact} onReset={() => { setConfirmation(null); backToCatalog(); }} />;

  if (screen === "catalog") return <motion.section key="catalog" initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }} animate={{ opacity: 1, y: 0 }} transition={enter} className="home-experience">
    <section className="home-hero">
      <div className="hero-content">
        <motion.div initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...enter, delay: 0.04 }} className="hero-brand">
          <Image src="/491894161_18048071162523473_1277026373025483120_n.jpg" alt="Conducto Asesores" width={320} height={320} priority className="h-full w-full object-cover" />
        </motion.div>
        <p className="hero-kicker">Conducto Asesores · Cotizador digital</p>
        <h1>Protección que<br /><span>se siente simple.</span></h1>
        <p className="hero-description">Selecciona el seguro que necesitas. Un asesor revisará tu solicitud y preparará una propuesta pensada para ti.</p>
        <div className="hero-actions">
          <Button onClick={revealChoices} className="hero-button h-12 rounded-2xl px-5">Explorar seguros <ArrowDown className="h-4 w-4" /></Button>
          <div className="hero-assurance"><span>3</span><p><b>Opciones de protección</b><br />en un solo lugar</p></div>
        </div>
        <div className="hero-trust"><span><Check className="h-3.5 w-3.5" /> Sin compromiso</span><span><Check className="h-3.5 w-3.5" /> Atención de asesores</span></div>
      </div>
      <div className="hero-art-stage" aria-hidden="true">
        <Image src="/hero-protection-portal.png" alt="" fill priority sizes="(max-width: 920px) 100vw, 52vw" className="hero-art" />
        <motion.div animate={reduceMotion ? {} : { y: [0, -7, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }} className="hero-glass-note"><i /><span>Propuesta personalizada</span></motion.div>
        <div className="hero-orbit hero-orbit-a" /><div className="hero-orbit hero-orbit-b" />
      </div>
    </section>

    <section id="insurance-choices" className="choice-section">
      <div className="choice-heading"><p>Tu camino empieza aquí</p><h2>¿Qué quieres cotizar?</h2><span>Elige una opción para comenzar.</span></div>
      <div className="grid gap-5 lg:grid-cols-3">
        {(Object.keys(insuranceProducts) as InsuranceType[]).map((type, index) => {
          const item = insuranceProducts[type]; const Icon = icons[type];
          return <motion.article key={type} initial={{ opacity: 0, y: reduceMotion ? 0 : 18 }} animate={{ opacity: 1, y: 0 }} transition={{ ...enter, delay: 0.14 + index * 0.07 }} whileHover={reduceMotion ? undefined : { y: -7 }} whileTap={{ scale: 0.985 }} className="quote-card group relative flex min-h-72 flex-col overflow-hidden rounded-3xl border p-7">
            <div className={"quote-icon flex h-14 w-14 items-center justify-center rounded-2xl " + iconColors[type]}><Icon className="h-7 w-7" /></div>
            <span className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{item.badge}</span>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{item.name}</h3>
            <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{item.description}</p>
            <Button onClick={() => selectProduct(type)} className="quote-button mt-7 h-12 w-full rounded-2xl">Solicitar cotización <ArrowRight className="h-4 w-4" /></Button>
          </motion.article>;
        })}
      </div>
    </section>

    <div className="journey" aria-label="Cómo funciona"><div><b>1</b><span>Elige tu seguro</span></div><i /><div><b>2</b><span>Comparte lo esencial</span></div><i /><div><b>3</b><span>Recibe tu propuesta</span></div></div>
    <p className="home-disclaimer">No calculamos primas automáticamente; un asesor atenderá tu solicitud personalmente.</p>
  </motion.section>;

  if (screen === "information") { const Icon = icons[product]; return <motion.section key="information" initial={{ opacity: 0, x: reduceMotion ? 0 : 18 }} animate={{ opacity: 1, x: 0 }} transition={enter} className="portal-panel mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-9"><Button type="button" variant="outline" onClick={backToCatalog} className="mb-7 rounded-xl"><ArrowLeft className="h-4 w-4" /> Todos los seguros</Button><div className="flex items-start gap-4"><span className={"flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl " + iconColors[product]}><Icon className="h-6 w-6" /></span><div><span className="text-sm font-semibold text-primary">{current.badge}</span><h1 className="mt-1 text-3xl font-bold text-slate-900">{current.name}</h1><p className="mt-2 text-slate-600">{current.description}</p></div></div><div className="mt-8 grid gap-4">{current.info.map((item) => <article key={item.title} className="rounded-2xl bg-slate-50 p-5"><h2 className="font-semibold text-slate-900">{item.title}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p></article>)}{product === "medical" && <article className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/60 p-5"><h2 className="font-semibold text-slate-900">Videos y material de capacitación</h2><p className="mt-1 text-sm leading-6 text-slate-600">Este espacio está preparado para que administración publique videos y documentos informativos.</p></article>}</div><Button onClick={() => setScreen("form")} className="mt-8 h-11 w-full rounded-xl">Solicitar cotización <ArrowRight className="h-4 w-4" /></Button></motion.section>; }

  const formTitle = product === "medical" ? "Solicitud de Gastos Médicos Mayores" : product === "life" ? "Solicitud de Seguro de Vida" : "Solicitud de Seguro de Auto";
  const FormIcon = icons[product];
  return <motion.section key="form" initial={{ opacity: 0, x: reduceMotion ? 0 : 18 }} animate={{ opacity: 1, x: 0 }} transition={enter} className="portal-panel mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-9"><button type="button" onClick={() => setScreen(product === "auto" ? "catalog" : "information")} className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary"><ArrowLeft className="h-4 w-4" /> Volver</button><div className="mb-7 flex items-center gap-3"><span className={"flex h-10 w-10 items-center justify-center rounded-xl " + iconColors[product]}><FormIcon className="h-5 w-5" /></span><div><p className="text-sm font-semibold text-primary">Conducto Asesores</p><h1 className="text-2xl font-bold text-slate-900">{formTitle}</h1></div></div>{product === "auto" ? <CotizadorForm onSubmitted={submitted} onBack={backToCatalog} /> : product === "medical" ? <MedicalQuoteForm onSubmitted={submitted} onBack={() => setScreen("information")} /> : <LifeQuoteForm onSubmitted={submitted} onBack={() => setScreen("information")} />}</motion.section>;
}
