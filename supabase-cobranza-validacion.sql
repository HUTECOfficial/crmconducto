-- ============================================================
-- Cobranza: validación de pagos, comprobantes y fecha de vencimiento real
-- Ejecutar en Supabase → SQL Editor ANTES de desplegar el código.
-- ============================================================

-- 1. Pagos: quién registró, quién validó y comprobante.
--    Flujo: pendiente → por_validar (pago registrado) → pagado (pago validado).
ALTER TABLE pagos
  ADD COLUMN IF NOT EXISTS registrado_en TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS registrado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS validado_en TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS validado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS comprobante_url TEXT,
  ADD COLUMN IF NOT EXISTS comprobante_path TEXT;

-- Los pagos cobrados antes de este cambio se consideran validados.
UPDATE pagos
SET registrado_en = COALESCE(registrado_en, fecha_pago::TIMESTAMP WITH TIME ZONE, updated_at),
    validado_en = COALESCE(validado_en, fecha_pago::TIMESTAMP WITH TIME ZONE, updated_at)
WHERE estatus = 'pagado';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pagos_estatus_check'
  ) THEN
    ALTER TABLE pagos
      ADD CONSTRAINT pagos_estatus_check
      CHECK (estatus IN ('pendiente', 'por_validar', 'pagado', 'vencido', 'cancelado')) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pagos_por_validar ON pagos(poliza_id) WHERE estatus = 'por_validar';

-- 2. Pólizas: columna usada por "Marcar Vencida" que no existía.
ALTER TABLE polizas
  ADD COLUMN IF NOT EXISTS fecha_vencimiento_real DATE;
