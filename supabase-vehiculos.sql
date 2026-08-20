-- =====================================================
-- MIGRACIÓN: Tabla de vehículos AXA
-- Catálogo de vehículos para cotización de seguros de autos
-- =====================================================

CREATE TABLE IF NOT EXISTS vehiculos_axa (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amis TEXT,
  clave_cot TEXT,
  marca_descripcion TEXT NOT NULL,
  modelos TEXT,
  tipo TEXT,
  ocupantes TEXT,
  equipamiento TEXT,
  descripcion_detallada TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehiculos_amis ON vehiculos_axa(amis);
CREATE INDEX IF NOT EXISTS idx_vehiculos_clave ON vehiculos_axa(clave_cot);
CREATE INDEX IF NOT EXISTS idx_vehiculos_marca ON vehiculos_axa(marca_descripcion);

ALTER TABLE vehiculos_axa ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en vehiculos_axa" ON vehiculos_axa;
CREATE POLICY "Permitir todo en vehiculos_axa" ON vehiculos_axa FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- Columnas de vehículo en pólizas
-- =====================================================
ALTER TABLE polizas ADD COLUMN IF NOT EXISTS vehiculo_amis TEXT;
ALTER TABLE polizas ADD COLUMN IF NOT EXISTS vehiculo_clave TEXT;
ALTER TABLE polizas ADD COLUMN IF NOT EXISTS vehiculo_descripcion TEXT;
ALTER TABLE polizas ADD COLUMN IF NOT EXISTS vehiculo_modelo TEXT;
