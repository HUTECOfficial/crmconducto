import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const RAMO_MAP: Record<string, string> = {
  'DAÑOS': 'empresa',
  'CAMIONES Y PICK UPS': 'autos',
  'AUTOMOVILES': 'autos',
  'MOTOCICLETAS': 'autos',
  'GASTOS MEDICOS IND.': 'gastos-medicos',
  'GASTOS MEDICOS COLECT.': 'gastos-medicos',
  'VIDA INDIVIDUAL': 'vida',
}

const PAGO_MAP: Record<string, string> = {
  'Contado': 'anual',
  'Semestral': 'semestral',
  'Mensual': 'mensual',
  'Trimestral': 'trimestral',
}

const CIA_MAP: Record<string, string> = {
  'HDI': 'HDI Seguros',
  'QUA': 'Qualitas',
  'AXA': 'AXA Seguros',
  'EXP': 'EXP Seguros',
}

function excelDateToISO(serial: number): string {
  const utcDays = Math.floor(serial - 25569)
  const utcValue = utcDays * 86400
  const date = new Date(utcValue * 1000)
  return date.toISOString().split('T')[0]
}

function subtractYear(iso: string): string {
  const d = new Date(iso)
  d.setFullYear(d.getFullYear() - 1)
  return d.toISOString().split('T')[0]
}

async function getOrCreateCompania(nombreExcel: string): Promise<string | null> {
  const nombreDb = CIA_MAP[nombreExcel] || nombreExcel
  const { data: existing } = await supabase
    .from('companias')
    .select('id, nombre')
    .ilike('nombre', `%${nombreDb}%`)
    .limit(1)

  if (existing && existing.length > 0) return existing[0].id

  const { data: created, error } = await supabase
    .from('companias')
    .insert([{ nombre: nombreDb, color: '#64748b' }])
    .select()
    .single()

  if (error) {
    console.error(`Error creando compañía ${nombreDb}:`, error.message)
    return null
  }
  console.log(`Compañía creada: ${nombreDb}`)
  return created.id
}

async function getOrCreateCliente(nombre: string): Promise<string | null> {
  const nombreLimpio = nombre.trim()
  const { data: existing } = await supabase
    .from('clientes')
    .select('id')
    .ilike('nombre', nombreLimpio)
    .limit(1)

  if (existing && existing.length > 0) return existing[0].id

  const emailPlaceholder = nombreLimpio.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '') + '@pendiente.com'

  const { data: created, error } = await supabase
    .from('clientes')
    .insert([{
      nombre: nombreLimpio,
      email: emailPlaceholder,
      telefono: 'Pendiente',
      fecha_registro: new Date().toISOString().split('T')[0],
      estatus: 'activo',
      notas: 'Importado de RENOVACIONES DAGON JUNIO 2027.xlsx - completar datos de contacto',
    }])
    .select()
    .single()

  if (error) {
    console.error(`Error creando cliente ${nombreLimpio}:`, error.message)
    return null
  }
  return created.id
}

async function main() {
  const filePath = join(process.cwd(), 'RENOVACIONES DAGON JUNIO 2027 (1).xlsx')
  const wb = XLSX.readFile(filePath)
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })
  const dataRows = rows.slice(1).filter(r => r[0] && r[2])

  console.log(`Total filas a procesar: ${dataRows.length}`)

  let creadas = 0
  let errores = 0
  let omitidas = 0

  for (const row of dataRows) {
    const [numeroPolizaRaw, vencimientoSerial, nombreCliente, ramoExcel, formaPagoExcel, ciaExcel] = row

    if (!numeroPolizaRaw || !nombreCliente || !ciaExcel) {
      omitidas++
      continue
    }

    const numeroPoliza = String(numeroPolizaRaw)
    const ramo = RAMO_MAP[ramoExcel] || 'empresa'
    const formaPago = PAGO_MAP[formaPagoExcel] || 'anual'
    const vigenciaFin = typeof vencimientoSerial === 'number' ? excelDateToISO(vencimientoSerial) : new Date().toISOString().split('T')[0]
    const vigenciaInicio = subtractYear(vigenciaFin)

    try {
      const companiaId = await getOrCreateCompania(ciaExcel)
      if (!companiaId) { errores++; continue }

      const clienteId = await getOrCreateCliente(nombreCliente)
      if (!clienteId) { errores++; continue }

      // Evitar duplicados por número de póliza
      const { data: existingPoliza } = await supabase
        .from('polizas')
        .select('id')
        .eq('numero_poliza', numeroPoliza)
        .limit(1)

      if (existingPoliza && existingPoliza.length > 0) {
        omitidas++
        continue
      }

      const { error } = await supabase.from('polizas').insert([{
        cliente_id: clienteId,
        compania_id: companiaId,
        ramo,
        numero_poliza: numeroPoliza,
        vigencia_inicio: vigenciaInicio,
        vigencia_fin: vigenciaFin,
        prima: 0,
        forma_pago: formaPago,
        estatus: 'por-renovar',
        folios: null,
        tramites: 0,
        prima_emitida: 0,
        prima_cobrada: 0,
        fecha_emision: vigenciaInicio,
        nombre_asegurado: nombreCliente,
        numero_recibo: '1/1',
        notas: 'Importado de RENOVACIONES DAGON JUNIO 2027.xlsx - completar prima y datos faltantes',
      }])

      if (error) {
        console.error(`Error insertando póliza ${numeroPoliza}:`, error.message)
        errores++
      } else {
        creadas++
      }
    } catch (err: any) {
      console.error(`Error en fila (${numeroPoliza}):`, err.message)
      errores++
    }
  }

  console.log('\nImportación completada:')
  console.log(`  Pólizas creadas: ${creadas}`)
  console.log(`  Omitidas (duplicadas/incompletas): ${omitidas}`)
  console.log(`  Errores: ${errores}`)
}

main().catch(console.error)
