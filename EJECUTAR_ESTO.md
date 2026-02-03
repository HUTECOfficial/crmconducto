# 🚀 EJECUTA ESTE SCRIPT EN SUPABASE

## Pasos:

1. Ve a: **https://mnrfsdrjadretxesjxhu.supabase.co**
2. Abre **SQL Editor**
3. Copia el contenido del archivo **`supabase-update.sql`**
4. Pégalo y haz clic en **Run**

## ¿Qué hace este script?

✅ Crea la tabla `eventos` para el calendario (NUEVA)
✅ Agrega índices para mejor rendimiento
✅ Configura el trigger de updated_at
✅ Habilita seguridad RLS
✅ Inserta datos iniciales:
   - 10 compañías de seguros
   - 3 usuarios (Mauricio Portillo como admin)
   - 5 clientes de ejemplo

## ⚠️ Importante

Este script es seguro de ejecutar:
- No borra nada existente
- No duplica datos (usa `ON CONFLICT DO NOTHING`)
- Solo agrega lo nuevo

## Después de ejecutar

Verifica en **Table Editor** que exista la tabla `eventos`
