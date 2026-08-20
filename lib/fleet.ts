export function normalizarNumeroInciso(value: string): string {
  return value.trim()
}

export function validarNumeroInciso(value: string): boolean {
  return normalizarNumeroInciso(value).length > 0
}

export function numeroIncisoDisponible(value: string, existentes: string[], incisoActual?: string): boolean {
  const normalizado = normalizarNumeroInciso(value).toLocaleLowerCase('es-MX')
  const actual = incisoActual === undefined ? undefined : normalizarNumeroInciso(incisoActual).toLocaleLowerCase('es-MX')
  return validarNumeroInciso(value) && !existentes.some(item => {
    const existente = normalizarNumeroInciso(item).toLocaleLowerCase('es-MX')
    return existente === normalizado && existente !== actual
  })
}
