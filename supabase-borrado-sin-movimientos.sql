-- Borrado de pólizas y clientes capturados por error.
-- Sólo se permite cuando la póliza no tiene movimientos: pagos registrados o validados,
-- comisiones pagadas o renovaciones. Lo que tiene movimientos se cancela o se marca inactivo.
-- La bitácora conserva una copia de cada póliza, recibo y cliente eliminado.

CREATE OR REPLACE FUNCTION public.motivo_poliza_con_movimientos(p_poliza UUID)
RETURNS TEXT LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_numero TEXT;
BEGIN
  SELECT numero_poliza INTO v_numero FROM polizas WHERE id = p_poliza;
  IF NOT FOUND THEN
    RETURN 'La póliza no existe';
  END IF;

  IF EXISTS (SELECT 1 FROM pagos WHERE poliza_id = p_poliza AND estatus IN ('pagado', 'por_validar')) THEN
    RETURN format('La póliza %s tiene pagos registrados', v_numero);
  END IF;
  IF EXISTS (SELECT 1 FROM comisiones WHERE poliza_id = p_poliza AND estatus IN ('pagada', 'por_revertir')) THEN
    RETURN format('La póliza %s tiene comisiones pagadas', v_numero);
  END IF;
  IF EXISTS (SELECT 1 FROM renovaciones WHERE poliza_origen_id = p_poliza OR poliza_renovada_id = p_poliza)
     OR EXISTS (SELECT 1 FROM polizas WHERE id = p_poliza AND (renovada_desde_id IS NOT NULL OR renovada_a_id IS NOT NULL)) THEN
    RETURN format('La póliza %s forma parte de una renovación', v_numero);
  END IF;

  RETURN NULL;
END $$;

-- Borra una póliza ya revisada: su historial y flotilla se borran aquí; recibos y comisiones en cascada.
CREATE OR REPLACE FUNCTION public.borrar_poliza_revisada(p_poliza UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM poliza_historial WHERE poliza_id = p_poliza;
  DELETE FROM flotilla_unidades WHERE flotilla_id IN (SELECT id FROM flotillas WHERE poliza_id = p_poliza);
  DELETE FROM flotillas WHERE poliza_id = p_poliza;
  DELETE FROM polizas WHERE id = p_poliza;
END $$;

CREATE OR REPLACE FUNCTION public.eliminar_poliza_sin_movimientos(p_poliza UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_motivo TEXT;
BEGIN
  v_motivo := motivo_poliza_con_movimientos(p_poliza);
  IF v_motivo IS NOT NULL THEN
    RAISE EXCEPTION '%. Cancélala en lugar de borrarla.', v_motivo;
  END IF;
  PERFORM borrar_poliza_revisada(p_poliza);
END $$;

CREATE OR REPLACE FUNCTION public.eliminar_cliente_sin_movimientos(p_cliente UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_poliza UUID;
  v_motivo TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM clientes WHERE id = p_cliente) THEN
    RAISE EXCEPTION 'El cliente no existe';
  END IF;

  -- Primero se revisan todas; si una tiene movimientos no se borra nada.
  FOR v_poliza IN SELECT id FROM polizas WHERE cliente_id = p_cliente LOOP
    v_motivo := motivo_poliza_con_movimientos(v_poliza);
    IF v_motivo IS NOT NULL THEN
      RAISE EXCEPTION '%. Marca al cliente como inactivo en lugar de borrarlo.', v_motivo;
    END IF;
  END LOOP;

  FOR v_poliza IN SELECT id FROM polizas WHERE cliente_id = p_cliente LOOP
    PERFORM borrar_poliza_revisada(v_poliza);
  END LOOP;
  DELETE FROM clientes WHERE id = p_cliente;
END $$;

REVOKE EXECUTE ON FUNCTION public.borrar_poliza_revisada(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.motivo_poliza_con_movimientos(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.eliminar_poliza_sin_movimientos(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.eliminar_cliente_sin_movimientos(UUID) TO anon, authenticated;
