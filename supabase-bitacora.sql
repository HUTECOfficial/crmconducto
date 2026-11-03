-- =====================================================
-- BITÁCORA DE ACTIVIDAD (2026-11-02)
-- Ejecutar en Supabase → SQL Editor, completo. Se puede volver a ejecutar sin duplicar.
--
-- Registra quién consultó, agregó, modificó o eliminó qué y a qué hora.
--  • Altas, cambios y bajas: los registra la base con un trigger en cada tabla, así no se
--    escapa ningún cambio aunque una pantalla no lo reporte. El usuario llega en el
--    encabezado x-crm-usuario que manda la app en cada petición (lib/supabase.ts).
--  • Consultas e inicios de sesión: los manda la app (lib/bitacora.ts).
--  • Lo trabajado hoy antes de existir la bitácora se reconstruye al final del archivo
--    con poliza_historial y las fechas de creación/actualización (origen = 'reconstruido').
--
-- Para cargas masivas desde el SQL Editor sin llenar la bitácora:
--   SET LOCAL crm.sin_bitacora = 'si';   (dentro de la misma transacción)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.bitacora (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  usuario_nombre TEXT,
  usuario_email TEXT,
  usuario_rol TEXT,
  accion TEXT NOT NULL,
  entidad TEXT NOT NULL,
  entidad_id TEXT,
  etiqueta TEXT,
  -- Sin llave foránea: la entrada debe sobrevivir aunque la póliza o el cliente se eliminen.
  poliza_id UUID,
  poliza_numero TEXT,
  cliente_id UUID,
  cliente_nombre TEXT,
  descripcion TEXT,
  cambios JSONB,
  registro JSONB,
  cantidad INTEGER,
  pantalla TEXT,
  ruta TEXT,
  origen TEXT NOT NULL DEFAULT 'app',
  CONSTRAINT bitacora_accion_check CHECK (accion IN ('consulta', 'alta', 'modificacion', 'eliminacion', 'sesion')),
  CONSTRAINT bitacora_origen_check CHECK (origen IN ('app', 'base', 'reconstruido'))
);

CREATE INDEX IF NOT EXISTS idx_bitacora_fecha ON public.bitacora(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bitacora_usuario_fecha ON public.bitacora(usuario_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bitacora_poliza ON public.bitacora(poliza_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bitacora_cliente ON public.bitacora(cliente_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bitacora_entidad ON public.bitacora(entidad, entidad_id);

-- Encabezados que manda la app en cada petición.
CREATE OR REPLACE FUNCTION public.bitacora_encabezado(p_nombre TEXT)
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT NULLIF(trim((NULLIF(current_setting('request.headers', true), '')::json) ->> p_nombre), '')
$$;

-- Completa nombre, rol e id del usuario y fija la hora del servidor.
CREATE OR REPLACE FUNCTION public.bitacora_completar_usuario()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_usuario RECORD;
BEGIN
  IF NEW.origen <> 'reconstruido' THEN
    NEW.created_at := NOW();
    NEW.usuario_email := COALESCE(lower(bitacora_encabezado('x-crm-usuario')), lower(NEW.usuario_email));
    NEW.pantalla := COALESCE(NEW.pantalla, bitacora_encabezado('x-crm-pantalla'));
  END IF;

  IF NEW.usuario_email IS NOT NULL THEN
    SELECT id, nombre, rol INTO v_usuario FROM usuarios WHERE lower(email) = lower(NEW.usuario_email) LIMIT 1;
    IF FOUND THEN
      NEW.usuario_id := COALESCE(NEW.usuario_id, v_usuario.id);
      NEW.usuario_nombre := COALESCE(NEW.usuario_nombre, v_usuario.nombre);
      NEW.usuario_rol := COALESCE(NEW.usuario_rol, v_usuario.rol);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bitacora_completar_usuario ON public.bitacora;
CREATE TRIGGER bitacora_completar_usuario
  BEFORE INSERT ON public.bitacora
  FOR EACH ROW EXECUTE FUNCTION public.bitacora_completar_usuario();

-- Registra cada alta, cambio o baja de las tablas de operación.
CREATE OR REPLACE FUNCTION public.bitacora_registrar_cambio()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_fila JSONB;
  v_anterior JSONB;
  v_cambios JSONB := '{}'::JSONB;
  v_campo TEXT;
  v_valor JSONB;
  v_accion TEXT;
  v_poliza_id UUID;
  v_poliza_numero TEXT;
  v_poliza_cliente UUID;
  v_cliente_id UUID;
  v_cliente_nombre TEXT;
  v_etiqueta TEXT;
BEGIN
  IF current_setting('crm.sin_bitacora', true) = 'si' THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_fila := to_jsonb(OLD);
    v_accion := 'eliminacion';
  ELSIF TG_OP = 'INSERT' THEN
    v_fila := to_jsonb(NEW);
    v_accion := 'alta';
  ELSE
    v_fila := to_jsonb(NEW);
    v_anterior := to_jsonb(OLD);
    v_accion := 'modificacion';
    FOR v_campo, v_valor IN SELECT key, value FROM jsonb_each(v_fila) LOOP
      IF v_campo <> 'updated_at' AND v_valor IS DISTINCT FROM v_anterior -> v_campo THEN
        v_cambios := v_cambios || jsonb_build_object(v_campo, jsonb_build_object('antes', v_anterior -> v_campo, 'despues', v_valor));
      END IF;
    END LOOP;
    -- Un guardado sin cambios reales no ensucia la bitácora.
    IF v_cambios = '{}'::JSONB THEN
      RETURN NULL;
    END IF;
  END IF;

  v_poliza_id := CASE TG_TABLE_NAME
    WHEN 'polizas' THEN (v_fila ->> 'id')::UUID
    WHEN 'renovaciones' THEN (v_fila ->> 'poliza_origen_id')::UUID
    ELSE NULLIF(v_fila ->> 'poliza_id', '')::UUID
  END;
  IF TG_TABLE_NAME = 'flotilla_unidades' THEN
    SELECT poliza_id INTO v_poliza_id FROM flotillas WHERE id = (v_fila ->> 'flotilla_id')::UUID;
  END IF;

  v_cliente_id := CASE TG_TABLE_NAME
    WHEN 'clientes' THEN (v_fila ->> 'id')::UUID
    ELSE NULLIF(v_fila ->> 'cliente_id', '')::UUID
  END;

  IF TG_TABLE_NAME = 'polizas' THEN
    v_poliza_numero := v_fila ->> 'numero_poliza';
  ELSIF v_poliza_id IS NOT NULL THEN
    SELECT numero_poliza, cliente_id INTO v_poliza_numero, v_poliza_cliente FROM polizas WHERE id = v_poliza_id;
    v_cliente_id := COALESCE(v_cliente_id, v_poliza_cliente);
  END IF;

  IF TG_TABLE_NAME = 'clientes' THEN
    v_cliente_nombre := v_fila ->> 'nombre';
  ELSIF v_cliente_id IS NOT NULL THEN
    SELECT nombre INTO v_cliente_nombre FROM clientes WHERE id = v_cliente_id;
  END IF;

  v_etiqueta := CASE TG_TABLE_NAME
    WHEN 'polizas' THEN 'Póliza ' || (v_fila ->> 'numero_poliza')
    WHEN 'pagos' THEN 'Recibo ' || COALESCE(v_fila ->> 'numero_recibo', '?') || COALESCE('/' || (v_fila ->> 'total_recibos'), '')
    WHEN 'comisiones' THEN 'Comisión del recibo ' || COALESCE(v_fila ->> 'numero_recibo', '?')
    WHEN 'renovaciones' THEN 'Renovación'
    WHEN 'flotilla_unidades' THEN 'Inciso ' || COALESCE(v_fila ->> 'numero_inciso', '?')
    WHEN 'siniestros' THEN 'Siniestro folio ' || COALESCE(v_fila ->> 'numero_folio', '?')
    WHEN 'folios' THEN 'Folio ' || COALESCE(v_fila ->> 'numero_folio', '?')
    WHEN 'eventos' THEN v_fila ->> 'titulo'
    ELSE v_fila ->> 'nombre'
  END;

  INSERT INTO bitacora (
    accion, entidad, entidad_id, etiqueta, poliza_id, poliza_numero, cliente_id, cliente_nombre,
    cambios, registro, origen
  ) VALUES (
    v_accion, TG_TABLE_NAME, v_fila ->> 'id', v_etiqueta, v_poliza_id, v_poliza_numero, v_cliente_id, v_cliente_nombre,
    CASE WHEN TG_OP = 'UPDATE' THEN v_cambios END,
    CASE WHEN TG_OP <> 'UPDATE' THEN v_fila END,
    'base'
  );

  RETURN NULL;
END;
$$;

DO $$
DECLARE
  v_tabla TEXT;
BEGIN
  FOREACH v_tabla IN ARRAY ARRAY[
    'clientes', 'polizas', 'pagos', 'comisiones', 'renovaciones', 'flotilla_unidades',
    'siniestros', 'folios', 'eventos', 'prospectos', 'cliente_documentos', 'usuarios', 'companias'
  ] LOOP
    IF to_regclass('public.' || v_tabla) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS bitacora_cambios ON public.%I', v_tabla);
      EXECUTE format(
        'CREATE TRIGGER bitacora_cambios AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.bitacora_registrar_cambio()',
        v_tabla
      );
    END IF;
  END LOOP;
END $$;

-- Seguridad: la app puede leer la bitácora y anotar consultas o sesiones, pero no puede
-- escribir altas/cambios (eso sólo lo hace la base) ni editar o borrar entradas.
ALTER TABLE public.bitacora ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leer bitacora" ON public.bitacora;
CREATE POLICY "Leer bitacora" ON public.bitacora FOR SELECT USING (true);
DROP POLICY IF EXISTS "Registrar consultas en bitacora" ON public.bitacora;
CREATE POLICY "Registrar consultas en bitacora" ON public.bitacora FOR INSERT
  WITH CHECK (accion IN ('consulta', 'sesion') AND origen = 'app');
GRANT SELECT, INSERT ON public.bitacora TO anon, authenticated;
REVOKE UPDATE, DELETE, TRUNCATE ON public.bitacora FROM anon, authenticated;
GRANT USAGE ON SEQUENCE public.bitacora_id_seq TO anon, authenticated;

-- =====================================================
-- RECONSTRUCCIÓN DE LO TRABAJADO HOY (antes de activar la bitácora)
-- Se ejecuta una sola vez: si ya hay entradas reconstruidas no hace nada.
-- =====================================================
DO $$
DECLARE
  v_inicio TIMESTAMP WITH TIME ZONE := date_trunc('day', NOW() AT TIME ZONE 'America/Mexico_City') AT TIME ZONE 'America/Mexico_City';
BEGIN
  IF EXISTS (SELECT 1 FROM bitacora WHERE origen = 'reconstruido') THEN
    RETURN;
  END IF;

  -- 1) Cambios con usuario que ya guardaba el historial de pólizas.
  INSERT INTO bitacora (
    created_at, usuario_id, usuario_nombre, usuario_email, accion, entidad, entidad_id, etiqueta,
    poliza_id, poliza_numero, cliente_id, cliente_nombre, descripcion, cambios, origen
  )
  SELECT
    h.created_at, h.usuario_id, h.usuario_nombre, h.usuario_email,
    CASE WHEN h.tipo_cambio IN ('poliza_creada', 'unidad_flotilla_creada') THEN 'alta' ELSE 'modificacion' END,
    CASE WHEN h.campo = 'recibo' THEN 'pagos' ELSE 'polizas' END,
    h.poliza_id::TEXT, 'Póliza ' || p.numero_poliza, h.poliza_id, p.numero_poliza, p.cliente_id, c.nombre,
    CASE h.tipo_cambio
      WHEN 'poliza_creada' THEN 'Dio de alta la póliza'
      WHEN 'importe_recibo_completado' THEN 'Completó el importe de un recibo'
      WHEN 'pago_registrado' THEN 'Registró un pago'
      WHEN 'pago_validado' THEN 'Validó un pago'
      WHEN 'pago_rechazado' THEN 'Rechazó un pago'
      WHEN 'pago_anulado' THEN 'Anuló un pago'
      WHEN 'renovacion_iniciada' THEN 'Inició la renovación'
      WHEN 'renovacion_completada' THEN 'Completó la renovación'
      WHEN 'renovacion_cancelada' THEN 'Canceló la renovación'
      WHEN 'unidad_flotilla_creada' THEN 'Agregó una unidad a la flotilla'
      WHEN 'unidad_flotilla_actualizada' THEN 'Modificó una unidad de la flotilla'
      WHEN 'unidad_flotilla_desactivada' THEN 'Desactivó una unidad de la flotilla'
    END,
    CASE WHEN h.campo IS NOT NULL AND h.tipo_cambio <> 'poliza_creada'
      THEN jsonb_build_object(h.campo, jsonb_build_object('antes', h.valor_anterior, 'despues', h.valor_nuevo))
    END,
    'reconstruido'
  FROM poliza_historial h
  LEFT JOIN polizas p ON p.id = h.poliza_id
  LEFT JOIN clientes c ON c.id = p.cliente_id
  WHERE h.created_at >= v_inicio;

  -- 2) Registros creados hoy. Lo creado en bloque (20 o más en 10 minutos) es una importación.
  DROP TABLE IF EXISTS _bitacora_creados;
  CREATE TEMP TABLE _bitacora_creados (
    tabla TEXT, id TEXT, etiqueta TEXT, poliza_id UUID, cliente_id UUID, created_at TIMESTAMP WITH TIME ZONE,
    bloque DOUBLE PRECISION, en_bloque BIGINT
  );
  INSERT INTO _bitacora_creados (tabla, id, etiqueta, poliza_id, cliente_id, created_at)
    SELECT 'clientes', id::TEXT, nombre, NULL::UUID, id, created_at FROM clientes WHERE created_at >= v_inicio
    UNION ALL SELECT 'polizas', id::TEXT, 'Póliza ' || numero_poliza, id, cliente_id, created_at FROM polizas WHERE created_at >= v_inicio
    UNION ALL SELECT 'pagos', id::TEXT, NULL, poliza_id, cliente_id, created_at FROM pagos WHERE created_at >= v_inicio
    UNION ALL SELECT 'flotilla_unidades', id::TEXT, NULL, NULL, NULL, created_at FROM flotilla_unidades WHERE created_at >= v_inicio
    UNION ALL SELECT 'companias', id::TEXT, nombre, NULL, NULL, created_at FROM companias WHERE created_at >= v_inicio
    UNION ALL SELECT 'prospectos', id::TEXT, nombre, NULL, NULL, created_at FROM prospectos WHERE created_at >= v_inicio
    UNION ALL SELECT 'eventos', id::TEXT, titulo, poliza_id, cliente_id, created_at FROM eventos WHERE created_at >= v_inicio
    UNION ALL SELECT 'folios', id::TEXT, 'Folio ' || numero_folio, NULL, NULL, created_at FROM folios WHERE created_at >= v_inicio
    UNION ALL SELECT 'siniestros', id::TEXT, 'Siniestro folio ' || numero_folio, NULL, NULL, created_at FROM siniestros WHERE created_at >= v_inicio;
  UPDATE _bitacora_creados t SET bloque = floor(extract(epoch FROM t.created_at) / 600);
  UPDATE _bitacora_creados t SET en_bloque = b.total
    FROM (SELECT tabla, bloque, count(*) AS total FROM _bitacora_creados GROUP BY tabla, bloque) b
    WHERE b.tabla = t.tabla AND b.bloque = t.bloque;

  INSERT INTO bitacora (created_at, accion, entidad, descripcion, cantidad, origen)
  SELECT min(created_at), 'alta', tabla,
    'Importación masiva de ' || to_char(count(*), 'FM999,999') || ' ' || CASE tabla
      WHEN 'clientes' THEN 'clientes' WHEN 'polizas' THEN 'pólizas' WHEN 'pagos' THEN 'recibos'
      WHEN 'flotilla_unidades' THEN 'unidades de flotilla' WHEN 'companias' THEN 'compañías'
      WHEN 'prospectos' THEN 'prospectos' WHEN 'eventos' THEN 'eventos' WHEN 'folios' THEN 'folios'
      ELSE 'siniestros' END,
    count(*), 'reconstruido'
  FROM _bitacora_creados
  WHERE en_bloque >= 20
  GROUP BY tabla, bloque;

  -- Altas sueltas de tablas que no tenían historial (pólizas y recibos ya vienen del paso 1).
  INSERT INTO bitacora (created_at, accion, entidad, entidad_id, etiqueta, poliza_id, cliente_id, descripcion, origen)
  SELECT created_at, 'alta', tabla, id, etiqueta, poliza_id, cliente_id,
    'Alta registrada antes de activar la bitácora (no se guardó quién la hizo)', 'reconstruido'
  FROM _bitacora_creados
  WHERE en_bloque < 20 AND tabla NOT IN ('polizas', 'pagos', 'flotilla_unidades');

  -- 3) Registros modificados hoy después de crearse. Lo modificado en bloque (25 o más en el
  --    mismo segundo) fue un proceso fuera de la app.
  DROP TABLE IF EXISTS _bitacora_editados;
  CREATE TEMP TABLE _bitacora_editados (
    tabla TEXT, id TEXT, etiqueta TEXT, poliza_id UUID, cliente_id UUID, updated_at TIMESTAMP WITH TIME ZONE,
    en_bloque BIGINT
  );
  INSERT INTO _bitacora_editados (tabla, id, etiqueta, poliza_id, cliente_id, updated_at)
    SELECT 'clientes', id::TEXT, nombre, NULL::UUID, id, updated_at FROM clientes WHERE updated_at >= v_inicio AND updated_at > created_at + INTERVAL '2 minutes'
    UNION ALL SELECT 'polizas', id::TEXT, 'Póliza ' || numero_poliza, id, cliente_id, updated_at FROM polizas WHERE updated_at >= v_inicio AND updated_at > created_at + INTERVAL '2 minutes'
    UNION ALL SELECT 'pagos', id::TEXT, NULL, poliza_id, cliente_id, updated_at FROM pagos WHERE updated_at >= v_inicio AND updated_at > created_at + INTERVAL '2 minutes'
    UNION ALL SELECT 'usuarios', id::TEXT, nombre, NULL, NULL, updated_at FROM usuarios WHERE updated_at >= v_inicio AND updated_at > created_at + INTERVAL '2 minutes'
    UNION ALL SELECT 'companias', id::TEXT, nombre, NULL, NULL, updated_at FROM companias WHERE updated_at >= v_inicio AND updated_at > created_at + INTERVAL '2 minutes'
    UNION ALL SELECT 'prospectos', id::TEXT, nombre, NULL, NULL, updated_at FROM prospectos WHERE updated_at >= v_inicio AND updated_at > created_at + INTERVAL '2 minutes'
    UNION ALL SELECT 'eventos', id::TEXT, titulo, poliza_id, cliente_id, updated_at FROM eventos WHERE updated_at >= v_inicio AND updated_at > created_at + INTERVAL '2 minutes'
    UNION ALL SELECT 'folios', id::TEXT, 'Folio ' || numero_folio, NULL, NULL, updated_at FROM folios WHERE updated_at >= v_inicio AND updated_at > created_at + INTERVAL '2 minutes'
    UNION ALL SELECT 'siniestros', id::TEXT, 'Siniestro folio ' || numero_folio, NULL, NULL, updated_at FROM siniestros WHERE updated_at >= v_inicio AND updated_at > created_at + INTERVAL '2 minutes';
  UPDATE _bitacora_editados t SET en_bloque = b.total
    FROM (SELECT tabla, date_trunc('second', updated_at) AS segundo, count(*) AS total FROM _bitacora_editados GROUP BY 1, 2) b
    WHERE b.tabla = t.tabla AND b.segundo = date_trunc('second', t.updated_at);

  INSERT INTO bitacora (created_at, accion, entidad, descripcion, cantidad, origen)
  SELECT min(updated_at), 'modificacion', tabla,
    'Ajuste en bloque de ' || to_char(count(*), 'FM999,999') || ' ' || CASE tabla
      WHEN 'clientes' THEN 'clientes' WHEN 'polizas' THEN 'pólizas' WHEN 'pagos' THEN 'recibos'
      ELSE tabla END || ' (proceso fuera de la app)',
    count(*), 'reconstruido'
  FROM _bitacora_editados
  WHERE en_bloque >= 25
  GROUP BY tabla, date_trunc('second', updated_at);

  -- Cambios sueltos de tablas sin historial (los de pólizas y recibos ya vienen del paso 1).
  INSERT INTO bitacora (created_at, accion, entidad, entidad_id, etiqueta, poliza_id, cliente_id, descripcion, origen)
  SELECT updated_at, 'modificacion', tabla, id, etiqueta, poliza_id, cliente_id,
    'Último cambio antes de activar la bitácora (no se guardó quién ni qué campos)', 'reconstruido'
  FROM _bitacora_editados
  WHERE en_bloque < 25 AND tabla NOT IN ('polizas', 'pagos');

  DROP TABLE IF EXISTS _bitacora_creados;
  DROP TABLE IF EXISTS _bitacora_editados;
END $$;

-- Comprobación: entradas de hoy por origen y acción
SELECT origen, accion, count(*) FROM public.bitacora GROUP BY 1, 2 ORDER BY 1, 2;
