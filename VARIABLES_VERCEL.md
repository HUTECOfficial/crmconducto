# 🚀 Variables de Entorno para Vercel

## Variables Requeridas

Agrega estas variables en **Vercel Dashboard → Settings → Environment Variables**:

### 1. NEXT_PUBLIC_SUPABASE_URL
```
https://mnrfsdrjadretxesjxhu.supabase.co
```

### 2. NEXT_PUBLIC_SUPABASE_ANON_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ucmZzZHJqYWRyZXR4ZXNqeGh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMDAxNTUsImV4cCI6MjA4NTY3NjE1NX0.kAC452FQXZeSyHMB99OnWuTNNJlg_q6GA_0dn9CcgpI
```

---

## 📋 Pasos para Agregar en Vercel

### Opción 1: Desde el Dashboard de Vercel

1. Ve a tu proyecto en Vercel
2. Click en **Settings**
3. Click en **Environment Variables** en el menú lateral
4. Agrega cada variable:

**Variable 1:**
- **Name:** `NEXT_PUBLIC_SUPABASE_URL`
- **Value:** `https://mnrfsdrjadretxesjxhu.supabase.co`
- **Environment:** Selecciona **Production**, **Preview**, y **Development**
- Click **Save**

**Variable 2:**
- **Name:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ucmZzZHJqYWRyZXR4ZXNqeGh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMDAxNTUsImV4cCI6MjA4NTY3NjE1NX0.kAC452FQXZeSyHMB99OnWuTNNJlg_q6GA_0dn9CcgpI`
- **Environment:** Selecciona **Production**, **Preview**, y **Development**
- Click **Save**

5. **Redeploy** tu aplicación para que tome las nuevas variables

---

### Opción 2: Desde la Terminal (Vercel CLI)

Si tienes Vercel CLI instalado:

```bash
# Instalar Vercel CLI (si no lo tienes)
npm i -g vercel

# Login
vercel login

# Agregar variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
# Pega: https://mnrfsdrjadretxesjxhu.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# Pega: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ucmZzZHJqYWRyZXR4ZXNqeGh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMDAxNTUsImV4cCI6MjA4NTY3NjE1NX0.kAC452FQXZeSyHMB99OnWuTNNJlg_q6GA_0dn9CcgpI

# Redeploy
vercel --prod
```

---

## ⚠️ Importante

### ¿Por qué NEXT_PUBLIC_?

Las variables con prefijo `NEXT_PUBLIC_` son **públicas** y se exponen al navegador. Esto es necesario porque:
- Supabase se conecta desde el cliente (navegador)
- La `ANON_KEY` es segura para uso público
- Supabase usa Row Level Security (RLS) para proteger los datos

### Seguridad

✅ **Seguro usar ANON_KEY en el cliente**
- Es la clave pública de Supabase
- Las políticas RLS protegen los datos
- No da acceso directo a la base de datos

❌ **NUNCA expongas:**
- `SERVICE_ROLE_KEY` (esta es privada)
- Contraseñas de base de datos
- Claves privadas

---

## 🔄 Actualizar el Código (Opcional)

Si quieres usar variables de entorno en lugar de hardcodear las credenciales, actualiza `/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Nota:** El código actual ya tiene las credenciales hardcodeadas, así que funciona sin variables de entorno. Pero es mejor práctica usar variables.

---

## ✅ Verificar que Funciona

Después de agregar las variables y redeploy:

1. Ve a tu app en Vercel: `https://tu-app.vercel.app`
2. Abre la consola del navegador (F12)
3. Ve a la pestaña **Network**
4. Deberías ver requests a `mnrfsdrjadretxesjxhu.supabase.co`
5. Si hay datos, ¡funciona! ✅

---

## 🎯 Resumen Rápido

**Solo necesitas 2 variables:**

1. `NEXT_PUBLIC_SUPABASE_URL` = `https://mnrfsdrjadretxesjxhu.supabase.co`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (la clave completa)

**Agrégalas en:** Vercel Dashboard → Settings → Environment Variables

**Redeploy** después de agregarlas.

---

## 📞 Troubleshooting

### Error: "supabaseUrl is required"
- Verifica que las variables estén agregadas
- Asegúrate de haber redeployado
- Verifica que los nombres sean exactos (con NEXT_PUBLIC_)

### Error: "Failed to fetch"
- Verifica que Supabase esté activo
- Revisa que las tablas existan
- Verifica las políticas RLS

### Los datos no aparecen
- Verifica que ejecutaste `supabase-update.sql`
- Revisa que las tablas tengan datos
- Abre la consola del navegador para ver errores

---

## 🚀 Listo para Producción

Una vez agregadas las variables:
- ✅ Tu app se conectará a Supabase
- ✅ Los datos se guardarán en la nube
- ✅ El calendario mostrará eventos
- ✅ Todo funcionará en producción

**¡Tu CRM estará 100% funcional en Vercel!** 🎉
