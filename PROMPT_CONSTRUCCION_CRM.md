# 🚀 Prompt para Construir un CRM de Seguros Completo

## Prompt Principal

```
Quiero que construyas un CRM completo para gestión de seguros con las siguientes características:

## 1. Stack Tecnológico
- Next.js 14 con App Router
- TypeScript
- TailwindCSS para estilos
- shadcn/ui para componentes
- Framer Motion para animaciones
- Supabase como backend (PostgreSQL)
- Sonner para notificaciones toast

## 2. Estructura del Proyecto

### Base de Datos (Supabase)
Crea un schema SQL completo con estas tablas:
- **clientes**: id, nombre, email, telefono, empresa, rfc, direccion, ciudad, estado, codigo_postal, fecha_registro, estatus, notas
- **companias**: id, nombre, color, logo, contacto, telefono, email
- **polizas**: id, cliente_id, compania_id, ramo (autos/vida/gastos-medicos/empresa/hogar/flotilla), numero_poliza, inciso_endoso, nombre_asegurado, vigencia_inicio, vigencia_fin, prima, forma_pago (mensual/trimestral/semestral/anual), tipo_pago (efectivo/transferencia/tarjeta/domiciliacion/cheque), estatus (activa/por-renovar/vencida/cancelada/gracia/rehabilitada), anos_vida_producto (para seguros de vida), notas, comentarios, fechas_recordatorio (fecha1, fecha2, fecha3), marca_actualizacion
- **prospectos**: id, nombre, email, telefono, empresa, etapa (contacto-inicial/calificacion/propuesta/negociacion/cierre), interes (ramo de seguro), prioridad (alta/media/baja), responsable, tags, notas, fecha_contacto, fecha_seguimiento
- **pagos**: id, poliza_id, monto, fecha_pago, metodo_pago, estatus, referencia, notas
- **usuarios**: id, nombre, email, rol (administrador/asesor/administrativo), activo
- **eventos**: id, titulo, descripcion, fecha, hora, tipo (renovacion/pago/cita/recordatorio/otro), prioridad (alta/media/baja), poliza_id, cliente_id, completado

Incluye:
- Triggers para updated_at automático
- Índices para optimización
- Row Level Security (RLS) con políticas permisivas
- Restricciones únicas donde sea necesario

### Contextos y Hooks
Crea un contexto global de Supabase (`/contexts/supabase-context.tsx`) que provea:
- Estados: clientes, companias, polizas, prospectos, eventos, pagos
- Loading states para cada entidad
- Funciones CRUD completas:
  - agregarCliente, actualizarCliente, eliminarCliente
  - agregarPoliza, actualizarPoliza, eliminarPoliza
  - agregarProspecto, actualizarProspecto, eliminarProspecto
  - agregarEvento, actualizarEvento, eliminarEvento
  - refetchAll() para recargar todos los datos

## 3. Páginas y Funcionalidades

### Dashboard Principal (`/`)
- KPIs en tiempo real:
  - Total de clientes activos
  - Pólizas activas
  - Pólizas por renovar (próximos 30 días)
  - Prima total mensual
  - Efectividad de cobranza
- Gráficas de distribución por compañía y ramo
- Lista de actividades pendientes
- Próximas renovaciones

### Clientes (`/clientes`)
- Tabla con todos los clientes
- Filtros por estatus
- Búsqueda por nombre, email, teléfono
- Modal para crear/editar clientes
- Ver pólizas asociadas a cada cliente
- Exportar a Excel

### Pólizas (`/polizas`)
**Características especiales:**
- Formulario con dos modos:
  1. **Cliente Existente**: Seleccionar de lista
  2. **Nuevo Cliente**: Crear cliente y póliza en un solo paso
- **Campo obligatorio**: Tipo de Pago (efectivo/transferencia/tarjeta/domiciliacion/cheque)
- **Para seguros de vida**: Campo "Años de Vida del Producto"
  - Calcular automáticamente número de recibos: años × frecuencia de pago
  - Ejemplo: 10 años × 12 (mensual) = 120 recibos → mostrar "1/120"
- Filtros por: compañía, ramo, estatus
- Tabla con información completa
- Badges de estatus con colores
- Exportar a Excel

### Pólizas Pendientes (`/polizas-pendientes`)
**Funcionalidad clave:**
- Mostrar solo pólizas con pagos pendientes o próximas a vencer
- **Botón "Acción"** en cada póliza con dos opciones:
  1. **Renovar**: 
     - Modal que solicita: motivo (lo que dijo el cliente) + tipo de pago
     - Guardar en comentarios de la póliza
     - Actualizar estatus a "activa"
  2. **Cancelar**:
     - Modal que solicita: motivo de cancelación
     - Guardar en comentarios
     - Actualizar estatus a "cancelada"
- **Recordatorios**: 3 fechas marcables (fecha1, fecha2, fecha3)
  - Botón "Marcar" para cada fecha
  - Guardar en campo fechas_recordatorio de la póliza
- Filtros por estatus y movimiento de dinero
- Badges de prioridad según días para vencer

### Calendario (`/calendario`)
**Características especiales - Colores de Prioridad:**
- 🔴 **Rojo**: Alta prioridad (urgente, ≤7 días para vencer)
- 🟡 **Amarillo**: Media prioridad (atención, ≤30 días)
- 🟢 **Verde**: Baja prioridad (normal, >30 días)

**Eventos automáticos:**
- Renovaciones de pólizas (próximas 60 días) con color según urgencia
- Recordatorios de pólizas marcados (fecha1, fecha2, fecha3)
- Eventos manuales creados por el usuario

**Funcionalidades:**
- Vista de mes (calendario visual con colores)
- Vista de lista (eventos ordenados por fecha)
- Crear eventos personalizados con:
  - Título, descripción, fecha, hora
  - Tipo (renovacion/pago/cita/recordatorio/otro)
  - Prioridad (alta/media/baja) con colores
  - Asociar a cliente/póliza (opcional)
- Filtros por prioridad y tipo
- Marcar eventos como completados
- KPIs de eventos pendientes por prioridad
- Leyenda de colores visible

### Prospección (`/prospeccion`)
- **Tablero Kanban personalizado** (sin librerías externas)
- Etapas del embudo:
  - Contacto inicial
  - Calificación
  - Propuesta
  - Negociación
  - Cierre
- Drag & drop con HTML5 API + Framer Motion
- Tarjetas con:
  - Nombre, email, teléfono, empresa
  - Badge de prioridad con colores
  - Tags personalizados
  - Responsable
- Colores dinámicos por etapa
- Animaciones fluidas al mover tarjetas
- Formulario para agregar prospectos

### Consulta de Pólizas (`/consulta-polizas`)
- Búsqueda por:
  - Número de póliza (IMEC)
  - Nombre del asegurado
  - Nombre del cliente/contratante
- Resultados en tiempo real
- Ver detalles completos de la póliza

## 4. Componentes Reutilizables

### Sidebar
- Navegación con iconos
- Secciones: Dashboard, Clientes, Pólizas, Pólizas Pendientes, Calendario, Prospección, Consulta
- Indicadores de sección activa
- Responsive (colapsa en móvil)

### GlassCard
- Efecto glassmorphism
- Backdrop blur
- Bordes sutiles
- Sombras suaves

### PageHeader
- Título y subtítulo
- Botón de acción opcional
- Breadcrumbs
- Responsive

### Componentes UI (shadcn/ui)
- Button, Input, Select, Textarea
- Dialog, Badge, Checkbox
- Table, Tabs, Calendar
- Toast (Sonner)

## 5. Características Técnicas

### Validaciones
- Tipo de pago obligatorio en todas las pólizas
- Validar campos requeridos antes de guardar
- Mostrar errores con toast notifications

### Cálculos Automáticos
- **Recibos de seguros de vida**: años × frecuencia de pago
  - Mensual: ×12, Trimestral: ×4, Semestral: ×2, Anual: ×1
- **Días para vencer**: calcular automáticamente desde vigencia_fin
- **Prioridad de eventos**: asignar color según días restantes

### Persistencia
- Todo se guarda en Supabase automáticamente
- Toast de confirmación en cada operación
- Manejo de errores con mensajes descriptivos
- Recargar datos después de cada cambio

### Responsive Design
- Mobile-first approach
- Sidebar colapsable
- Tablas con scroll horizontal
- Modales adaptables

## 6. Datos Iniciales

Incluir en el script SQL:
- 10 compañías de seguros (GNP, AXA, Qualitas, MAPFRE, Zurich, HDI, Banorte, Metlife, Chubb, Allianz) con colores
- 3 usuarios del sistema (Administrador, Asesor, Administrativo)
- 5 clientes de ejemplo

## 7. Documentación

Crear archivos:
- `GUIA_RAPIDA.md`: Guía de uso para el usuario final
- `INSTRUCCIONES_SUPABASE.md`: Cómo configurar la base de datos
- `README.md`: Instalación y configuración del proyecto

## 8. Deployment

- Configurar para Vercel
- Variables de entorno:
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
- Build sin errores (usar Suspense para useSearchParams)
- Documentar proceso de deployment

## 9. Estilo Visual

- Tema oscuro/claro con next-themes
- Colores primarios: azul/morado
- Glassmorphism en tarjetas
- Animaciones suaves con Framer Motion
- Fuentes: Inter para UI, serif para títulos
- Iconos: Lucide React

## 10. Seguridad

- Row Level Security en Supabase
- Validación de inputs
- Sanitización de datos
- Manejo seguro de credenciales
```

---

## Prompts Complementarios por Fase

### Fase 1: Setup Inicial
```
Crea la estructura base del proyecto Next.js 14 con TypeScript, TailwindCSS y shadcn/ui. 
Configura el cliente de Supabase en /lib/supabase.ts con las credenciales que te proporcionaré.
Instala todas las dependencias necesarias: framer-motion, sonner, @supabase/supabase-js.
```

### Fase 2: Base de Datos
```
Crea el archivo supabase-schema.sql con todas las tablas mencionadas.
Incluye triggers para updated_at, índices para optimización, y políticas RLS.
Agrega datos iniciales: 10 compañías, 3 usuarios, 5 clientes de ejemplo.
```

### Fase 3: Contexto Global
```
Crea el contexto de Supabase en /contexts/supabase-context.tsx que:
- Cargue todos los datos al iniciar
- Provea funciones CRUD para todas las entidades
- Maneje loading states y errores
- Muestre toast notifications en cada operación
- Recargue datos automáticamente después de cambios
```

### Fase 4: Páginas Principales
```
Crea las páginas de Clientes, Pólizas y Pólizas Pendientes.
En Pólizas, implementa el modo de crear cliente + póliza en un solo paso.
Asegúrate de que el tipo de pago sea obligatorio.
Para seguros de vida, calcula automáticamente el número de recibos.
```

### Fase 5: Calendario con Colores
```
Crea el calendario en /app/calendario/page.tsx con:
- Colores de prioridad: 🔴 Rojo (alta), 🟡 Amarillo (media), 🟢 Verde (baja)
- Eventos automáticos desde pólizas próximas a vencer
- Vista de mes y lista
- Filtros por prioridad y tipo
- KPIs de eventos pendientes
- Crear/editar/eliminar eventos
```

### Fase 6: Acciones en Pólizas Pendientes
```
En /app/polizas-pendientes/page.tsx, implementa:
- Botón "Acción" con opciones Renovar y Cancelar
- Modal de Renovar: solicitar motivo + tipo de pago, guardar en comentarios
- Modal de Cancelar: solicitar motivo, actualizar estatus
- Recordatorios: 3 fechas marcables con botón "Marcar"
```

### Fase 7: Kanban de Prospección
```
Crea el tablero Kanban personalizado en /components/kanban-board.tsx:
- Sin librerías externas, solo Framer Motion
- Drag & drop con HTML5 API
- 5 etapas del embudo
- Tarjetas con información completa
- Colores dinámicos por etapa
- Animaciones fluidas
```

### Fase 8: Build y Deployment
```
Asegúrate de que el build funcione sin errores.
Envuelve useSearchParams() con Suspense donde sea necesario.
Crea documentación para deployment en Vercel.
Lista las variables de entorno requeridas.
```

---

## Checklist de Verificación

Usa este checklist para verificar que todo esté completo:

- [ ] Base de datos creada en Supabase con todas las tablas
- [ ] Contexto global de Supabase funcionando
- [ ] Dashboard con KPIs en tiempo real
- [ ] CRUD completo de clientes
- [ ] CRUD completo de pólizas con tipo de pago obligatorio
- [ ] Cálculo automático de recibos para seguros de vida
- [ ] Pólizas pendientes con botones de Acción (Renovar/Cancelar)
- [ ] Recordatorios con 3 fechas marcables
- [ ] Calendario con colores de prioridad (🔴 🟡 🟢)
- [ ] Eventos automáticos desde pólizas
- [ ] Kanban de prospección con drag & drop
- [ ] Consulta de pólizas con búsqueda
- [ ] Toast notifications en todas las operaciones
- [ ] Build exitoso sin errores
- [ ] Documentación completa
- [ ] Listo para deployment en Vercel

---

## Resultado Esperado

Un CRM completo y funcional con:
- ✅ Gestión integral de clientes y pólizas
- ✅ Calendario inteligente con colores de prioridad
- ✅ Acciones específicas en pólizas pendientes
- ✅ Cálculos automáticos para seguros de vida
- ✅ Kanban personalizado para prospección
- ✅ Persistencia en Supabase
- ✅ UI moderna con glassmorphism
- ✅ Animaciones fluidas
- ✅ Responsive design
- ✅ Listo para producción
