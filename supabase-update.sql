-- =====================================================
-- SCRIPT DE ACTUALIZACIÓN - SOLO LO NUEVO
-- =====================================================
-- Este script agrega solo la tabla de eventos y datos iniciales
-- Sin recrear tablas o triggers existentes

-- Tabla de Eventos del Calendario (NUEVA)
CREATE TABLE IF NOT EXISTS eventos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  fecha DATE NOT NULL,
  hora TIME,
  tipo TEXT NOT NULL DEFAULT 'otro',
  prioridad TEXT NOT NULL DEFAULT 'media',
  poliza_id UUID REFERENCES polizas(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  completado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para eventos
CREATE INDEX IF NOT EXISTS idx_eventos_fecha ON eventos(fecha);
CREATE INDEX IF NOT EXISTS idx_eventos_tipo ON eventos(tipo);
CREATE INDEX IF NOT EXISTS idx_eventos_prioridad ON eventos(prioridad);

-- Trigger para eventos (solo si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_eventos_updated_at'
  ) THEN
    CREATE TRIGGER update_eventos_updated_at 
    BEFORE UPDATE ON eventos
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Habilitar RLS para eventos
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;

-- Política de seguridad para eventos
DROP POLICY IF EXISTS "Permitir todo en eventos" ON eventos;
CREATE POLICY "Permitir todo en eventos" ON eventos FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- AGREGAR RESTRICCIONES ÚNICAS (si no existen)
-- =====================================================

-- Agregar restricción única a companias.nombre
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'companias_nombre_key'
  ) THEN
    ALTER TABLE companias ADD CONSTRAINT companias_nombre_key UNIQUE (nombre);
  END IF;
END $$;

-- La tabla usuarios ya tiene restricción única en email (se creó en el schema original)

-- Agregar restricción única a clientes.email (si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clientes_email_key'
  ) THEN
    ALTER TABLE clientes ADD CONSTRAINT clientes_email_key UNIQUE (email);
  END IF;
END $$;

-- =====================================================
-- DATOS INICIALES (solo si no existen)
-- =====================================================

-- Insertar Compañías de Seguros (ahora con ON CONFLICT funcionando)
INSERT INTO companias (nombre, color) VALUES
('GNP Seguros', '#E31937'),
('AXA Seguros', '#00008F'),
('Qualitas', '#00A651'),
('MAPFRE', '#C8102E'),
('Zurich', '#0066CC'),
('HDI Seguros', '#E30613'),
('Banorte Seguros', '#E2001A'),
('Metlife', '#0066B2'),
('Chubb', '#FF6B00'),
('Allianz', '#003781')
ON CONFLICT (nombre) DO NOTHING;

-- Insertar Usuarios
INSERT INTO usuarios (nombre, email, rol, activo) VALUES
('Mauricio Portillo', 'admin@crm.com', 'administrador', true),
('María Asesora', 'maria@crm.com', 'asesor', true),
('Juan Administrativo', 'juan@crm.com', 'administrativo', true)
ON CONFLICT (email) DO NOTHING;

-- Insertar algunos clientes de ejemplo
INSERT INTO clientes (nombre, email, telefono, empresa, fecha_registro, estatus) VALUES
('Juan Pérez García', 'juan.perez@email.com', '5551234567', 'Empresa ABC', CURRENT_DATE, 'activo'),
('María González López', 'maria.gonzalez@email.com', '5559876543', 'Comercial XYZ', CURRENT_DATE, 'activo'),
('Carlos Rodríguez Martínez', 'carlos.rodriguez@email.com', '5554567890', 'Industrias 123', CURRENT_DATE, 'activo'),
('Ana Martínez Sánchez', 'ana.martinez@email.com', '5557890123', NULL, CURRENT_DATE, 'activo'),
('Roberto Hernández Díaz', 'roberto.hernandez@email.com', '5552345678', 'Servicios Pro', CURRENT_DATE, 'activo')
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Verificar que todo se creó correctamente
SELECT 'Tabla eventos creada' as status WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'eventos'
);

SELECT COUNT(*) as total_companias FROM companias;
SELECT COUNT(*) as total_usuarios FROM usuarios;
SELECT COUNT(*) as total_clientes FROM clientes;
