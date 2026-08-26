ALTER TABLE polizas
  ADD COLUMN IF NOT EXISTS vigencia_pago_fin DATE,
  ADD COLUMN IF NOT EXISTS vigencia_producto_fin DATE,
  ADD COLUMN IF NOT EXISTS valor_udi_inicial NUMERIC(18, 6);

UPDATE polizas
SET vigencia_pago_fin = COALESCE(
      vigencia_pago_fin,
      (vigencia_inicio + (vigencia_vida_pago || ' years')::INTERVAL)::DATE
    ),
    vigencia_producto_fin = COALESCE(
      vigencia_producto_fin,
      (vigencia_inicio + (COALESCE(vigencia_vida_producto, anos_vida_producto) || ' years')::INTERVAL)::DATE
    )
WHERE ramo = 'vida'
  AND vigencia_vida_pago IS NOT NULL
  AND COALESCE(vigencia_vida_producto, anos_vida_producto) IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'polizas_vigencias_vida_check'
  ) THEN
    ALTER TABLE polizas
      ADD CONSTRAINT polizas_vigencias_vida_check
      CHECK (
        ramo <> 'vida'
        OR vigencia_vida_pago IS NULL
        OR COALESCE(vigencia_vida_producto, anos_vida_producto) IS NULL
        OR vigencia_vida_pago <= COALESCE(vigencia_vida_producto, anos_vida_producto)
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'polizas_valor_udi_inicial_check'
  ) THEN
    ALTER TABLE polizas
      ADD CONSTRAINT polizas_valor_udi_inicial_check
      CHECK (valor_udi_inicial IS NULL OR valor_udi_inicial > 0);
  END IF;
END $$;

ALTER TABLE pagos
  ADD COLUMN IF NOT EXISTS anualidad INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS moneda TEXT NOT NULL DEFAULT 'MXN',
  ADD COLUMN IF NOT EXISTS monto_udis NUMERIC(18, 6),
  ADD COLUMN IF NOT EXISTS valor_udi NUMERIC(18, 6),
  ADD COLUMN IF NOT EXISTS monto_mxn NUMERIC(18, 2),
  ADD COLUMN IF NOT EXISTS anulado_en TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS anulado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT;

UPDATE pagos pg
SET moneda = COALESCE(NULLIF(p.divisas, ''), 'MXN'),
    monto_udis = CASE
      WHEN COALESCE(NULLIF(p.divisas, ''), 'MXN') = 'UDIS' THEN pg.monto
      ELSE pg.monto_udis
    END,
    anualidad = GREATEST(
      1,
      FLOOR(
        (
          (EXTRACT(YEAR FROM pg.fecha_emision)::INTEGER - EXTRACT(YEAR FROM p.vigencia_inicio)::INTEGER) * 12
          + EXTRACT(MONTH FROM pg.fecha_emision)::INTEGER
          - EXTRACT(MONTH FROM p.vigencia_inicio)::INTEGER
        ) / 12.0
      )::INTEGER + 1
    )
FROM polizas p
WHERE p.id = pg.poliza_id
  AND pg.fecha_emision IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pagos_anualidad_check'
  ) THEN
    ALTER TABLE pagos
      ADD CONSTRAINT pagos_anualidad_check CHECK (anualidad >= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pagos_valor_udi_check'
  ) THEN
    ALTER TABLE pagos
      ADD CONSTRAINT pagos_valor_udi_check CHECK (valor_udi IS NULL OR valor_udi > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pagos_monto_udis_check'
  ) THEN
    ALTER TABLE pagos
      ADD CONSTRAINT pagos_monto_udis_check CHECK (monto_udis IS NULL OR monto_udis > 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_polizas_vigencia_pago_fin ON polizas(vigencia_pago_fin);
CREATE INDEX IF NOT EXISTS idx_polizas_vigencia_producto_fin ON polizas(vigencia_producto_fin);
CREATE INDEX IF NOT EXISTS idx_pagos_poliza_anualidad ON pagos(poliza_id, anualidad, numero_recibo);
CREATE INDEX IF NOT EXISTS idx_pagos_anulados ON pagos(anulado_en) WHERE anulado_en IS NOT NULL;
