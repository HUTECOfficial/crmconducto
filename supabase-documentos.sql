-- ============================================================
-- EJECUTAR ESTE SQL EN SUPABASE → SQL Editor
-- ============================================================

-- 1. Tabla de documentos por cliente
CREATE TABLE IF NOT EXISTS cliente_documentos (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id   UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  nombre       TEXT NOT NULL,
  tipo         TEXT NOT NULL DEFAULT 'application/octet-stream',
  tamano       BIGINT NOT NULL DEFAULT 0,
  url          TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cliente_documentos_cliente ON cliente_documentos(cliente_id);

-- 2. Storage bucket público "documentos-clientes"
-- (Ejecutar en SQL Editor de Supabase)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos-clientes', 'documentos-clientes', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Política: cualquiera puede subir archivos (ajustar según tus reglas de seguridad)
CREATE POLICY "Subir documentos clientes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documentos-clientes');

-- 4. Política: cualquiera puede leer archivos
CREATE POLICY "Leer documentos clientes"
ON storage.objects FOR SELECT
USING (bucket_id = 'documentos-clientes');

-- 5. Política: cualquiera puede eliminar archivos
CREATE POLICY "Eliminar documentos clientes"
ON storage.objects FOR DELETE
USING (bucket_id = 'documentos-clientes');

-- 6. RLS en la tabla
ALTER TABLE cliente_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso total cliente_documentos"
ON cliente_documentos FOR ALL
USING (true)
WITH CHECK (true);
