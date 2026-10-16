-- ============================================================
-- Ramos/grupos, comisiones y fecha del valor UDI
-- Ejecutar en Supabase → SQL Editor DESPUÉS de supabase-cobranza-validacion.sql
-- y ANTES de desplegar el código.
-- ============================================================

-- 1. Pólizas: grupo o colectividad y % de comisión.
--    Ramos nuevos ('danos', 'accidentes-personales') no requieren cambio: ramo es TEXT.
ALTER TABLE polizas
  ADD COLUMN IF NOT EXISTS grupo TEXT,
  ADD COLUMN IF NOT EXISTS porcentaje_comision NUMERIC(5, 2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'polizas_porcentaje_comision_check'
  ) THEN
    ALTER TABLE polizas
      ADD CONSTRAINT polizas_porcentaje_comision_check
      CHECK (porcentaje_comision IS NULL OR (porcentaje_comision >= 0 AND porcentaje_comision <= 100));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_polizas_ramo_grupo ON polizas(ramo, grupo);

-- 2. Pagos: fecha del valor UDI aplicado (la fecha de pago).
ALTER TABLE pagos
  ADD COLUMN IF NOT EXISTS fecha_valor_udi DATE;

UPDATE pagos
SET fecha_valor_udi = fecha_pago
WHERE valor_udi IS NOT NULL AND fecha_valor_udi IS NULL;

-- 3. Comisiones: una por recibo validado.
CREATE TABLE IF NOT EXISTS comisiones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poliza_id UUID NOT NULL REFERENCES polizas(id) ON DELETE CASCADE,
  pago_id UUID NOT NULL REFERENCES pagos(id) ON DELETE CASCADE,
  vendedor_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  numero_recibo INTEGER NOT NULL DEFAULT 1,
  anualidad INTEGER NOT NULL DEFAULT 1,
  base NUMERIC(18, 2) NOT NULL CHECK (base >= 0),
  porcentaje NUMERIC(5, 2) NOT NULL CHECK (porcentaje >= 0 AND porcentaje <= 100),
  monto NUMERIC(18, 2) NOT NULL CHECK (monto >= 0),
  estatus TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estatus IN ('pendiente', 'pagada', 'cancelada', 'por_revertir')),
  generada_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  pagada_en DATE,
  referencia_pago TEXT,
  cancelada_en TIMESTAMP WITH TIME ZONE,
  motivo_cancelacion TEXT,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Evita comisiones duplicadas: una sola comisión pendiente o pagada por recibo.
-- Una comisión "por_revertir" no bloquea la del mismo recibo si se vuelve a pagar y validar.
CREATE UNIQUE INDEX IF NOT EXISTS idx_comisiones_pago_activa ON comisiones(pago_id) WHERE estatus IN ('pendiente', 'pagada');
CREATE INDEX IF NOT EXISTS idx_comisiones_poliza ON comisiones(poliza_id);
CREATE INDEX IF NOT EXISTS idx_comisiones_estatus ON comisiones(estatus);

ALTER TABLE comisiones ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'comisiones' AND policyname = 'Acceso total comisiones'
  ) THEN
    CREATE POLICY "Acceso total comisiones" ON comisiones FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
