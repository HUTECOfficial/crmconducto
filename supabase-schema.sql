-- Crear extensión UUID si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de Clientes
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  email TEXT,
  telefono TEXT NOT NULL,
  empresa TEXT,
  rfc TEXT,
  direccion TEXT,
  ciudad TEXT,
  estado TEXT,
  codigo_postal TEXT,
  fecha_registro DATE DEFAULT CURRENT_DATE,
  estatus TEXT DEFAULT 'activo',
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Compañías
CREATE TABLE IF NOT EXISTS companias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  color TEXT NOT NULL,
  logo TEXT,
  contacto TEXT,
  telefono TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Pólizas
CREATE TABLE IF NOT EXISTS polizas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  compania_id UUID NOT NULL REFERENCES companias(id) ON DELETE RESTRICT,
  ramo TEXT NOT NULL,
  numero_poliza TEXT NOT NULL UNIQUE,
  vigencia_inicio DATE NOT NULL,
  vigencia_fin DATE NOT NULL,
  prima DECIMAL(10, 2) NOT NULL,
  forma_pago TEXT NOT NULL,
  estatus TEXT DEFAULT 'activa',
  folios TEXT[],
  tramites INTEGER DEFAULT 0,
  prima_emitida DECIMAL(10, 2) NOT NULL,
  prima_cobrada DECIMAL(10, 2) DEFAULT 0,
  fecha_emision DATE NOT NULL,
  periodo_gracia DATE,
  cancelacion_motivo TEXT,
  rehabilitacion_fecha DATE,
  agente TEXT,
  inciso_endoso TEXT,
  nombre_asegurado TEXT,
  ultimo_dia_pago DATE,
  numero_recibo TEXT,
  prima_total_recibo DECIMAL(10, 2),
  registro_sistema_cobranza BOOLEAN DEFAULT FALSE,
  fechas_recordatorio JSONB,
  comentarios TEXT,
  notas TEXT,
  marca_actualizacion BOOLEAN DEFAULT FALSE,
  anos_vida_producto INTEGER,
  tipo_pago TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Prospectos
CREATE TABLE IF NOT EXISTS prospectos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  email TEXT,
  telefono TEXT NOT NULL,
  empresa TEXT,
  origen TEXT NOT NULL,
  interes TEXT NOT NULL,
  prioridad TEXT DEFAULT 'media',
  estatus TEXT DEFAULT 'nuevo',
  fecha_contacto DATE NOT NULL,
  notas TEXT,
  asignado_a TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Pagos
CREATE TABLE IF NOT EXISTS pagos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poliza_id UUID NOT NULL REFERENCES polizas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  monto DECIMAL(10, 2) NOT NULL,
  fecha_pago DATE,
  metodo_pago TEXT NOT NULL,
  referencia TEXT,
  estatus TEXT DEFAULT 'pendiente',
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  rol TEXT NOT NULL,
  avatar TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Eventos del Calendario
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

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_polizas_cliente_id ON polizas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_polizas_compania_id ON polizas(compania_id);
CREATE INDEX IF NOT EXISTS idx_polizas_estatus ON polizas(estatus);
CREATE INDEX IF NOT EXISTS idx_polizas_numero ON polizas(numero_poliza);
CREATE INDEX IF NOT EXISTS idx_pagos_poliza_id ON pagos(poliza_id);
CREATE INDEX IF NOT EXISTS idx_pagos_cliente_id ON pagos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_prospectos_estatus ON prospectos(estatus);
CREATE INDEX IF NOT EXISTS idx_clientes_estatus ON clientes(estatus);
CREATE INDEX IF NOT EXISTS idx_eventos_fecha ON eventos(fecha);
CREATE INDEX IF NOT EXISTS idx_eventos_tipo ON eventos(tipo);
CREATE INDEX IF NOT EXISTS idx_eventos_prioridad ON eventos(prioridad);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_polizas_updated_at BEFORE UPDATE ON polizas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prospectos_updated_at BEFORE UPDATE ON prospectos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companias_updated_at BEFORE UPDATE ON companias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pagos_updated_at BEFORE UPDATE ON pagos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_eventos_updated_at BEFORE UPDATE ON eventos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar Row Level Security (RLS)
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE polizas ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE companias ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad (permitir todo por ahora, ajustar según necesidades)
CREATE POLICY "Permitir todo en clientes" ON clientes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo en polizas" ON polizas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo en prospectos" ON prospectos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo en companias" ON companias FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo en pagos" ON pagos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo en usuarios" ON usuarios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo en eventos" ON eventos FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Insertar Compañías de Seguros
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

-- Insertar Usuarios del Sistema
INSERT INTO usuarios (nombre, email, rol, activo) VALUES
('Mauricio Portillo', 'admin@crm.com', 'administrador', true),
('Javier Garcia', 'javier@crm.com', 'gerencia', true),
('Monse', 'monse@crm.com', 'gerencia', true),
('Dani', 'dani@crm.com', 'gerencia', true)
ON CONFLICT (email) DO NOTHING;

-- Insertar algunos clientes de ejemplo
INSERT INTO clientes (nombre, email, telefono, empresa, fecha_registro, estatus) VALUES
('Juan Pérez García', 'juan.perez@email.com', '5551234567', 'Empresa ABC', CURRENT_DATE, 'activo'),
('María González López', 'maria.gonzalez@email.com', '5559876543', 'Comercial XYZ', CURRENT_DATE, 'activo'),
('Carlos Rodríguez Martínez', 'carlos.rodriguez@email.com', '5554567890', 'Industrias 123', CURRENT_DATE, 'activo'),
('Ana Martínez Sánchez', 'ana.martinez@email.com', '5557890123', NULL, CURRENT_DATE, 'activo'),
('Roberto Hernández Díaz', 'roberto.hernandez@email.com', '5552345678', 'Servicios Pro', CURRENT_DATE, 'activo')
ON CONFLICT DO NOTHING;
