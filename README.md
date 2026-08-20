# CONDUCTO CRM - Sistema de Gestión Premium

Sistema de gestión de seguros con estética Apple, glassmorphism y animaciones líquidas. Construido con Next.js, React, TypeScript, Tailwind CSS v4, Framer Motion y shadcn/ui.

## Características

- **Dashboard**: KPIs en tiempo real, renovaciones próximas, actividad reciente
- **Prospección**: Embudo Kanban con drag & drop para gestión de leads
- **Pólizas**: Tabla filtrable con modal de detalles completos
- **Pagos**: Calendario mensual con alertas de vencimiento (15d, 7d, 3d)
- **Recordatorios**: Constructor de recordatorios con integración WhatsApp
- **Reportes**: Gráficas interactivas con exportación JSON/CSV
- **Ajustes**: Personalización de etapas, colores y tema visual
- **Command Palette**: Búsqueda global con ⌘K

## Instalación

\`\`\`bash
# Instalar dependencias
pnpm install

# Ejecutar en desarrollo
pnpm dev

# Construir para producción
pnpm build
\`\`\`

## Personalización de Marca

Para cambiar los colores de marca, edita el archivo `app/globals.css`:

\`\`\`css
:root {
  --color-primary: TU_COLOR_PRIMARIO;
  --color-secondary: TU_COLOR_SECUNDARIO;
  --color-accent: TU_COLOR_ACENTO;
}
\`\`\`

Los colores deben estar en formato `oklch()` para mejor consistencia.

## Estructura del Proyecto

\`\`\`
├── app/                    # Páginas de Next.js
│   ├── page.tsx           # Dashboard
│   ├── prospeccion/       # Kanban de prospección
│   ├── polizas/           # Gestión de pólizas
│   ├── pagos/             # Calendario de pagos
│   ├── recordatorios/     # Sistema de recordatorios
│   ├── reportes/          # Reportes y gráficas
│   └── ajustes/           # Configuración
├── components/            # Componentes reutilizables
│   ├── glass-card.tsx     # Tarjeta glassmorphism
│   ├── neo-button.tsx     # Botón neumórfico
│   ├── metric-tile.tsx    # Tile de métrica
│   ├── kanban-board.tsx   # Tablero Kanban
│   └── command-palette.tsx # Búsqueda global
├── data/                  # Datos mock
│   ├── clientes.ts
│   ├── polizas.ts
│   ├── pagos.ts
│   ├── prospectos.ts
│   └── recordatorios.ts
└── lib/                   # Utilidades
\`\`\`

## Tecnologías

- **Next.js 15** - Framework React
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Estilos utility-first
- **Framer Motion** - Animaciones fluidas
- **shadcn/ui** - Componentes accesibles
- **Recharts** - Gráficas interactivas
- **Lucide React** - Iconos

## Características Técnicas

- ✅ Sin backend - Todo en cliente con datos mock
- ✅ Sin APIs - Estado en memoria
- ✅ Modo dark/light automático
- ✅ Animaciones líquidas (180-240ms)
- ✅ Glassmorphism y neumorfismo
- ✅ Command palette (⌘K)
- ✅ Drag & drop nativo
- ✅ Exportación de datos
- ✅ Integración WhatsApp (deep-link)

## Uso

### Command Palette
Presiona `⌘K` (Mac) o `Ctrl+K` (Windows/Linux) para abrir la búsqueda global.

### Drag & Drop
En la página de Prospección, arrastra las tarjetas entre columnas para cambiar su etapa.

### Exportar Reportes
En la página de Reportes, usa los botones "JSON" o "CSV" para descargar los datos.

### WhatsApp
En Recordatorios, haz clic en "Abrir WhatsApp" para enviar mensajes directamente.

## Licencia

MIT
