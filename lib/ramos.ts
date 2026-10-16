export const RAMOS = [
  { value: 'autos', label: 'Autos' },
  { value: 'flotilla', label: 'Flotilla' },
  { value: 'vida', label: 'Vida' },
  { value: 'gastos-medicos', label: 'Gastos Médicos' },
  { value: 'accidentes-personales', label: 'Accidentes Personales' },
  { value: 'danos', label: 'Daños' },
  { value: 'empresa', label: 'Empresas' },
  { value: 'hogar', label: 'Hogar' },
] as const

export type Ramo = typeof RAMOS[number]['value']

/** Ramos que se administran por grupo o colectividad. */
export const RAMOS_CON_GRUPO: readonly Ramo[] = ['vida', 'gastos-medicos', 'accidentes-personales']

export function etiquetaRamo(ramo: string): string {
  return RAMOS.find(item => item.value === ramo)?.label ?? ramo.replaceAll('-', ' ')
}

export function ramoAdmiteGrupo(ramo: string): boolean {
  return (RAMOS_CON_GRUPO as readonly string[]).includes(ramo)
}
