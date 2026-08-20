# 🚀 Conectar a GitHub - Instrucciones

## Opción 1: Crear Repositorio en GitHub (Recomendado)

### Paso 1: Crear el Repositorio en GitHub.com

1. Ve a **https://github.com/new**
2. Nombre del repositorio: **`crm-seguros`**
3. Descripción: **"CRM para gestión de seguros con Supabase - Calendario con prioridades, gestión de pólizas y clientes"**
4. Selecciona **Público** o **Privado** (tu elección)
5. **NO** marques "Add a README file"
6. **NO** marques "Add .gitignore"
7. Click en **"Create repository"**

### Paso 2: Conectar tu Repositorio Local

Copia y pega estos comandos en tu terminal (reemplaza `TU_USUARIO` con tu usuario de GitHub):

```bash
cd /Users/mac/Downloads/crm-seguros

# Conectar con GitHub
git remote add origin https://github.com/TU_USUARIO/crm-seguros.git

# Cambiar a rama main
git branch -M main

# Subir todo a GitHub
git push -u origin main
```

### Paso 3: Verificar

Ve a **https://github.com/TU_USUARIO/crm-seguros** y deberías ver todos tus archivos.

---

## Opción 2: Usar GitHub Desktop (Más Fácil)

1. Descarga **GitHub Desktop**: https://desktop.github.com/
2. Abre GitHub Desktop
3. Click en **"Add"** → **"Add Existing Repository"**
4. Selecciona la carpeta: `/Users/mac/Downloads/crm-seguros`
5. Click en **"Publish repository"**
6. Elige nombre y visibilidad
7. Click en **"Publish"**

---

## ✅ Estado Actual

Tu repositorio local está listo:
- ✅ Git inicializado
- ✅ Commit creado con todos los cambios
- ✅ 159 archivos listos para subir
- ✅ Mensaje descriptivo del commit

### Archivos Incluidos:
- Código completo del CRM
- Integración con Supabase
- Calendario con colores de prioridad
- Scripts SQL
- Documentación completa
- Hooks y contextos
- Componentes UI

---

## 📋 Descripción Sugerida para GitHub

```
# CRM Seguros - Sistema de Gestión Integral

Sistema CRM completo para gestión de seguros con integración a Supabase.

## 🚀 Características

- **Gestión de Clientes y Pólizas** - CRUD completo con persistencia en Supabase
- **Calendario Inteligente** - Con colores de prioridad (🔴 Rojo, 🟡 Amarillo, 🟢 Verde)
- **Cálculo Automático** - Recibos para seguros de vida según años y forma de pago
- **Acciones en Pólizas** - Renovar/Cancelar con motivos obligatorios
- **Tipo de Pago Obligatorio** - En todas las transacciones
- **Eventos Automáticos** - Renovaciones y recordatorios en calendario
- **Dashboard en Tiempo Real** - KPIs y métricas actualizadas

## 🛠️ Tecnologías

- Next.js 14
- TypeScript
- Supabase (PostgreSQL)
- TailwindCSS
- Framer Motion
- shadcn/ui

## 📦 Instalación

\`\`\`bash
npm install
npm run dev
\`\`\`

## 🔐 Configuración Supabase

1. Ejecutar `supabase-update.sql` en Supabase SQL Editor
2. Verificar tablas en Table Editor
3. La app se conecta automáticamente

## 📚 Documentación

- `GUIA_RAPIDA.md` - Guía de uso
- `INSTRUCCIONES_SUPABASE.md` - Configuración de base de datos
- `FUNCIONALIDADES_IMPLEMENTADAS.md` - Lista completa de features

## 👤 Autor

Mauricio Portillo
```

---

## 🎯 Siguiente Paso

**Ejecuta estos comandos** (reemplaza TU_USUARIO):

```bash
git remote add origin https://github.com/TU_USUARIO/crm-seguros.git
git branch -M main
git push -u origin main
```

¡Listo! Tu código estará en GitHub 🎉
