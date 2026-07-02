import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  fields.push(current.trim())
  return fields
}

async function main() {
  const csvPath = join(process.cwd(), 'claves_axa_base_completa.csv')
  const content = readFileSync(csvPath, 'utf-8')
  const lines = content.split('\n').filter(l => l.trim().length > 0)

  console.log(`Total líneas: ${lines.length}`)

  // Skip header
  const dataLines = lines.slice(1)
  const BATCH_SIZE = 500

  let inserted = 0
  let errors = 0

  for (let i = 0; i < dataLines.length; i += BATCH_SIZE) {
    const batch = dataLines.slice(i, i + BATCH_SIZE)
    const rows = batch.map(line => {
      const fields = parseCSVLine(line)
      return {
        amis: fields[1] || null,
        clave_cot: fields[2] || null,
        marca_descripcion: fields[3] || null,
        modelos: fields[4] || null,
        tipo: fields[5] || null,
        ocupantes: fields[6] || null,
        equipamiento: fields[7] || null,
        descripcion_detallada: fields[8] || null,
      }
    }).filter(r => r.marca_descripcion)

    const { error } = await supabase.from('vehiculos_axa').insert(rows)

    if (error) {
      console.error(`Error en batch ${i / BATCH_SIZE}:`, error.message)
      errors += rows.length
    } else {
      inserted += rows.length
    }

    process.stdout.write(`\rProgreso: ${Math.min(i + BATCH_SIZE, dataLines.length)}/${dataLines.length}`)
  }

  console.log(`\n\nImportación completada:`)
  console.log(`  Insertados: ${inserted}`)
  console.log(`  Errores: ${errors}`)
}

main().catch(console.error)
