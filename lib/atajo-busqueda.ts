/** Atajo del buscador rápido: ⌘K en Mac; Ctrl + K en Windows y Linux. */
export function esMac(): boolean {
  if (typeof navigator === "undefined") return false
  const plataforma = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform || navigator.platform || navigator.userAgent
  return /mac|iphone|ipad/i.test(plataforma)
}

export const etiquetaAtajoBusqueda = () => (esMac() ? "⌘K" : "Ctrl K")

/** Abre el buscador rápido desde cualquier botón (lo escucha CommandPaletteProvider). */
export const EVENTO_ABRIR_BUSQUEDA = "crm:abrir-busqueda"
export const abrirBusquedaRapida = () => window.dispatchEvent(new Event(EVENTO_ABRIR_BUSQUEDA))
