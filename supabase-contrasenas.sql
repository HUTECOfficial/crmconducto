-- =====================================================
-- Contraseñas del CRM
-- Las contraseñas se guardan sólo como hash bcrypt en una tabla que la app no puede leer;
-- se verifican dentro de la base con la función verificar_contrasena.
-- Correr ANTES de publicar el código que pide contraseña.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.usuarios_credenciales (
  email TEXT PRIMARY KEY REFERENCES public.usuarios(email) ON UPDATE CASCADE ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sin políticas: nadie puede leer ni escribir la tabla desde la app (anon/authenticated).
ALTER TABLE public.usuarios_credenciales ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.usuarios_credenciales FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.verificar_contrasena(p_email TEXT, p_password TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios_credenciales c
    JOIN public.usuarios u ON u.email = c.email
    WHERE lower(c.email) = lower(trim(p_email))
      AND u.activo
      AND c.password_hash = crypt(p_password, c.password_hash)
  );
$$;

REVOKE ALL ON FUNCTION public.verificar_contrasena(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verificar_contrasena(TEXT, TEXT) TO anon, authenticated;

-- Hashes bcrypt de las contraseñas iniciales (las contraseñas no están en este archivo).
INSERT INTO public.usuarios_credenciales (email, password_hash) VALUES
  ('admin@crm.com', '$2a$10$D0TLETxhhW14CVXWin4xe.6Mg0WWdcOEMeM3BQFEKVwIU2VjT6Y4e'),
  ('javier@crm.com', '$2a$10$oxAa8WM/bkdxpalYzk0gSe5ure2HnE1OgJXgzv8VmzPP9bWmR9pV6'),
  ('montse@crm.com', '$2a$10$.oIloZ6w6dxC8/uPa.1aNuqOpuieSPimRVR2nurrxpy2vxFq8P0wK'),
  ('dani@crm.com', '$2a$10$BldKWA..P3GMNIQpkgfFK.Jv4Hov4ukoCLOpE8cWt/8QL2SHFEVPO'),
  ('maggie@crm.com', '$2a$10$WQ19T0wqHiFJzehy23Oez.0/7RUpKd0E01oAqDqjkB/vUDUexO6FK'),
  ('gael@crm.com', '$2a$10$9qQ7vB9joz8.IH82HymOleaEph5iATHx5crhc07imJicHXzWdik6a')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, actualizado_en = now();

-- Para cambiar la contraseña de alguien más adelante (desde el SQL Editor):
-- UPDATE public.usuarios_credenciales
--   SET password_hash = crypt('NUEVA_CONTRASEÑA', gen_salt('bf', 10)), actualizado_en = now()
--   WHERE email = 'correo@crm.com';
