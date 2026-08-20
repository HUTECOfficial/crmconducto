# Instrucciones para Configurar Supabase - CRM Seguros

## 🚀 PASO ÚNICO: Ejecutar el Script SQL

### 1. Ir a Supabase SQL Editor

1. Abre tu navegador y ve a: **https://mnrfsdrjadretxesjxhu.supabase.co**
2. Inicia sesión si es necesario
3. En el menú lateral izquierdo, haz clic en **SQL Editor**
4. Haz clic en **+ New query**

### 2. Copiar y Ejecutar el Script

1. Abre el archivo `supabase-schema.sql` en tu editor
2. **Copia TODO el contenido** (Ctrl+A, Ctrl+C)
3. Pégalo en el SQL Editor de Supabase
4. Haz clic en el botón **Run** (o presiona Ctrl+Enter)

### 3. Verificar que Todo se Creó Correctamente

Ve a **Table Editor** en el menú lateral y verifica que existan estas tablas:
- ✅ `clientes` (con 5 clientes de ejemplo)
- ✅ `polizas`
- ✅ `prospectos`
- ✅ `companias` (con 10 aseguradoras)
- ✅ `pagos`
- ✅ `usuarios` (con Mauricio Portillo como admin)
- ✅ `eventos` (para el calendario)

## 2. Verificar las Tablas

1. Ve a **Table Editor** en el menú lateral
2. Deberías ver todas las tablas creadas
3. Verifica que cada tabla tenga las columnas correctas

## 3. Insertar Datos Iniciales de Compañías

Ejecuta este SQL para agregar las compañías de seguros:

```sql
INSERT INTO companias (nombre, color, logo) VALUES
('GNP Seguros', '#E31937', NULL),
('AXA Seguros', '#00008F', NULL),
('Qualitas', '#00A651', NULL),
('MAPFRE', '#C8102E', NULL),
('Zurich', '#0066CC', NULL),
('HDI Seguros', '#E30613', NULL),
('Banorte Seguros', '#E2001A', NULL),
('Metlife', '#0066B2', NULL);
```

## 4. Insertar Usuario Administrador

```sql
INSERT INTO usuarios (nombre, email, rol, activo) VALUES
('Mauricio Portillo', 'admin@crm.com', 'administrador', true);
```

## 5. Configuración de Seguridad (Row Level Security)

Las políticas de seguridad ya están configuradas para permitir todas las operaciones.
Si necesitas restringir el acceso más adelante, puedes modificar las políticas en:
**Authentication > Policies**

## 6. Migración de Datos Existentes (Opcional)

Si tienes datos en localStorage que quieres migrar a Supabase:

1. Los datos actuales se encuentran en los archivos:
   - `/data/clientes.ts`
   - `/data/polizas.ts`
   - `/data/prospectos.ts`
   - `/data/companias.ts`

2. Puedes crear un script de migración o insertar manualmente los datos importantes

## 4. Uso en la Aplicación

La aplicación usa un **contexto global de Supabase** que proporciona acceso a todos los datos:

```typescript
import { useSupabase } from '@/contexts/supabase-context'

function MiComponente() {
  const { 
    // Clientes
    clientes, loadingClientes, agregarCliente, actualizarCliente, eliminarCliente,
    
    // Compañías
    companias, loadingCompanias,
    
    // Pólizas
    polizas, loadingPolizas, agregarPoliza, actualizarPoliza, eliminarPoliza,
    
    // Prospectos
    prospectos, loadingProspectos, agregarProspecto, actualizarProspecto, eliminarProspecto,
    
    // Eventos del Calendario
    eventos, loadingEventos, agregarEvento, actualizarEvento, eliminarEvento,
    
    // Refrescar todos los datos
    refetchAll
  } = useSupabase()
  
  // Los datos se cargan automáticamente al iniciar
  if (loadingClientes) return <div>Cargando...</div>
  
  // Agregar un nuevo cliente
  const handleAgregar = async () => {
    const id = await agregarCliente({
      nombre: "Juan Pérez",
      telefono: "5551234567",
      email: "juan@email.com",
      fechaRegistro: new Date().toISOString().split('T')[0],
      estatus: "activo"
    })
    console.log('Cliente creado con ID:', id)
  }
  
  return <div>{/* Tu UI aquí */}</div>
}
```

## 8. Variables de Entorno (Opcional pero Recomendado)

Para mayor seguridad, crea un archivo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://mnrfsdrjadretxesjxhu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Y actualiza `/lib/supabase.ts` para usar estas variables:

```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
```

## 5. Calendario con Colores de Prioridad

El calendario ahora muestra eventos con colores según su prioridad:

| Color | Prioridad | Significado |
|-------|-----------|-------------|
| 🔴 Rojo | Alta | Urgente - Requiere atención inmediata |
| 🟡 Amarillo | Media | Atención - Próximo a vencer |
| 🟢 Verde | Baja | Normal - Sin urgencia |

El calendario muestra automáticamente:
- **Eventos manuales** creados por el usuario
- **Renovaciones de pólizas** próximas a vencer (60 días)
- **Recordatorios** de pólizas marcados

## 6. Checklist de Verificación

Después de ejecutar el script SQL, verifica:

- [ ] ✅ Las tablas aparecen en Table Editor
- [ ] ✅ La tabla `companias` tiene 10 aseguradoras
- [ ] ✅ La tabla `usuarios` tiene a Mauricio Portillo
- [ ] ✅ La tabla `clientes` tiene 5 clientes de ejemplo
- [ ] ✅ La aplicación carga sin errores
- [ ] ✅ Puedes crear un nuevo cliente
- [ ] ✅ Puedes crear una nueva póliza
- [ ] ✅ El calendario muestra eventos

## 7. Solución de Problemas

### Error: "relation does not exist"
- El script SQL no se ejecutó correctamente
- Vuelve a ejecutar el script completo

### Error: "permission denied"
- Las políticas RLS no se crearon
- Ejecuta solo la sección de políticas del script

### Los datos no aparecen
- Verifica la consola del navegador (F12)
- Asegúrate de que las tablas tienen datos
- Refresca la página

### Error de conexión
- Verifica que la URL de Supabase sea correcta
- Verifica que la API key sea correcta
- Revisa `/lib/supabase.ts`

## 8. Archivos Importantes

| Archivo | Descripción |
|---------|-------------|
| `/lib/supabase.ts` | Cliente de Supabase |
| `/contexts/supabase-context.tsx` | Contexto global con todas las operaciones |
| `/supabase-schema.sql` | Script SQL completo |
| `/app/calendario/page.tsx` | Calendario con colores de prioridad |

## 9. Credenciales (Ya Configuradas)

```
URL: https://mnrfsdrjadretxesjxhu.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Las credenciales ya están configuradas en `/lib/supabase.ts`
