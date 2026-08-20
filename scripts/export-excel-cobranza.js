const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Datos de Cobranza (Pagos y Seguimiento)
const cobranzaData = [
  {
    'ID Pago': '1',
    'Póliza': 'AXA-AUTO-2024-001',
    'Cliente': 'María González',
    'Compañía': 'AXA',
    'Monto': 12500,
    'Fecha Vencimiento': '2024-10-01',
    'Fecha Pago': '2024-09-28',
    'Estatus': 'Pagado',
    'Método Pago': 'Transferencia',
    'Días Mora': 0,
    'Intentos Cobranza': 1,
    'Agente': 'AG001',
    'Motivo Rechazo': '',
    'Referencia': 'REF001'
  },
  {
    'ID Pago': '2',
    'Póliza': 'GNP-GM-2024-001',
    'Cliente': 'María González',
    'Compañía': 'GNP',
    'Monto': 1500,
    'Fecha Vencimiento': '2024-10-15',
    'Fecha Pago': '2024-10-14',
    'Estatus': 'Pagado',
    'Método Pago': 'Tarjeta',
    'Días Mora': 0,
    'Intentos Cobranza': 1,
    'Agente': 'AG002',
    'Motivo Rechazo': '',
    'Referencia': 'REF002'
  },
  {
    'ID Pago': '3',
    'Póliza': 'QUA-AUTO-2024-002',
    'Cliente': 'Carlos Rodríguez',
    'Compañía': 'Qualitas',
    'Monto': 2333,
    'Fecha Vencimiento': '2024-10-10',
    'Fecha Pago': '',
    'Estatus': 'Vencido',
    'Método Pago': '',
    'Días Mora': 87,
    'Intentos Cobranza': 3,
    'Agente': 'AG001',
    'Motivo Rechazo': '',
    'Referencia': ''
  },
  {
    'ID Pago': '4',
    'Póliza': 'SEGUROS-VIDA-2024-003',
    'Cliente': 'Ana Martínez',
    'Compañía': 'Seguros Monterrey',
    'Monto': 1333,
    'Fecha Vencimiento': '2024-10-15',
    'Fecha Pago': '',
    'Estatus': 'Pendiente',
    'Método Pago': '',
    'Días Mora': 82,
    'Intentos Cobranza': 2,
    'Agente': 'AG003',
    'Motivo Rechazo': '',
    'Referencia': ''
  },
  {
    'ID Pago': '5',
    'Póliza': 'MAPFRE-EMPRESA-2024-004',
    'Cliente': 'Comercial del Norte',
    'Compañía': 'MAPFRE',
    'Monto': 2167,
    'Fecha Vencimiento': '2024-10-01',
    'Fecha Pago': '',
    'Estatus': 'Rechazado',
    'Método Pago': 'Tarjeta',
    'Días Mora': 97,
    'Intentos Cobranza': 4,
    'Agente': 'AG002',
    'Motivo Rechazo': 'Tarjeta Vencida',
    'Referencia': ''
  },
  {
    'ID Pago': '6',
    'Póliza': 'AXA-AUTO-2024-001',
    'Cliente': 'María González',
    'Compañía': 'AXA',
    'Monto': 2000,
    'Fecha Vencimiento': '2024-11-01',
    'Fecha Pago': '',
    'Estatus': 'Pendiente',
    'Método Pago': '',
    'Días Mora': 65,
    'Intentos Cobranza': 2,
    'Agente': 'AG001',
    'Motivo Rechazo': '',
    'Referencia': ''
  },
  {
    'ID Pago': '7',
    'Póliza': 'GNP-GM-2024-001',
    'Cliente': 'María González',
    'Compañía': 'GNP',
    'Monto': 1500,
    'Fecha Vencimiento': '2024-11-15',
    'Fecha Pago': '',
    'Estatus': 'Pendiente',
    'Método Pago': '',
    'Días Mora': 51,
    'Intentos Cobranza': 1,
    'Agente': 'AG002',
    'Motivo Rechazo': '',
    'Referencia': ''
  },
  {
    'ID Pago': '8',
    'Póliza': 'QUA-AUTO-2024-002',
    'Cliente': 'Carlos Rodríguez',
    'Compañía': 'Qualitas',
    'Monto': 2333,
    'Fecha Vencimiento': '2024-11-10',
    'Fecha Pago': '',
    'Estatus': 'Vencido',
    'Método Pago': '',
    'Días Mora': 56,
    'Intentos Cobranza': 2,
    'Agente': 'AG001',
    'Motivo Rechazo': '',
    'Referencia': ''
  },
  {
    'ID Pago': '9',
    'Póliza': 'SEGUROS-VIDA-2024-003',
    'Cliente': 'Ana Martínez',
    'Compañía': 'Seguros Monterrey',
    'Monto': 1333,
    'Fecha Vencimiento': '2024-11-15',
    'Fecha Pago': '',
    'Estatus': 'Pendiente',
    'Método Pago': '',
    'Días Mora': 51,
    'Intentos Cobranza': 1,
    'Agente': 'AG003',
    'Motivo Rechazo': '',
    'Referencia': ''
  },
  {
    'ID Pago': '10',
    'Póliza': 'MAPFRE-EMPRESA-2024-004',
    'Cliente': 'Comercial del Norte',
    'Compañía': 'MAPFRE',
    'Monto': 2167,
    'Fecha Vencimiento': '2024-11-01',
    'Fecha Pago': '',
    'Estatus': 'Rechazado',
    'Método Pago': 'Domiciliación',
    'Días Mora': 65,
    'Intentos Cobranza': 3,
    'Agente': 'AG002',
    'Motivo Rechazo': 'Fondos Insuficientes',
    'Referencia': ''
  },
  {
    'ID Pago': '21',
    'Póliza': 'AXA-AUTO-2024-001',
    'Cliente': 'María González',
    'Compañía': 'AXA',
    'Monto': 3500,
    'Fecha Vencimiento': '2025-01-05',
    'Fecha Pago': '',
    'Estatus': 'Pendiente',
    'Método Pago': '',
    'Días Mora': 0,
    'Intentos Cobranza': 0,
    'Agente': 'AG001',
    'Motivo Rechazo': '',
    'Referencia': ''
  },
  {
    'ID Pago': '22',
    'Póliza': 'GNP-GM-2024-001',
    'Cliente': 'María González',
    'Compañía': 'GNP',
    'Monto': 2800,
    'Fecha Vencimiento': '2025-01-08',
    'Fecha Pago': '',
    'Estatus': 'Pendiente',
    'Método Pago': '',
    'Días Mora': 0,
    'Intentos Cobranza': 0,
    'Agente': 'AG003',
    'Motivo Rechazo': '',
    'Referencia': ''
  },
  {
    'ID Pago': '23',
    'Póliza': 'QUA-AUTO-2024-002',
    'Cliente': 'Carlos Rodríguez',
    'Compañía': 'Qualitas',
    'Monto': 4200,
    'Fecha Vencimiento': '2025-01-12',
    'Fecha Pago': '',
    'Estatus': 'Pendiente',
    'Método Pago': '',
    'Días Mora': 0,
    'Intentos Cobranza': 0,
    'Agente': 'AG002',
    'Motivo Rechazo': '',
    'Referencia': ''
  },
  {
    'ID Pago': '24',
    'Póliza': 'SEGUROS-VIDA-2024-003',
    'Cliente': 'Ana Martínez',
    'Compañía': 'Seguros Monterrey',
    'Monto': 1900,
    'Fecha Vencimiento': '2025-01-15',
    'Fecha Pago': '',
    'Estatus': 'Pendiente',
    'Método Pago': '',
    'Días Mora': 0,
    'Intentos Cobranza': 0,
    'Agente': 'AG001',
    'Motivo Rechazo': '',
    'Referencia': ''
  },
  {
    'ID Pago': '25',
    'Póliza': 'MAPFRE-EMPRESA-2024-004',
    'Cliente': 'Comercial del Norte',
    'Compañía': 'MAPFRE',
    'Monto': 5600,
    'Fecha Vencimiento': '2025-01-18',
    'Fecha Pago': '',
    'Estatus': 'Pendiente',
    'Método Pago': '',
    'Días Mora': 0,
    'Intentos Cobranza': 0,
    'Agente': 'AG001',
    'Motivo Rechazo': '',
    'Referencia': ''
  }
];

// Datos de Indicadores de Cobranza (Resumen)
const indicadoresCobranzaData = [
  {
    'Indicador': 'Efectividad de Cobranza',
    'Valor': '87.5%',
    'Objetivo': '90%',
    'Estado': 'Requiere Atención',
    'Fórmula': '(Primas Cobradas / Primas Emitidas) × 100'
  },
  {
    'Indicador': 'Prima Total Emitida',
    'Valor': '$1,234,567',
    'Objetivo': 'Maximizar',
    'Estado': 'Normal',
    'Fórmula': 'Suma de todas las primas emitidas'
  },
  {
    'Indicador': 'Prima Total Cobrada',
    'Valor': '$1,080,000',
    'Objetivo': 'Maximizar',
    'Estado': 'Normal',
    'Fórmula': 'Suma de todas las primas cobradas'
  },
  {
    'Indicador': 'Prima Pendiente',
    'Valor': '$154,567',
    'Objetivo': 'Minimizar',
    'Estado': 'Atención',
    'Fórmula': 'Emitida - Cobrada'
  },
  {
    'Indicador': 'Lapse Ratio',
    'Valor': '3.2%',
    'Objetivo': '≤ 5%',
    'Estado': 'Excelente',
    'Fórmula': '(Pólizas Canceladas por Mora / Total) × 100'
  },
  {
    'Indicador': 'Tasa de Rehabilitación',
    'Valor': '45%',
    'Objetivo': '≥ 30%',
    'Estado': 'Excelente',
    'Fórmula': '(Pólizas Rehabilitadas / Canceladas) × 100'
  },
  {
    'Indicador': 'Tasa de Rechazo Bancario',
    'Valor': '2.8%',
    'Objetivo': 'Minimizar',
    'Estado': 'Bueno',
    'Fórmula': '(Rechazos / Total Intentos) × 100'
  },
  {
    'Indicador': 'Costo por Gestión',
    'Valor': '$0.45',
    'Objetivo': 'Minimizar',
    'Estado': 'Normal',
    'Fórmula': '(Intentos × $50) / Primas Cobradas'
  },
  {
    'Indicador': 'Pólizas Activas',
    'Valor': '28',
    'Objetivo': 'Maximizar',
    'Estado': 'Normal',
    'Fórmula': 'Conteo de pólizas con estatus activo'
  },
  {
    'Indicador': 'Pólizas en Período de Gracia',
    'Valor': '1',
    'Objetivo': 'Minimizar',
    'Estado': 'Atención',
    'Fórmula': 'Conteo de pólizas en gracia'
  }
];

// Datos de Aging (Antigüedad de Saldos)
const agingData = [
  {
    'Rango': 'Corriente (0 días)',
    'Monto': '$50,000',
    'Cantidad Pagos': 2,
    'Porcentaje': '15.2%',
    'Riesgo': 'Bajo',
    'Acción': 'Seguimiento normal'
  },
  {
    'Rango': '1-30 días',
    'Monto': '$30,000',
    'Cantidad Pagos': 3,
    'Porcentaje': '9.1%',
    'Riesgo': 'Bajo-Medio',
    'Acción': 'Recordatorio'
  },
  {
    'Rango': '31-60 días',
    'Monto': '$20,000',
    'Cantidad Pagos': 2,
    'Porcentaje': '6.1%',
    'Riesgo': 'Medio',
    'Acción': 'Contacto preventivo'
  },
  {
    'Rango': '61-90 días',
    'Monto': '$15,000',
    'Cantidad Pagos': 2,
    'Porcentaje': '4.6%',
    'Riesgo': 'Alto',
    'Acción': 'Gestión intensiva'
  },
  {
    'Rango': '+90 días',
    'Monto': '$10,000',
    'Cantidad Pagos': 1,
    'Porcentaje': '3.0%',
    'Riesgo': 'Muy Alto',
    'Acción': 'Escalamiento'
  }
];

// Crear workbooks
const cobranzaWB = XLSX.utils.book_new();

// Agregar hojas
const pagosWS = XLSX.utils.json_to_sheet(cobranzaData);
const indicadoresWS = XLSX.utils.json_to_sheet(indicadoresCobranzaData);
const agingWS = XLSX.utils.json_to_sheet(agingData);

// Configurar estilos y ancho de columnas
const setColumnWidths = (ws, widths) => {
  ws['!cols'] = widths.map(w => ({ wch: w }));
};

// Pagos - Ancho de columnas
setColumnWidths(pagosWS, [10, 25, 20, 15, 10, 18, 15, 12, 15, 10, 12, 15, 10, 20, 15]);

// Indicadores - Ancho de columnas
setColumnWidths(indicadoresWS, [30, 15, 15, 20, 40]);

// Aging - Ancho de columnas
setColumnWidths(agingWS, [20, 15, 15, 12, 15, 25]);

// Agregar hojas a workbook
XLSX.utils.book_append_sheet(cobranzaWB, pagosWS, "Pagos");
XLSX.utils.book_append_sheet(cobranzaWB, indicadoresWS, "Indicadores");
XLSX.utils.book_append_sheet(cobranzaWB, agingWS, "Aging");

// Crear directorio si no existe
const excelDir = path.join(__dirname, '../public/excel');
if (!fs.existsSync(excelDir)) {
  fs.mkdirSync(excelDir, { recursive: true });
}

// Guardar archivo
XLSX.writeFile(cobranzaWB, path.join(excelDir, 'Cobranza.xlsx'));

console.log('✅ Archivo Excel de Cobranza generado exitosamente:');
console.log('   - Cobranza.xlsx');
console.log(`   Ubicación: ${excelDir}`);
console.log('   Hojas incluidas:');
console.log('   - Pagos (16 registros)');
console.log('   - Indicadores (10 KPIs)');
console.log('   - Aging (5 rangos)');
