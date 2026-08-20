ALTER TABLE polizas
  ADD COLUMN IF NOT EXISTS vendedor_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS renovacion_estado TEXT NOT NULL DEFAULT 'sin_iniciar',
  ADD COLUMN IF NOT EXISTS renovada_desde_id UUID REFERENCES polizas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS renovada_a_id UUID REFERENCES polizas(id) ON DELETE SET NULL;

UPDATE polizas
SET renovacion_estado = 'pendiente'
WHERE estatus = 'por-renovar'
  AND renovacion_estado = 'sin_iniciar';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'polizas_renovacion_estado_check'
  ) THEN
    ALTER TABLE polizas
      ADD CONSTRAINT polizas_renovacion_estado_check
      CHECK (renovacion_estado IN ('sin_iniciar', 'pendiente', 'en_proceso', 'renovada', 'cancelada'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_polizas_vendedor_id ON polizas(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_polizas_renovacion_estado ON polizas(renovacion_estado);
CREATE INDEX IF NOT EXISTS idx_polizas_renovada_desde_id ON polizas(renovada_desde_id);

CREATE TABLE IF NOT EXISTS renovaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poliza_origen_id UUID NOT NULL REFERENCES polizas(id) ON DELETE RESTRICT,
  poliza_renovada_id UUID REFERENCES polizas(id) ON DELETE SET NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  estatus_poliza_anterior TEXT NOT NULL,
  iniciada_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  completada_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  cancelada_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  motivo_cancelacion TEXT,
  iniciada_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completada_en TIMESTAMP WITH TIME ZONE,
  cancelada_en TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT renovaciones_estado_check CHECK (estado IN ('pendiente', 'en_proceso', 'renovada', 'cancelada'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_renovaciones_activas_por_poliza
  ON renovaciones(poliza_origen_id)
  WHERE estado IN ('pendiente', 'en_proceso');
CREATE INDEX IF NOT EXISTS idx_renovaciones_origen ON renovaciones(poliza_origen_id, iniciada_en DESC);
CREATE INDEX IF NOT EXISTS idx_renovaciones_renovada ON renovaciones(poliza_renovada_id);

CREATE TABLE IF NOT EXISTS poliza_historial (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poliza_id UUID NOT NULL REFERENCES polizas(id) ON DELETE RESTRICT,
  tipo_cambio TEXT NOT NULL,
  campo TEXT,
  valor_anterior JSONB,
  valor_nuevo JSONB,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  usuario_nombre TEXT,
  usuario_email TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_poliza_historial_poliza_fecha
  ON poliza_historial(poliza_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_poliza_historial_tipo
  ON poliza_historial(tipo_cambio);

ALTER TABLE pagos
  ALTER COLUMN metodo_pago DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS numero_recibo INTEGER,
  ADD COLUMN IF NOT EXISTS total_recibos INTEGER,
  ADD COLUMN IF NOT EXISTS fecha_emision DATE,
  ADD COLUMN IF NOT EXISTS fecha_limite DATE,
  ADD COLUMN IF NOT EXISTS cancelado_en TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS cancelado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS motivo_cancelacion TEXT;

UPDATE pagos
SET fecha_emision = COALESCE(fecha_emision, (created_at AT TIME ZONE 'America/Mexico_City')::DATE),
    fecha_limite = COALESCE(fecha_limite, COALESCE(fecha_emision, (created_at AT TIME ZONE 'America/Mexico_City')::DATE) + 30)
WHERE fecha_emision IS NULL OR fecha_limite IS NULL;

WITH configuracion AS (
  SELECT
    p.*,
    GREATEST(
      1,
      CASE
        WHEN COALESCE(p.numero_recibo, '') ~ '^\d+/\d+$' THEN SPLIT_PART(p.numero_recibo, '/', 2)::INTEGER
        WHEN p.forma_pago = 'mensual' THEN 12
        WHEN p.forma_pago = 'trimestral' THEN 4
        WHEN p.forma_pago = 'semestral' THEN 2
        ELSE 1
      END
    ) AS total_recibos_calculado,
    CASE
      WHEN p.forma_pago = 'mensual' THEN 1
      WHEN p.forma_pago = 'trimestral' THEN 3
      WHEN p.forma_pago = 'semestral' THEN 6
      ELSE 12
    END AS meses_periodo,
    COALESCE(NULLIF(p.prima_total, 0), NULLIF(p.prima_emitida, 0), p.prima, 0)::NUMERIC AS prima_total_calculada
  FROM polizas p
  WHERE NOT EXISTS (SELECT 1 FROM pagos pg WHERE pg.poliza_id = p.id)
), grupos AS (
  SELECT
    configuracion.*,
    CASE
      WHEN COALESCE(prima_cobrada, 0) >= prima_total_calculada AND prima_total_calculada > 0 THEN total_recibos_calculado
      WHEN COALESCE(prima_cobrada, 0) > 0 THEN LEAST(
        total_recibos_calculado,
        GREATEST(
          1,
          CASE
            WHEN COALESCE(numero_recibo, '') ~ '^\d+/\d+$' THEN SPLIT_PART(numero_recibo, '/', 1)::INTEGER - 1
            ELSE 1
          END
        )
      )
      ELSE 0
    END AS recibos_pagados
  FROM configuracion
), calendario AS (
  SELECT grupos.*, serie.numero_recibo_generado
  FROM grupos
  CROSS JOIN LATERAL GENERATE_SERIES(1, grupos.total_recibos_calculado) AS serie(numero_recibo_generado)
), importes AS (
  SELECT
    calendario.*,
    CASE
      WHEN numero_recibo_generado <= recibos_pagados THEN COALESCE(prima_cobrada, 0)::NUMERIC
      ELSE GREATEST(0, prima_total_calculada - COALESCE(prima_cobrada, 0))::NUMERIC
    END AS total_grupo,
    CASE
      WHEN numero_recibo_generado <= recibos_pagados THEN NULLIF(recibos_pagados, 0)
      ELSE NULLIF(total_recibos_calculado - recibos_pagados, 0)
    END AS cantidad_grupo,
    CASE
      WHEN numero_recibo_generado <= recibos_pagados THEN numero_recibo_generado
      ELSE numero_recibo_generado - recibos_pagados
    END AS indice_grupo
  FROM calendario
)
INSERT INTO pagos (
  poliza_id,
  cliente_id,
  monto,
  fecha_pago,
  metodo_pago,
  estatus,
  notas,
  numero_recibo,
  total_recibos,
  fecha_emision,
  fecha_limite
)
SELECT
  id,
  cliente_id,
  CASE
    WHEN indice_grupo = cantidad_grupo THEN total_grupo - ROUND(total_grupo / cantidad_grupo, 2) * (cantidad_grupo - 1)
    ELSE ROUND(total_grupo / cantidad_grupo, 2)
  END,
  NULL,
  NULL,
  CASE
    WHEN numero_recibo_generado <= recibos_pagados THEN 'pagado'
    WHEN (vigencia_inicio + ((numero_recibo_generado - 1) * meses_periodo || ' months')::INTERVAL)::DATE + 30 < (NOW() AT TIME ZONE 'America/Mexico_City')::DATE THEN 'vencido'
    ELSE 'pendiente'
  END,
  CASE WHEN numero_recibo_generado <= recibos_pagados THEN 'Importado desde prima_cobrada histórica' ELSE NULL END,
  numero_recibo_generado,
  total_recibos_calculado,
  (vigencia_inicio + ((numero_recibo_generado - 1) * meses_periodo || ' months')::INTERVAL)::DATE,
  (vigencia_inicio + ((numero_recibo_generado - 1) * meses_periodo || ' months')::INTERVAL)::DATE + 30
FROM importes
WHERE cantidad_grupo IS NOT NULL
  AND total_grupo > 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pagos_recibo_activo
  ON pagos(poliza_id, numero_recibo)
  WHERE numero_recibo IS NOT NULL AND estatus <> 'cancelado';
CREATE INDEX IF NOT EXISTS idx_pagos_poliza_estatus_fecha
  ON pagos(poliza_id, estatus, fecha_limite);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha_limite
  ON pagos(fecha_limite)
  WHERE estatus IN ('pendiente', 'vencido');

CREATE TABLE IF NOT EXISTS flotillas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poliza_id UUID NOT NULL UNIQUE REFERENCES polizas(id) ON DELETE RESTRICT,
  nombre TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

INSERT INTO flotillas (poliza_id, nombre)
SELECT id, 'Flotilla ' || numero_poliza
FROM polizas
WHERE ramo = 'flotilla'
ON CONFLICT (poliza_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS flotilla_unidades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flotilla_id UUID NOT NULL REFERENCES flotillas(id) ON DELETE RESTRICT,
  numero_inciso TEXT NOT NULL,
  descripcion TEXT,
  marca TEXT,
  modelo TEXT,
  placas TEXT,
  numero_serie TEXT,
  prima_total DECIMAL(12, 2),
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT flotilla_unidades_inciso_no_vacio CHECK (BTRIM(numero_inciso) <> ''),
  CONSTRAINT flotilla_unidades_inciso_unique UNIQUE (flotilla_id, numero_inciso)
);

CREATE INDEX IF NOT EXISTS idx_flotilla_unidades_flotilla
  ON flotilla_unidades(flotilla_id);
CREATE INDEX IF NOT EXISTS idx_flotilla_unidades_inciso
  ON flotilla_unidades(numero_inciso);
CREATE UNIQUE INDEX IF NOT EXISTS idx_flotilla_unidades_inciso_normalizado
  ON flotilla_unidades(flotilla_id, LOWER(BTRIM(numero_inciso)));

CREATE OR REPLACE FUNCTION asegurar_flotilla_poliza()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ramo = 'flotilla' THEN
    INSERT INTO flotillas (poliza_id, nombre)
    VALUES (NEW.id, 'Flotilla ' || NEW.numero_poliza)
    ON CONFLICT (poliza_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS asegurar_flotilla_poliza_trigger ON polizas;
CREATE TRIGGER asegurar_flotilla_poliza_trigger
AFTER INSERT OR UPDATE OF ramo ON polizas
FOR EACH ROW EXECUTE FUNCTION asegurar_flotilla_poliza();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_renovaciones_updated_at') THEN
    CREATE TRIGGER update_renovaciones_updated_at
    BEFORE UPDATE ON renovaciones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_flotillas_updated_at') THEN
    CREATE TRIGGER update_flotillas_updated_at
    BEFORE UPDATE ON flotillas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_flotilla_unidades_updated_at') THEN
    CREATE TRIGGER update_flotilla_unidades_updated_at
    BEFORE UPDATE ON flotilla_unidades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

ALTER TABLE renovaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE poliza_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE flotillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE flotilla_unidades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo en renovaciones" ON renovaciones;
CREATE POLICY "Permitir todo en renovaciones" ON renovaciones FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir todo en poliza_historial" ON poliza_historial;
CREATE POLICY "Permitir todo en poliza_historial" ON poliza_historial FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir todo en flotillas" ON flotillas;
CREATE POLICY "Permitir todo en flotillas" ON flotillas FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir todo en flotilla_unidades" ON flotilla_unidades;
CREATE POLICY "Permitir todo en flotilla_unidades" ON flotilla_unidades FOR ALL USING (true) WITH CHECK (true);
