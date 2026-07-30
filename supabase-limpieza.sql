-- =====================================================
-- LIMPIEZA: Borrar todos los datos de las tablas
-- Ejecutar en Supabase → SQL Editor
-- =====================================================

-- Borrar datos (mantiene la estructura de las tablas)
DELETE FROM vehiculos_axa;
DELETE FROM siniestros;
DELETE FROM folios;
DELETE FROM polizas;
DELETE FROM clientes;
DELETE FROM prospectos;
DELETE FROM eventos;

-- Resetear contadores si hay secuencias
SELECT 'Datos borrados correctamente' as resultado;
