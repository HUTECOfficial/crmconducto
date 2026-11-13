// Inciso y endoso se capturan por separado y se guardan en la columna inciso_endoso como "inciso | endoso".
const SEPARADOR = "|"

export function separarIncisoEndoso(valor?: string | null): { inciso: string; endoso: string } {
  if (!valor) return { inciso: "", endoso: "" }
  const indice = valor.indexOf(SEPARADOR)
  // Valores anteriores sin separador se consideran inciso.
  if (indice === -1) return { inciso: valor.trim(), endoso: "" }
  return { inciso: valor.slice(0, indice).trim(), endoso: valor.slice(indice + 1).trim() }
}

export function unirIncisoEndoso(inciso: string, endoso: string): string {
  const i = inciso.replaceAll(SEPARADOR, "").trim()
  const e = endoso.replaceAll(SEPARADOR, "").trim()
  if (!e) return i
  return `${i} ${SEPARADOR} ${e}`.trim()
}

export function formatoIncisoEndoso(valor?: string | null): string {
  const { inciso, endoso } = separarIncisoEndoso(valor)
  return [inciso && `Inciso ${inciso}`, endoso && `Endoso ${endoso}`].filter(Boolean).join(" · ")
}
