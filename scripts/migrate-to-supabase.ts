// Script para migrar datos a Supabase
// Ejecutar con: npx ts-node scripts/migrate-to-supabase.ts

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mnrfsdrjadretxesjxhu.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ucmZzZHJqYWRyZXR4ZXNqeGh1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDEwMDE1NSwiZXhwIjoyMDg1Njc2MTU1fQ.ZU9ItUOBRmdCCa1NNczMuWJhwRcZJ15gl9L4BDJZ_9U'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Datos de compañías
const companias = [
  { id: "gnp", nombre: "GNP Seguros", color: "#E31937" },
  { id: "axa", nombre: "AXA Seguros", color: "#00008F" },
  { id: "qualitas", nombre: "Qualitas", color: "#00A651" },
  { id: "mapfre", nombre: "MAPFRE", color: "#C8102E" },
  { id: "zurich", nombre: "Zurich", color: "#0066CC" },
  { id: "hdi", nombre: "HDI Seguros", color: "#E30613" },
  { id: "banorte", nombre: "Banorte Seguros", color: "#E2001A" },
  { id: "metlife", nombre: "Metlife", color: "#0066B2" },
]

// Datos de usuarios
const usuarios = [
  { nombre: "Mauricio Portillo", email: "admin@crm.com", rol: "administrador", activo: true },
  { nombre: "María Asesora", email: "maria@crm.com", rol: "asesor", activo: true },
  { nombre: "Juan Administrativo", email: "juan@crm.com", rol: "administrativo", activo: true },
]

async function migrate() {
  console.log('Iniciando migración a Supabase...')

  // 1. Migrar compañías
  console.log('Migrando compañías...')
  for (const compania of companias) {
    const { error } = await supabase
      .from('companias')
      .upsert({ nombre: compania.nombre, color: compania.color }, { onConflict: 'nombre' })
    
    if (error) console.error('Error en compañía:', compania.nombre, error.message)
    else console.log('✓ Compañía:', compania.nombre)
  }

  // 2. Migrar usuarios
  console.log('Migrando usuarios...')
  for (const usuario of usuarios) {
    const { error } = await supabase
      .from('usuarios')
      .upsert(usuario, { onConflict: 'email' })
    
    if (error) console.error('Error en usuario:', usuario.nombre, error.message)
    else console.log('✓ Usuario:', usuario.nombre)
  }

  console.log('Migración completada!')
}

migrate().catch(console.error)
