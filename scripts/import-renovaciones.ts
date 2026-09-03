import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import { resolve } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const applyChanges = process.argv.includes('--apply')
const sourceFile = process.argv.find(arg => !arg.startsWith('--') && arg !== process.argv[0] && arg !== process.argv[1])
  || '/Users/mac/Downloads/RENOVACIONES AGOSTO 2026 (1).xlsx'

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

type RenovacionExcel = {
  polizaOrigen: string
  polizaRenovada: string
  ramo: string
  compania: string
  vencimiento: string
  asegurado: string
  propuesta: boolean
  cotizaciones: boolean
  propuestaEnviada: boolean
  condicionesGenerales: boolean
  factura: boolean
  recibo: boolean
  renovar: boolean
  renovacionEnviada: boolean
  capturaDagon: boolean
  pagado: boolean
  observaciones: string
  nacimiento: string
}

const RAMO_MAP: Record<string, 'autos' | 'vida' | 'gastos-medicos' | 'empresa' | 'flotilla'> = {
  'AUTO': 'autos',
  'AUTOMOVILES': 'autos',
  'CAMIONES Y PICK UPS': 'autos',
  'MOTO': 'autos',
  'MOTOCICLETAS': 'autos',
  'AUTOS FLOTILLA': 'flotilla',
  'GMM': 'gastos-medicos',
  'GASTOS MEDICOS IND.': 'gastos-medicos',
  'GASTOS MEDICOS COLECT.': 'gastos-medicos',
  'VIDA': 'vida',
  'VIDA INDIVIDUAL': 'vida',
  'GRUPO Y COLECTIVO': 'vida',
  'DAÑOS': 'empresa',
  'TRANSPORTES': 'empresa',
  'RESP. CIVIL': 'empresa',
  'AP ESCOLAR': 'empresa',
}

const CIA_MAP: Record<string, string> = {
  'HDI': 'HDI Seguros',
  'QUA': 'Qualitas',
  'AXA': 'AXA Seguros',
  'BAN': 'Banorte Seguros',
  'GNP': 'GNP Seguros',
  'GMX': 'GMX Seguros',
  'AIG': 'AIG Seguros',
  'GS': 'General de Seguros',
  'CRABI': 'CRABI',
  'ATLAS': 'Seguros Atlas',
  'BX+': 'BX+ Seguros',
}

function text(value: unknown): string {
  return String(value ?? '').trim()
}

function marked(value: unknown): boolean {
  return text(value).toUpperCase() === 'X'
}

function parseMexicanDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10)

  const raw = text(value)
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(raw)
  if (!match) throw new Error(`Fecha de vencimiento inválida: ${raw || '(vacía)'}`)

  const month = Number(match[1])
  const day = Number(match[2])
  const year = Number(match[3]) + (match[3].length === 2 ? 2000 : 0)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new Error(`Fecha de vencimiento inválida: ${raw}`)
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function addYears(iso: string, years: number): string {
  const date = new Date(`${iso}T00:00:00.000Z`)
  date.setUTCFullYear(date.getUTCFullYear() + years)
  return date.toISOString().slice(0, 10)
}

function placeholderEmail(nombre: string): string {
  const localPart = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '')
  return `${localPart}@pendiente.com`
}

function sourceNotes(row: RenovacionExcel): string {
  const avances = [
    row.propuesta && 'propuesta',
    row.cotizaciones && 'cotizaciones varias',
    row.propuestaEnviada && 'propuesta enviada',
    row.condicionesGenerales && 'condiciones generales',
    row.factura && 'factura',
    row.recibo && 'recibo',
    row.renovar && 'renovar',
    row.renovacionEnviada && 'renovación enviada',
    row.capturaDagon && 'captura Dagon',
    row.pagado && 'pagado',
  ].filter(Boolean)

  return [
    'Importado de RENOVACIONES AGOSTO 2026 (1).xlsx.',
    avances.length ? `Avances en Excel: ${avances.join(', ')}.` : null,
    row.observaciones ? `Observaciones Excel: ${row.observaciones}.` : null,
    row.nacimiento ? `Fecha de nacimiento: ${row.nacimiento}.` : null,
    'Prima y forma de pago pendientes de completar.',
  ].filter(Boolean).join(' ')
}

function isCancelled(row: RenovacionExcel): boolean {
  return /CANCELA POLIZA|NO SE RENUEVA/i.test(row.observaciones)
}

function hasCompletedRenewal(row: RenovacionExcel): boolean {
  return Boolean(row.polizaRenovada) && row.capturaDagon && !isCancelled(row)
}

function readRows(filePath: string): RenovacionExcel[] {
  const workbook = XLSX.readFile(filePath, { cellDates: true })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  return rows.slice(2).filter(row => text(row[0])).map(row => ({
    polizaOrigen: text(row[0]),
    polizaRenovada: text(row[1]),
    ramo: text(row[2]).toUpperCase(),
    compania: text(row[3]).toUpperCase(),
    vencimiento: parseMexicanDate(row[4]),
    asegurado: text(row[5]),
    propuesta: marked(row[6]),
    cotizaciones: marked(row[7]),
    propuestaEnviada: marked(row[8]),
    condicionesGenerales: marked(row[9]),
    factura: marked(row[10]),
    recibo: marked(row[11]),
    renovar: marked(row[12]),
    renovacionEnviada: marked(row[13]),
    capturaDagon: marked(row[14]),
    pagado: marked(row[15]),
    observaciones: text(row[16]),
    nacimiento: text(row[17]),
  }))
}

async function getOrCreateCompania(nombreExcel: string): Promise<string> {
  const nombreDb = CIA_MAP[nombreExcel] || nombreExcel
  const { data: existing, error: existingError } = await supabase.from('companias').select('id').ilike('nombre', nombreDb).maybeSingle()
  if (existingError) throw existingError
  if (existing) return existing.id
  if (!applyChanges) return `dry-run-compania:${nombreDb}`

  const { data: created, error } = await supabase.from('companias')
    .insert([{ nombre: nombreDb, color: '#64748b' }]).select('id').single()
  if (error) throw error
  return created.id
}

async function getOrCreateCliente(nombre: string): Promise<string> {
  const { data: existing, error: existingError } = await supabase.from('clientes').select('id').ilike('nombre', nombre).maybeSingle()
  if (existingError) throw existingError
  if (existing) return existing.id
  if (!applyChanges) return `dry-run-cliente:${nombre}`

  const { data: created, error } = await supabase.from('clientes').insert([{
    nombre,
    email: placeholderEmail(nombre),
    telefono: 'Pendiente',
    fecha_registro: new Date().toISOString().slice(0, 10),
    estatus: 'activo',
    notas: 'Importado de RENOVACIONES AGOSTO 2026 (1).xlsx - completar datos de contacto.',
  }]).select('id').single()
  if (error) throw error
  return created.id
}

async function findPolicy(numeroPoliza: string) {
  const { data, error } = await supabase.from('polizas').select('id, numero_poliza').eq('numero_poliza', numeroPoliza).maybeSingle()
  if (error) throw error
  return data
}

async function renewalLinkExists(originId: string, renewedId: string): Promise<boolean> {
  const { data, error } = await supabase.from('renovaciones').select('id')
    .eq('poliza_origen_id', originId).eq('poliza_renovada_id', renewedId).eq('estado', 'renovada').limit(1)
  if (error) throw error
  return Boolean(data?.length)
}

async function insertPolicy(data: Record<string, unknown>) {
  if (!applyChanges) return { id: `dry-run-poliza:${data.numero_poliza}` }
  const { data: created, error } = await supabase.from('polizas').insert([data]).select('id').single()
  if (error) throw error
  return created
}

async function main() {
  const filePath = resolve(sourceFile)
  const rows = readRows(filePath)
  const summary = {
    filas: rows.length, polizasOrigenCreadas: 0, polizasRenovadasCreadas: 0, polizasVigentesMismoFolio: 0,
    renovacionesCompletadas: 0, pendientes: 0, canceladas: 0, duplicadas: 0, errores: 0,
  }

  for (const row of rows) {
    try {
      if (!row.polizaOrigen || !row.asegurado || !row.compania) throw new Error('Faltan póliza, asegurado o compañía')
      const ramo = RAMO_MAP[row.ramo] || 'empresa'
      const companiaId = await getOrCreateCompania(row.compania)
      const clienteId = await getOrCreateCliente(row.asegurado)
      const notes = sourceNotes(row)
      const originStart = addYears(row.vencimiento, -1)
      const renewalStart = addDays(row.vencimiento, 1)
      const renewalEnd = addDays(addYears(renewalStart, 1), -1)
      const cancelled = isCancelled(row)
      const completed = hasCompletedRenewal(row)
      const samePolicyNumber = completed && row.polizaRenovada === row.polizaOrigen

      if (samePolicyNumber) {
        if (await findPolicy(row.polizaOrigen)) { summary.duplicadas++; continue }
        await insertPolicy({
          cliente_id: clienteId, compania_id: companiaId, ramo, numero_poliza: row.polizaOrigen,
          vigencia_inicio: renewalStart, vigencia_fin: renewalEnd, prima: 0, forma_pago: 'anual',
          estatus: 'activa', renovacion_estado: 'sin_iniciar', folios: null, tramites: 0,
          prima_emitida: 0, prima_cobrada: 0, fecha_emision: renewalStart, nombre_asegurado: row.asegurado,
          numero_recibo: '1/1',
          notas: `${notes} Renovación capturada con el mismo número de póliza; vigencia actualizada al periodo renovado.`,
        })
        summary.polizasVigentesMismoFolio++
        continue
      }

      const existingOrigin = await findPolicy(row.polizaOrigen)
      let originId = existingOrigin?.id
      if (!originId) {
        const origin = await insertPolicy({
          cliente_id: clienteId, compania_id: companiaId, ramo, numero_poliza: row.polizaOrigen,
          vigencia_inicio: originStart, vigencia_fin: row.vencimiento, prima: 0, forma_pago: 'anual',
          estatus: cancelled ? 'cancelada' : completed ? 'renovada' : 'por-renovar',
          renovacion_estado: cancelled ? 'cancelada' : completed ? 'renovada' : 'pendiente',
          folios: null, tramites: 0, prima_emitida: 0, prima_cobrada: 0, fecha_emision: originStart,
          nombre_asegurado: row.asegurado, numero_recibo: '1/1', notas: notes,
        })
        originId = origin.id
        summary.polizasOrigenCreadas++
      } else summary.duplicadas++

      if (cancelled) { summary.canceladas++; continue }
      if (!completed) { summary.pendientes++; continue }

      const existingRenewed = await findPolicy(row.polizaRenovada)
      let renewedId = existingRenewed?.id
      if (!renewedId) {
        const renewed = await insertPolicy({
          cliente_id: clienteId, compania_id: companiaId, ramo, numero_poliza: row.polizaRenovada,
          vigencia_inicio: renewalStart, vigencia_fin: renewalEnd, prima: 0, forma_pago: 'anual',
          estatus: 'activa', renovacion_estado: 'sin_iniciar', renovada_desde_id: originId,
          folios: null, tramites: 0, prima_emitida: 0, prima_cobrada: 0, fecha_emision: renewalStart,
          nombre_asegurado: row.asegurado, numero_recibo: '1/1', notas: `${notes} Renovación de la póliza ${row.polizaOrigen}.`,
        })
        renewedId = renewed.id
        summary.polizasRenovadasCreadas++
      }

      if (applyChanges) {
        const { error: linkOriginError } = await supabase.from('polizas')
          .update({ estatus: 'renovada', renovacion_estado: 'renovada', renovada_a_id: renewedId }).eq('id', originId)
        if (linkOriginError) throw linkOriginError
        const { error: linkRenewedError } = await supabase.from('polizas').update({ renovada_desde_id: originId }).eq('id', renewedId)
        if (linkRenewedError) throw linkRenewedError
        if (!await renewalLinkExists(originId, renewedId)) {
          const { error: renewalError } = await supabase.from('renovaciones').insert({
            poliza_origen_id: originId, poliza_renovada_id: renewedId, estado: 'renovada', estatus_poliza_anterior: 'por-renovar',
            iniciada_en: `${renewalStart}T00:00:00.000Z`, completada_en: `${renewalStart}T00:00:00.000Z`,
          })
          if (renewalError) throw renewalError
        }
      }
      summary.renovacionesCompletadas++
    } catch (error) {
      summary.errores++
      console.error(`Error importando póliza ${row.polizaOrigen}:`, error instanceof Error ? error.message : error)
    }
  }

  console.log(`${applyChanges ? 'Importación' : 'Vista previa'} completada para ${filePath}:`)
  console.table(summary)
}

main().catch(error => { console.error(error); process.exit(1) })
