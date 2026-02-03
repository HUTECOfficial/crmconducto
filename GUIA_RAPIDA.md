# 🚀 Guía Rápida - CRM Seguros con Supabase

## ✅ Estado Actual

Tu CRM está **100% conectado a Supabase**. Todos los datos se guardan en la nube automáticamente.

## 📊 Datos Iniciales Cargados

- ✅ **10 Compañías** de seguros (GNP, AXA, Qualitas, MAPFRE, etc.)
- ✅ **3 Usuarios** (Mauricio Portillo como administrador)
- ✅ **5 Clientes** de ejemplo
- ✅ **Tabla de Eventos** para el calendario

## 🎯 Funcionalidades Principales

### 1. Dashboard Principal (`/`)
- KPIs en tiempo real
- Pólizas por cobrar
- Próximas renovaciones
- Actividades a realizar

### 2. Clientes (`/clientes`)
**Conectado a Supabase ✅**
- Ver todos los clientes
- Crear nuevos clientes
- Editar información
- Los datos se guardan automáticamente en Supabase

### 3. Pólizas (`/polizas`)
**Conectado a Supabase ✅**
- Crear nuevas pólizas
- Filtrar por compañía, ramo, estatus
- Campo de **Tipo de Pago** (obligatorio)
- Para seguros de vida: campo de **Años de Vida** con cálculo automático de recibos

**Ejemplo:** 
- Seguro de vida por 10 años + pago mensual = 120 recibos (1/120)
- Seguro de vida por 20 años + pago anual = 20 recibos (1/20)

### 4. Pólizas Pendientes (`/polizas-pendientes`)
**Conectado a Supabase ✅**
- Ver pólizas con pagos pendientes
- Botón **"Acción"** en cada póliza:
  - **Renovar**: Requiere motivo + tipo de pago
  - **Cancelar**: Requiere motivo
- Filtros por estatus y movimiento de dinero
- Recordatorios con fechas

### 5. Calendario (`/calendario`) 🆕
**Conectado a Supabase ✅**

#### Colores de Prioridad:
- 🔴 **Rojo** = Alta prioridad (urgente, menos de 7 días)
- 🟡 **Amarillo** = Media prioridad (atención, menos de 30 días)
- 🟢 **Verde** = Baja prioridad (normal, más de 30 días)

#### Eventos Automáticos:
- **Renovaciones de pólizas** (próximas 60 días)
- **Recordatorios** de pólizas marcados
- **Eventos manuales** que crees

#### Funciones:
- Crear eventos personalizados
- Filtrar por prioridad y tipo
- Vista de mes y lista
- Marcar eventos como completados
- Asociar eventos a clientes/pólizas

### 6. Prospección (`/prospeccion`)
**Conectado a Supabase ✅**
- Gestionar leads y prospectos
- Pipeline de ventas
- Seguimiento de contactos

### 7. Consulta de Pólizas (`/consulta-polizas`)
- Búsqueda por:
  - Número de póliza (IMEC)
  - Nombre del asegurado
  - Nombre del cliente/contratante

## 🔄 Flujo de Trabajo Típico

### Crear un Nuevo Cliente con Póliza

1. Ve a **Pólizas** (`/polizas`)
2. Click en **"Nueva Póliza"**
3. Selecciona **"Nuevo Cliente"**
4. Llena los datos del cliente
5. Selecciona la compañía y ramo
6. **Importante:** Selecciona el **Tipo de Pago** (obligatorio)
7. Si es seguro de vida:
   - Ingresa los **Años de Vida del Producto**
   - El sistema calculará automáticamente el número de recibos
8. Click en **"Crear Cliente y Póliza"**

### Gestionar Pólizas Pendientes

1. Ve a **Pólizas Pendientes** (`/polizas-pendientes`)
2. Verás todas las pólizas con pagos pendientes
3. Para cada póliza puedes:
   - **Renovar**: Click en "Renovar" → Ingresa motivo + tipo de pago
   - **Cancelar**: Click en "Cancelar" → Ingresa motivo
   - **Marcar Recordatorios**: Click en "Marcar" en las fechas
   - **Agregar Comentarios**: Click en el ícono de editar

### Usar el Calendario

1. Ve a **Calendario** (`/calendario`)
2. Verás eventos con colores según prioridad
3. Para crear un evento:
   - Click en **"Nuevo Evento"**
   - Llena título, fecha, tipo
   - Selecciona prioridad (🔴 Alta, 🟡 Media, 🟢 Baja)
   - Opcionalmente asocia a un cliente
4. Filtra por prioridad o tipo
5. Cambia entre vista de mes y lista

## 📱 Características Especiales

### Cálculo Automático de Recibos (Seguros de Vida)
Cuando creas un seguro de vida:
```
Años × Pagos por Año = Total de Recibos

Ejemplos:
- 10 años × 12 (mensual) = 120 recibos → "1/120"
- 15 años × 4 (trimestral) = 60 recibos → "1/60"
- 20 años × 1 (anual) = 20 recibos → "1/20"
```

### Acciones en Pólizas Pendientes
Cada acción (renovar/cancelar) requiere:
- **Motivo obligatorio** (lo que dijo el cliente)
- **Tipo de pago** (solo para renovaciones)
- Se guarda en comentarios de la póliza

### Calendario Inteligente
- Muestra automáticamente renovaciones próximas
- Color según urgencia (días restantes)
- Sincronizado con pólizas en tiempo real

## 🔐 Usuarios del Sistema

| Usuario | Email | Rol | Contraseña |
|---------|-------|-----|------------|
| Mauricio Portillo | admin@crm.com | Administrador | (configurar) |
| María Asesora | maria@crm.com | Asesor | (configurar) |
| Juan Administrativo | juan@crm.com | Administrativo | (configurar) |

## 💾 Persistencia de Datos

**Todos los datos se guardan automáticamente en Supabase:**
- ✅ Clientes
- ✅ Pólizas
- ✅ Prospectos
- ✅ Eventos del calendario
- ✅ Compañías
- ✅ Usuarios

**No se pierde nada al recargar la página.**

## 🎨 Colores del Sistema

### Prioridades en Calendario:
- 🔴 Rojo = Urgente (≤7 días)
- 🟡 Amarillo = Atención (≤30 días)
- 🟢 Verde = Normal (>30 días)

### Estados de Pólizas:
- Verde = Activa
- Amarillo = Por renovar
- Rojo = Vencida
- Gris = Cancelada

## 📞 Próximos Pasos

1. **Prueba crear un cliente nuevo**
   - Ve a Pólizas → Nueva Póliza → Nuevo Cliente

2. **Crea una póliza de prueba**
   - Selecciona un cliente
   - Elige compañía y ramo
   - No olvides el tipo de pago

3. **Explora el calendario**
   - Crea un evento de prueba
   - Verás las renovaciones automáticas

4. **Revisa pólizas pendientes**
   - Prueba renovar o cancelar una póliza
   - Marca recordatorios

## 🆘 Soporte

Si algo no funciona:
1. Abre la consola del navegador (F12)
2. Busca errores en rojo
3. Verifica que Supabase esté activo
4. Revisa que las tablas tengan datos

## ✨ Todo Listo

Tu CRM está **100% funcional** y conectado a Supabase. Todos los datos se guardan en la nube automáticamente.

**¡Empieza a usarlo!** 🚀
