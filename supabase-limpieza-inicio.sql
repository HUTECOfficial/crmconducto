-- =====================================================
-- LIMPIEZA PARA EMPEZAR A OPERAR (2026-11-02)
-- Ejecutar en Supabase → SQL Editor, completo y una sola vez.
--
-- BORRA: clientes, pólizas, pagos/recibos, comisiones, historial de pólizas,
--        renovaciones, flotillas y sus unidades, siniestros, folios,
--        documentos de clientes, eventos y prospectos.
-- CONSERVA: usuarios, contraseñas, Face ID, compañías aseguradoras y
--           el catálogo de vehículos AXA.
--
-- Antes de borrar copia todo al esquema respaldo_2026_11_02. Si todo está bien,
-- ese respaldo se puede eliminar después (ver el final del archivo).
-- Si algo falla, no se borra nada (todo va en una transacción).
-- =====================================================

BEGIN;

-- 1) Respaldo dentro de la misma base
CREATE SCHEMA IF NOT EXISTS respaldo_2026_11_02;
CREATE TABLE respaldo_2026_11_02.clientes AS TABLE public.clientes;
CREATE TABLE respaldo_2026_11_02.polizas AS TABLE public.polizas;
CREATE TABLE respaldo_2026_11_02.pagos AS TABLE public.pagos;
CREATE TABLE respaldo_2026_11_02.comisiones AS TABLE public.comisiones;
CREATE TABLE respaldo_2026_11_02.poliza_historial AS TABLE public.poliza_historial;
CREATE TABLE respaldo_2026_11_02.renovaciones AS TABLE public.renovaciones;
CREATE TABLE respaldo_2026_11_02.flotillas AS TABLE public.flotillas;
CREATE TABLE respaldo_2026_11_02.flotilla_unidades AS TABLE public.flotilla_unidades;
CREATE TABLE respaldo_2026_11_02.siniestros AS TABLE public.siniestros;
CREATE TABLE respaldo_2026_11_02.folios AS TABLE public.folios;
CREATE TABLE respaldo_2026_11_02.cliente_documentos AS TABLE public.cliente_documentos;
CREATE TABLE respaldo_2026_11_02.eventos AS TABLE public.eventos;
CREATE TABLE respaldo_2026_11_02.prospectos AS TABLE public.prospectos;
-- El respaldo no debe ser visible desde la app.
REVOKE ALL ON SCHEMA respaldo_2026_11_02 FROM anon, authenticated;

-- 2) Vaciar los datos de operación
TRUNCATE TABLE
  public.comisiones,
  public.pagos,
  public.poliza_historial,
  public.renovaciones,
  public.flotilla_unidades,
  public.flotillas,
  public.siniestros,
  public.folios,
  public.cliente_documentos,
  public.eventos,
  public.prospectos,
  public.polizas,
  public.clientes
RESTART IDENTITY CASCADE;

COMMIT;

-- 3) Comprobación: las primeras filas deben dar 0 y las últimas conservar sus datos
SELECT 'clientes' AS tabla, count(*) FROM public.clientes
UNION ALL SELECT 'polizas', count(*) FROM public.polizas
UNION ALL SELECT 'pagos', count(*) FROM public.pagos
UNION ALL SELECT 'renovaciones', count(*) FROM public.renovaciones
UNION ALL SELECT 'poliza_historial', count(*) FROM public.poliza_historial
UNION ALL SELECT 'flotillas', count(*) FROM public.flotillas
UNION ALL SELECT 'eventos', count(*) FROM public.eventos
UNION ALL SELECT '— conservados —', NULL
UNION ALL SELECT 'usuarios', count(*) FROM public.usuarios
UNION ALL SELECT 'usuarios_credenciales', count(*) FROM public.usuarios_credenciales
UNION ALL SELECT 'companias', count(*) FROM public.companias
UNION ALL SELECT 'vehiculos_axa', count(*) FROM public.vehiculos_axa;

-- Cuando confirmes que ya no necesitas los datos de prueba, borra el respaldo:
-- DROP SCHEMA respaldo_2026_11_02 CASCADE;
