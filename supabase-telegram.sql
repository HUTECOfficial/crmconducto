-- =====================================================
-- CONI EN TELEGRAM (2026-11-03)
-- Ejecutar en Supabase → SQL Editor, completo. Se puede volver a ejecutar.
--
-- Tablas del bot. Sólo las usa el servidor con la llave de servicio
-- (SUPABASE_SERVICE_ROLE_KEY): RLS activo y sin políticas, así la clave pública de la
-- app no puede leerlas ni escribirlas (nadie puede vincular un Telegram ajeno).
-- =====================================================

-- Qué chat de Telegram pertenece a qué usuario del CRM.
CREATE TABLE IF NOT EXISTS public.telegram_vinculos (
  telegram_chat_id BIGINT PRIMARY KEY,
  usuario_email TEXT NOT NULL,
  telegram_usuario TEXT,
  telegram_nombre TEXT,
  resumen_diario BOOLEAN NOT NULL DEFAULT TRUE,
  vinculado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_telegram_vinculos_email ON public.telegram_vinculos(usuario_email);

-- Códigos de un solo uso para vincular (se generan en el CRM con la contraseña).
CREATE TABLE IF NOT EXISTS public.telegram_codigos (
  codigo TEXT PRIMARY KEY,
  usuario_email TEXT NOT NULL,
  expira_en TIMESTAMP WITH TIME ZONE NOT NULL,
  usado_en TIMESTAMP WITH TIME ZONE
);

-- Últimos mensajes de cada chat (contexto de la conversación) y la última foto recibida.
CREATE TABLE IF NOT EXISTS public.telegram_conversaciones (
  telegram_chat_id BIGINT PRIMARY KEY,
  mensajes JSONB NOT NULL DEFAULT '[]'::JSONB,
  foto_file_id TEXT,
  foto_recibida_en TIMESTAMP WITH TIME ZONE,
  actualizado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tareas que Coni propone y que el usuario confirma o cancela con botones.
CREATE TABLE IF NOT EXISTS public.telegram_acciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_chat_id BIGINT NOT NULL,
  usuario_email TEXT NOT NULL,
  tipo TEXT NOT NULL,
  datos JSONB NOT NULL,
  resumen TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  resultado TEXT,
  creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  resuelto_en TIMESTAMP WITH TIME ZONE,
  CONSTRAINT telegram_acciones_tipo_check CHECK (tipo IN ('comentario', 'recordatorio', 'pago')),
  CONSTRAINT telegram_acciones_estado_check CHECK (estado IN ('pendiente', 'confirmada', 'cancelada', 'fallida', 'expirada'))
);
CREATE INDEX IF NOT EXISTS idx_telegram_acciones_chat ON public.telegram_acciones(telegram_chat_id, creado_en DESC);

-- Telegram reintenta un mensaje si no recibe respuesta: así cada uno se procesa una vez.
CREATE TABLE IF NOT EXISTS public.telegram_updates (
  update_id BIGINT PRIMARY KEY,
  recibido_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.telegram_vinculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_codigos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_conversaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_acciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_updates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.telegram_vinculos, public.telegram_codigos, public.telegram_conversaciones,
  public.telegram_acciones, public.telegram_updates FROM anon, authenticated;

-- Comprobación
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename LIKE 'telegram_%' ORDER BY 1;
