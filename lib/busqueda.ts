import { etiquetaRamo } from './ramos'

/** Minúsculas y sin acentos, para que "gomez" encuentre "Gómez". */
export function normalizarBusqueda(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Cada palabra de la búsqueda debe aparecer, en cualquier orden. */
export function terminosBusqueda(busqueda: string): string[] {
  return normalizarBusqueda(busqueda).split(/\s+/).filter(Boolean)
}

export function coincideTerminos(textoNormalizado: string, terminos: string[]) {
  return terminos.every(termino => textoNormalizado.includes(termino))
}

/**
 * Texto buscable de una póliza: número, cliente (nombre, teléfonos, correo, RFC), asegurado,
 * aseguradora, ramo y grupo. Se arma una vez por carga de datos, no en cada tecla.
 */
export function textoBuscablePoliza(
  poliza: { numeroPoliza: string; nombreAsegurado?: string; ramo: string; grupo?: string },
  cliente: { nombre: string; telefono?: string; telefonos?: Array<{ numero: string }>; email?: string; rfc?: string } | undefined,
  compania: string | undefined,
) {
  const telefonos = [cliente?.telefono, ...(cliente?.telefonos || []).map(telefono => telefono.numero)].filter(Boolean) as string[]
  return normalizarBusqueda([
    poliza.numeroPoliza,
    cliente?.nombre,
    // También sin espacios ni guiones, para encontrar "5512345678" aunque se guardó "55 1234-5678".
    ...telefonos,
    ...telefonos.map(telefono => telefono.replace(/\D/g, '')),
    cliente?.email,
    cliente?.rfc,
    poliza.nombreAsegurado,
    compania,
    etiquetaRamo(poliza.ramo),
    poliza.grupo,
  ].filter(Boolean).join(' '))
}
