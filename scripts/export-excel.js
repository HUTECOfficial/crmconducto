const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Datos de Prospección (Clientes)
const prospeccionData = [
  {
    'ID': '1',
    'Nombre': 'María González',
    'Email': 'maria.gonzalez@email.com',
    'Teléfono': '+52 55 1234 5678',
    'Empresa': 'Tech Solutions SA',
    'Fecha Registro': '2024-01-15',
    'Estatus': 'Activo',
    'Potencial': 'Alto',
    'Fuente': 'Referencia',
    'Notas': 'Cliente premium con múltiples pólizas'
  },
  {
    'ID': '2',
    'Nombre': 'Carlos Rodríguez',
    'Email': 'carlos.rodriguez@email.com',
    'Teléfono': '+52 55 2345 6789',
    'Empresa': '',
    'Fecha Registro': '2024-02-20',
    'Estatus': 'Activo',
    'Potencial': 'Medio',
    'Fuente': 'Web',
    'Notas': 'Interesado en seguros de auto'
  },
  {
    'ID': '3',
    'Nombre': 'Ana Martínez',
    'Email': 'ana.martinez@email.com',
    'Teléfono': '+52 55 3456 7890',
    'Empresa': 'Comercial del Norte',
    'Fecha Registro': '2024-03-10',
    'Estatus': 'Activo',
    'Potencial': 'Alto',
    'Fuente': 'Contacto Directo',
    'Notas': 'Empresa con 50+ empleados'
  },
  {
    'ID': '4',
    'Nombre': 'Luis Hernández',
    'Email': 'luis.hernandez@email.com',
    'Teléfono': '+52 55 4567 8901',
    'Empresa': '',
    'Fecha Registro': '2024-03-25',
    'Estatus': 'Prospecto',
    'Potencial': 'Bajo',
    'Fuente': 'Llamada Fría',
    'Notas': 'Seguimiento pendiente'
  },
  {
    'ID': '5',
    'Nombre': 'Patricia López',
    'Email': 'patricia.lopez@email.com',
    'Teléfono': '+52 55 5678 9012',
    'Empresa': 'Inversiones Globales',
    'Fecha Registro': '2024-04-05',
    'Estatus': 'Activo',
    'Potencial': 'Muy Alto',
    'Fuente': 'Referencia',
    'Notas': 'Interesada en seguros empresariales'
  },
  {
    'ID': '6',
    'Nombre': 'Roberto Sánchez',
    'Email': 'roberto.sanchez@email.com',
    'Teléfono': '+52 55 6789 0123',
    'Empresa': 'Logística Express',
    'Fecha Registro': '2024-04-15',
    'Estatus': 'Activo',
    'Potencial': 'Alto',
    'Fuente': 'Contacto Directo',
    'Notas': 'Flota de 30 vehículos'
  },
  {
    'ID': '7',
    'Nombre': 'Gabriela Flores',
    'Email': 'gabriela.flores@email.com',
    'Teléfono': '+52 55 7890 1234',
    'Empresa': '',
    'Fecha Registro': '2024-05-01',
    'Estatus': 'Prospecto',
    'Potencial': 'Medio',
    'Fuente': 'Red Social',
    'Notas': 'Interesada en seguros de vida'
  },
  {
    'ID': '8',
    'Nombre': 'Fernando Díaz',
    'Email': 'fernando.diaz@email.com',
    'Teléfono': '+52 55 8901 2345',
    'Empresa': 'Constructora Moderna',
    'Fecha Registro': '2024-05-10',
    'Estatus': 'Activo',
    'Potencial': 'Muy Alto',
    'Fuente': 'Referencia',
    'Notas': 'Empresa constructora con múltiples proyectos'
  },
  {
    'ID': '9',
    'Nombre': 'Sofía Ruiz',
    'Email': 'sofia.ruiz@email.com',
    'Teléfono': '+52 55 9012 3456',
    'Empresa': '',
    'Fecha Registro': '2024-05-20',
    'Estatus': 'Inactivo',
    'Potencial': 'Bajo',
    'Fuente': 'Llamada Fría',
    'Notas': 'No mostró interés'
  },
  {
    'ID': '10',
    'Nombre': 'Javier Moreno',
    'Email': 'javier.moreno@email.com',
    'Teléfono': '+52 55 0123 4567',
    'Empresa': 'Retail Solutions',
    'Fecha Registro': '2024-06-01',
    'Estatus': 'Prospecto',
    'Potencial': 'Alto',
    'Fuente': 'Contacto Directo',
    'Notas': 'Cadena de tiendas con 15 sucursales'
  }
];

// Datos de Pólizas
const polizasData = [
  {
    'ID Póliza': '1',
    'Número Póliza': 'AXA-AUTO-2024-001',
    'Cliente': 'María González',
    'Compañía': 'AXA',
    'Ramo': 'Autos',
    'Prima Anual': 12500,
    'Prima Emitida': 12500,
    'Prima Cobrada': 12500,
    'Prima Pendiente': 0,
    'Forma Pago': 'Anual',
    'Vigencia Inicio': '2024-01-15',
    'Vigencia Fin': '2025-01-15',
    'Fecha Emisión': '2024-01-15',
    'Estatus': 'Activa',
    'Agente': 'AG001',
    'Efectividad': '100%',
    'Días Mora': 0
  },
  {
    'ID Póliza': '2',
    'Número Póliza': 'GNP-GM-2024-001',
    'Cliente': 'María González',
    'Compañía': 'GNP',
    'Ramo': 'Gastos Médicos',
    'Prima Anual': 24000,
    'Prima Emitida': 24000,
    'Prima Cobrada': 18000,
    'Prima Pendiente': 6000,
    'Forma Pago': 'Mensual',
    'Vigencia Inicio': '2024-02-01',
    'Vigencia Fin': '2025-02-01',
    'Fecha Emisión': '2024-02-01',
    'Estatus': 'Activa',
    'Agente': 'AG002',
    'Efectividad': '75%',
    'Días Mora': 45
  },
  {
    'ID Póliza': '3',
    'Número Póliza': 'QUA-AUTO-2024-002',
    'Cliente': 'Carlos Rodríguez',
    'Compañía': 'Qualitas',
    'Ramo': 'Autos',
    'Prima Anual': 9800,
    'Prima Emitida': 9800,
    'Prima Cobrada': 9800,
    'Prima Pendiente': 0,
    'Forma Pago': 'Semestral',
    'Vigencia Inicio': '2024-02-20',
    'Vigencia Fin': '2025-02-20',
    'Fecha Emisión': '2024-02-20',
    'Estatus': 'Activa',
    'Agente': 'AG001',
    'Efectividad': '100%',
    'Días Mora': 0
  },
  {
    'ID Póliza': '4',
    'Número Póliza': 'SEGUROS-VIDA-2024-003',
    'Cliente': 'Ana Martínez',
    'Compañía': 'Seguros Monterrey',
    'Ramo': 'Vida',
    'Prima Anual': 18500,
    'Prima Emitida': 18500,
    'Prima Cobrada': 18500,
    'Prima Pendiente': 0,
    'Forma Pago': 'Anual',
    'Vigencia Inicio': '2024-03-01',
    'Vigencia Fin': '2025-03-01',
    'Fecha Emisión': '2024-03-01',
    'Estatus': 'Activa',
    'Agente': 'AG003',
    'Efectividad': '100%',
    'Días Mora': 0
  },
  {
    'ID Póliza': '5',
    'Número Póliza': 'MAPFRE-EMPRESA-2024-004',
    'Cliente': 'Comercial del Norte',
    'Compañía': 'MAPFRE',
    'Ramo': 'Empresa',
    'Prima Anual': 45000,
    'Prima Emitida': 45000,
    'Prima Cobrada': 40000,
    'Prima Pendiente': 5000,
    'Forma Pago': 'Trimestral',
    'Vigencia Inicio': '2024-03-15',
    'Vigencia Fin': '2025-03-15',
    'Fecha Emisión': '2024-03-15',
    'Estatus': 'Activa',
    'Agente': 'AG001',
    'Efectividad': '88.9%',
    'Días Mora': 65
  },
  {
    'ID Póliza': '6',
    'Número Póliza': 'AXA-HOGAR-2024-005',
    'Cliente': 'Luis Hernández',
    'Compañía': 'AXA',
    'Ramo': 'Hogar',
    'Prima Anual': 8500,
    'Prima Emitida': 8500,
    'Prima Cobrada': 0,
    'Prima Pendiente': 8500,
    'Forma Pago': 'Anual',
    'Vigencia Inicio': '2024-04-01',
    'Vigencia Fin': '2025-04-01',
    'Fecha Emisión': '2024-04-01',
    'Estatus': 'Gracia',
    'Agente': 'AG002',
    'Efectividad': '0%',
    'Días Mora': 87
  },
  {
    'ID Póliza': '7',
    'Número Póliza': 'GNP-AUTO-2024-006',
    'Cliente': 'Patricia López',
    'Compañía': 'GNP',
    'Ramo': 'Autos',
    'Prima Anual': 15000,
    'Prima Emitida': 15000,
    'Prima Cobrada': 15000,
    'Prima Pendiente': 0,
    'Forma Pago': 'Semestral',
    'Vigencia Inicio': '2024-04-10',
    'Vigencia Fin': '2025-04-10',
    'Fecha Emisión': '2024-04-10',
    'Estatus': 'Activa',
    'Agente': 'AG003',
    'Efectividad': '100%',
    'Días Mora': 0
  },
  {
    'ID Póliza': '8',
    'Número Póliza': 'QUALITAS-EMPRESA-2024-007',
    'Cliente': 'Roberto Sánchez',
    'Compañía': 'Qualitas',
    'Ramo': 'Empresa',
    'Prima Anual': 52000,
    'Prima Emitida': 52000,
    'Prima Cobrada': 52000,
    'Prima Pendiente': 0,
    'Forma Pago': 'Mensual',
    'Vigencia Inicio': '2024-04-20',
    'Vigencia Fin': '2025-04-20',
    'Fecha Emisión': '2024-04-20',
    'Estatus': 'Activa',
    'Agente': 'AG001',
    'Efectividad': '100%',
    'Días Mora': 0
  },
  {
    'ID Póliza': '9',
    'Número Póliza': 'SEGUROS-VIDA-2024-008',
    'Cliente': 'Gabriela Flores',
    'Compañía': 'Seguros Monterrey',
    'Ramo': 'Vida',
    'Prima Anual': 6500,
    'Prima Emitida': 6500,
    'Prima Cobrada': 0,
    'Prima Pendiente': 6500,
    'Forma Pago': 'Anual',
    'Vigencia Inicio': '2024-05-01',
    'Vigencia Fin': '2025-05-01',
    'Fecha Emisión': '2024-05-01',
    'Estatus': 'Vencida',
    'Agente': 'AG002',
    'Efectividad': '0%',
    'Días Mora': 125
  },
  {
    'ID Póliza': '10',
    'Número Póliza': 'MAPFRE-CONSTRUCCION-2024-009',
    'Cliente': 'Fernando Díaz',
    'Compañía': 'MAPFRE',
    'Ramo': 'Empresa',
    'Prima Anual': 75000,
    'Prima Emitida': 75000,
    'Prima Cobrada': 75000,
    'Prima Pendiente': 0,
    'Forma Pago': 'Trimestral',
    'Vigencia Inicio': '2024-05-15',
    'Vigencia Fin': '2025-05-15',
    'Fecha Emisión': '2024-05-15',
    'Estatus': 'Activa',
    'Agente': 'AG003',
    'Efectividad': '100%',
    'Días Mora': 0
  },
  {
    'ID Póliza': '11',
    'Número Póliza': 'AXA-RETAIL-2024-010',
    'Cliente': 'Javier Moreno',
    'Compañía': 'AXA',
    'Ramo': 'Empresa',
    'Prima Anual': 38000,
    'Prima Emitida': 38000,
    'Prima Cobrada': 38000,
    'Prima Pendiente': 0,
    'Forma Pago': 'Mensual',
    'Vigencia Inicio': '2024-06-01',
    'Vigencia Fin': '2025-06-01',
    'Fecha Emisión': '2024-06-01',
    'Estatus': 'Activa',
    'Agente': 'AG001',
    'Efectividad': '100%',
    'Días Mora': 0
  }
];

// Crear workbooks
const prospeccionWB = XLSX.utils.book_new();
const polizasWB = XLSX.utils.book_new();

// Agregar hojas
const prospeccionWS = XLSX.utils.json_to_sheet(prospeccionData);
const polizasWS = XLSX.utils.json_to_sheet(polizasData);

// Configurar estilos y ancho de columnas
const setColumnWidths = (ws, widths) => {
  ws['!cols'] = widths.map(w => ({ wch: w }));
};

// Prospección - Ancho de columnas
setColumnWidths(prospeccionWS, [5, 20, 30, 18, 25, 15, 12, 12, 15, 30]);

// Pólizas - Ancho de columnas
setColumnWidths(polizasWS, [10, 25, 20, 15, 15, 12, 15, 15, 15, 12, 15, 18, 18, 15, 12, 10, 10]);

// Agregar hojas a workbooks
XLSX.utils.book_append_sheet(prospeccionWB, prospeccionWS, "Prospección");
XLSX.utils.book_append_sheet(polizasWB, polizasWS, "Pólizas");

// Crear directorio si no existe
const excelDir = path.join(__dirname, '../public/excel');
if (!fs.existsSync(excelDir)) {
  fs.mkdirSync(excelDir, { recursive: true });
}

// Guardar archivos
XLSX.writeFile(prospeccionWB, path.join(excelDir, 'Prospeccion_Clientes.xlsx'));
XLSX.writeFile(polizasWB, path.join(excelDir, 'Polizas.xlsx'));

console.log('✅ Archivos Excel generados exitosamente:');
console.log('   - Prospeccion_Clientes.xlsx');
console.log('   - Polizas.xlsx');
console.log(`   Ubicación: ${excelDir}`);
