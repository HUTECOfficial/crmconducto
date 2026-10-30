-- Encargados de cobranza (mismo rol que Monse).
INSERT INTO usuarios (nombre, email, rol, activo) VALUES
('Maggie Huape', 'maggie@crm.com', 'gerencia', true),
('Gael García', 'gael@crm.com', 'gerencia', true)
ON CONFLICT (email) DO NOTHING;
