-- =====================================================
-- Face ID / Touch ID (passkeys WebAuthn) para el login del CRM
-- Requiere haber corrido antes supabase-contrasenas.sql (usa verificar_contrasena).
-- Las tablas no se pueden leer ni escribir desde la app; todo pasa por estas funciones.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Llave pública de cada dispositivo registrado (la llave privada nunca sale del teléfono/computadora).
CREATE TABLE IF NOT EXISTS public.usuarios_passkeys (
  credential_id TEXT PRIMARY KEY,
  email TEXT NOT NULL REFERENCES public.usuarios(email) ON UPDATE CASCADE ON DELETE CASCADE,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  transports TEXT[] NOT NULL DEFAULT '{}',
  dispositivo TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_uso TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_usuarios_passkeys_email ON public.usuarios_passkeys(email);

-- Retos de un solo uso: cada intento de registro o de ingreso firma un reto distinto.
CREATE TABLE IF NOT EXISTS public.passkey_retos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge TEXT NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.usuarios_passkeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passkey_retos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.usuarios_passkeys FROM anon, authenticated;
REVOKE ALL ON public.passkey_retos FROM anon, authenticated;

-- Crea un reto aleatorio (base64url) y limpia los vencidos.
CREATE OR REPLACE FUNCTION public.crear_reto_passkey()
RETURNS TABLE (id UUID, challenge TEXT)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  DELETE FROM public.passkey_retos r WHERE r.creado_en < now() - interval '10 minutes';
  RETURN QUERY
    INSERT INTO public.passkey_retos (challenge)
    VALUES (translate(encode(gen_random_bytes(32), 'base64'), '+/=', '-_'))
    RETURNING passkey_retos.id, passkey_retos.challenge;
END;
$$;

-- Devuelve el reto y lo borra: sólo se puede usar una vez y dura 5 minutos.
CREATE OR REPLACE FUNCTION public.consumir_reto_passkey(p_id UUID)
RETURNS TEXT
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  DELETE FROM public.passkey_retos r
  WHERE r.id = p_id AND r.creado_en > now() - interval '5 minutes'
  RETURNING r.challenge;
$$;

-- Registrar un dispositivo exige la contraseña correcta del usuario.
CREATE OR REPLACE FUNCTION public.registrar_passkey(
  p_email TEXT,
  p_password TEXT,
  p_credential_id TEXT,
  p_public_key TEXT,
  p_counter BIGINT,
  p_transports TEXT[],
  p_dispositivo TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.verificar_contrasena(p_email, p_password) THEN
    RETURN FALSE;
  END IF;
  INSERT INTO public.usuarios_passkeys (credential_id, email, public_key, counter, transports, dispositivo)
  VALUES (p_credential_id, lower(trim(p_email)), p_public_key, COALESCE(p_counter, 0), COALESCE(p_transports, '{}'), p_dispositivo)
  ON CONFLICT (credential_id) DO UPDATE
    SET email = EXCLUDED.email, public_key = EXCLUDED.public_key, counter = EXCLUDED.counter,
        transports = EXCLUDED.transports, dispositivo = EXCLUDED.dispositivo;
  RETURN TRUE;
END;
$$;

-- Llave pública de un dispositivo para verificar su firma (sólo usuarios activos).
CREATE OR REPLACE FUNCTION public.obtener_passkey(p_credential_id TEXT)
RETURNS TABLE (email TEXT, public_key TEXT, counter BIGINT, transports TEXT[])
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT p.email, p.public_key, p.counter, p.transports
  FROM public.usuarios_passkeys p
  JOIN public.usuarios u ON u.email = p.email
  WHERE p.credential_id = p_credential_id AND u.activo;
$$;

CREATE OR REPLACE FUNCTION public.actualizar_uso_passkey(p_credential_id TEXT, p_counter BIGINT)
RETURNS VOID
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  UPDATE public.usuarios_passkeys
  SET counter = GREATEST(counter, COALESCE(p_counter, 0)), ultimo_uso = now()
  WHERE credential_id = p_credential_id;
$$;

REVOKE ALL ON FUNCTION public.crear_reto_passkey() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consumir_reto_passkey(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.registrar_passkey(TEXT, TEXT, TEXT, TEXT, BIGINT, TEXT[], TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.obtener_passkey(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.actualizar_uso_passkey(TEXT, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crear_reto_passkey() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consumir_reto_passkey(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_passkey(TEXT, TEXT, TEXT, TEXT, BIGINT, TEXT[], TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.obtener_passkey(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.actualizar_uso_passkey(TEXT, BIGINT) TO anon, authenticated;

-- Para quitar Face ID de una persona (por ejemplo si pierde su teléfono):
-- DELETE FROM public.usuarios_passkeys WHERE email = 'correo@crm.com';
