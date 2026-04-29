-- =====================================================
-- MIGRACIÓN: Nuevas tablas y columnas
-- Ejecutar en Supabase → SQL Editor
-- =====================================================

-- 1. Columna telefonos en clientes (JSONB)
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS telefonos JSONB;

-- 2. Nuevas columnas en pólizas para días de gracia y recibos
ALTER TABLE polizas ADD COLUMN IF NOT EXISTS dias_gracia_primer_recibo INTEGER;
ALTER TABLE polizas ADD COLUMN IF NOT EXISTS dias_gracia_subsecuentes INTEGER;
ALTER TABLE polizas ADD COLUMN IF NOT EXISTS primer_recibo DECIMAL(10,2);
ALTER TABLE polizas ADD COLUMN IF NOT EXISTS recibos_subsecuentes DECIMAL(10,2);
-- Migrar datos existentes (dias_gracia → dias_gracia_primer_recibo si existía)
-- ALTER TABLE polizas ADD COLUMN IF NOT EXISTS dias_gracia INTEGER; -- ya existía?

-- 3. Tabla de Folios
CREATE TABLE IF NOT EXISTS folios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_folio TEXT NOT NULL,
  categoria TEXT NOT NULL,
  subcategoria TEXT NOT NULL,
  movimiento TEXT NOT NULL DEFAULT 'indiv',
  fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
  compania TEXT NOT NULL,
  comentarios TEXT,
  responsable TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_folios_categoria ON folios(categoria);
CREATE INDEX IF NOT EXISTS idx_folios_fecha ON folios(fecha_ingreso);

ALTER TABLE folios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en folios" ON folios;
CREATE POLICY "Permitir todo en folios" ON folios FOR ALL USING (true) WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_folios_updated_at') THEN
    CREATE TRIGGER update_folios_updated_at
    BEFORE UPDATE ON folios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 4. Tabla de Siniestros
CREATE TABLE IF NOT EXISTS siniestros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_folio TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'membresia',
  movimiento TEXT NOT NULL DEFAULT 'indiv',
  fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
  compania TEXT NOT NULL,
  comentarios TEXT,
  responsable TEXT,
  visto_bueno BOOLEAN DEFAULT FALSE,
  fecha_visto_bueno DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_siniestros_tipo ON siniestros(tipo);
CREATE INDEX IF NOT EXISTS idx_siniestros_visto_bueno ON siniestros(visto_bueno);

ALTER TABLE siniestros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en siniestros" ON siniestros;
CREATE POLICY "Permitir todo en siniestros" ON siniestros FOR ALL USING (true) WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_siniestros_updated_at') THEN
    CREATE TRIGGER update_siniestros_updated_at
    BEFORE UPDATE ON siniestros
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
