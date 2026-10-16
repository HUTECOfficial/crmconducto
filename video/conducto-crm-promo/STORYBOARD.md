# Conducto CRM — 20-second product promo storyboard

**Format:** 1920×1080 landscape
**Audio:** Spanish TTS voiceover + restrained UI ticks and blue pulse accents
**VO direction:** warm, confident Spanish product-demo delivery; leave air between sentences
**Style basis:** DESIGN.md plus the captured source page in `capture/screenshots/scroll-000.png`

## Global guardrails

- Keep the light near-white canvas visible in every beat.
- Use royal blue as the recurring visual signal, with orange only for urgency and green for completion.
- Every panel enters with motion; no static screenshots without a zoom, parallax, or reveal treatment.
- Use glass surfaces, rounded 16–24px corners, and soft blue shadows.
- Favor readable UI scale over density; one dominant message per beat.

## Beat 1 — From scattered to visible

**Timing:** 0.00–[transcript]

**VO cue:** “De pólizas dispersas a una operación bajo control.”

**Visual:** Start on the real captured Conducto CRM login page, cropped as a centered glass panel. A thin blue scanning line and three floating labels — “Clientes”, “Renovaciones”, “Cobranza” — orbit into alignment. The captured page slowly zooms 1.00→1.03 while the labels settle into one royal-blue anchor.

**Techniques:** captured screenshot with Ken Burns, per-word kinetic typography, SVG path/line reveal.

**Transition:** soft blue wipe from right to left; the captured panel becomes the dashboard rail.

## Beat 2 — One view of the business

**Timing:** [transcript]–[transcript]

**VO cue:** “Conducto CRM centraliza clientes, renovaciones y cobranza en un solo lugar.”

**Visual:** Reveal a faithful dashboard composition: left navigation rail, “Dashboard” header, search field, and four metric tiles. The KPI values count upward: 24, 8, 17, 5. A small brand-blue glow travels across the tiles to suggest a live system.

**Techniques:** staggered glass-card entrances, counter animation, CSS 3D perspective on the dashboard shell.

**Transition:** a renewal row expands from the lower-right card and becomes the next scene’s focal panel.

## Beat 3 — Act before deadlines

**Timing:** [transcript]–[transcript]

**VO cue:** “Detecta vencimientos, prioriza pendientes y da seguimiento a cada oportunidad.”

**Visual:** The renewal queue fills the center: “María González — AXA”, “Carlos Rodríguez — GNP”, “Ana Martínez — Mapfre”. Orange urgency badges pulse on “7 días” and “Pago pendiente”; a thin progress bar resolves from orange into green as the system marks one item “Cobrado”.

**Techniques:** list stagger, SVG progress path drawing, finite pulse loop on status chips.

**Transition:** the queue compresses into three clean blue lines that draw the final wordmark.

## Beat 4 — Clarity that compounds

**Timing:** [transcript]–20.00s

**VO cue:** “Menos pendientes. Más claridad. Conducto CRM: gestión inteligente para crecer tu cartera.”

**Visual:** Minimal end card. CONDUCTO CRM in Playfair Display, subtitle “Gestión Inteligente”, and a royal-blue CTA pill “Organiza tu cartera”. Behind it, the dashboard cards remain as a soft blurred constellation, gently floating.

**Techniques:** kinetic two-line typography, radial glow pulse, final logo lockup.

**Transition:** none; hold the end card for the final breath.

## Asset audit

| Asset | Source | Beat | Treatment |
|---|---|---:|---|
| Captured login page | `capture/screenshots/scroll-000.png` | 1 | Cropped glass-panel opener, slow zoom |
| Brand SVGs | `capture/assets/svgs/` | 1/4 | Reference only if needed; do not inline |
| Dashboard UI | Built from source labels/components | 2–3 | Faithful glass-card recreation with animation |
