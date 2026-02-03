import { Poliza } from "@/data/polizas"
import { Pago } from "@/data/pagos"

export interface KPICobranza {
  // 1. Indicadores Financieros (KPIs de Flujo)
  efectividadCobranza: number // (Primas Cobradas / Primas Emitidas) x 100
  primaTotalEmitida: number
  primaTotalCobrada: number
  primaPendiente: number
  
  // 2. Aging (Antigüedad de Saldos)
  agingCorriente: number // 0 días
  aging1a30: number // 1-30 días
  aging31a60: number // 31-60 días
  aging61a90: number // 61-90 días
  agingMas90: number // +90 días
  
  // 3. Cancelación por Falta de Pago
  lapseRatio: number // % de pólizas canceladas por falta de pago
  polizasActivas: number
  polizasCanceladasPorMora: number
  polizasEnGracia: number
  
  // 4. Rehabilitaciones
  polizasRehabilitadas: number
  tasaRehabilitacion: number // % de pólizas recuperadas
  
  // 5. Rechazo Bancario
  tasaRechazo: number // % de intentos fallidos
  rechazosTotal: number
  motivosRechazo: {
    fondosInsuficientes: number
    tarjetaVencida: number
    bloqueoSeguridad: number
    otro: number
  }
  
  // 6. Mix de Canales de Cobro
  canalDomiciliacion: number // %
  canalTransferencia: number // %
  canalTarjeta: number // %
  canalEfectivo: number // %
  canalCheque: number // %
  
  // 7. Costo por Gestión
  costoPromedioPorPeso: number // Costo de recuperación por peso cobrado
  intentosCobranzaPromedio: number
}

export function calcularKPIsCobranza(polizas: Poliza[], pagos: Pago[]): KPICobranza {
  // 1. Calcular Efectividad de Cobranza
  const primaTotalEmitida = polizas.reduce((sum, p) => sum + p.primaEmitida, 0)
  const primaTotalCobrada = polizas.reduce((sum, p) => sum + p.primaCobrada, 0)
  const primaPendiente = primaTotalEmitida - primaTotalCobrada
  const efectividadCobranza = primaTotalEmitida > 0 ? (primaTotalCobrada / primaTotalEmitida) * 100 : 0

  // 2. Calcular Aging (Antigüedad de Saldos)
  const hoy = new Date()
  const pagosVencidos = pagos.filter(p => p.estatus === "vencido" || p.estatus === "pendiente")
  
  let agingCorriente = 0
  let aging1a30 = 0
  let aging31a60 = 0
  let aging61a90 = 0
  let agingMas90 = 0

  pagosVencidos.forEach(pago => {
    const diasMora = pago.diasMora || 0
    if (diasMora === 0) agingCorriente += pago.monto
    else if (diasMora <= 30) aging1a30 += pago.monto
    else if (diasMora <= 60) aging31a60 += pago.monto
    else if (diasMora <= 90) aging61a90 += pago.monto
    else agingMas90 += pago.monto
  })

  // 3. Cancelación por Falta de Pago (Lapse Ratio)
  const polizasActivas = polizas.filter(p => p.estatus === "activa").length
  const polizasCanceladasPorMora = polizas.filter(p => p.estatus === "cancelada" && p.cancelacionMotivo === "falta-pago").length
  const polizasEnGracia = polizas.filter(p => p.estatus === "gracia").length
  const lapseRatio = polizasActivas > 0 ? (polizasCanceladasPorMora / (polizasActivas + polizasCanceladasPorMora)) * 100 : 0

  // 4. Rehabilitaciones
  const polizasRehabilitadas = polizas.filter(p => p.estatus === "rehabilitada").length
  const polizasCanceladas = polizas.filter(p => p.estatus === "cancelada").length
  const tasaRehabilitacion = polizasCanceladas > 0 ? (polizasRehabilitadas / polizasCanceladas) * 100 : 0

  // 5. Rechazo Bancario
  const pagosRechazados = pagos.filter(p => p.estatus === "rechazado")
  const pagosTotales = pagos.length
  const tasaRechazo = pagosTotales > 0 ? (pagosRechazados.length / pagosTotales) * 100 : 0
  
  const motivosRechazo = {
    fondosInsuficientes: pagosRechazados.filter(p => p.motivoRechazo === "fondos-insuficientes").length,
    tarjetaVencida: pagosRechazados.filter(p => p.motivoRechazo === "tarjeta-vencida").length,
    bloqueoSeguridad: pagosRechazados.filter(p => p.motivoRechazo === "bloqueo-seguridad").length,
    otro: pagosRechazados.filter(p => p.motivoRechazo === "otro").length,
  }

  // 6. Mix de Canales de Cobro
  const pagosProcesados = pagos.filter(p => p.estatus === "pagado")
  const totalPagosProcesados = pagosProcesados.length || 1
  
  const canalDomiciliacion = (pagosProcesados.filter(p => p.metodoPago === "domiciliacion").length / totalPagosProcesados) * 100
  const canalTransferencia = (pagosProcesados.filter(p => p.metodoPago === "transferencia").length / totalPagosProcesados) * 100
  const canalTarjeta = (pagosProcesados.filter(p => p.metodoPago === "tarjeta").length / totalPagosProcesados) * 100
  const canalEfectivo = (pagosProcesados.filter(p => p.metodoPago === "efectivo").length / totalPagosProcesados) * 100
  const canalCheque = (pagosProcesados.filter(p => p.metodoPago === "cheque").length / totalPagosProcesados) * 100

  // 7. Costo por Gestión
  const totalIntentos = pagos.reduce((sum, p) => sum + (p.intentosCobranza || 0), 0)
  const intentosCobranzaPromedio = pagosProcesados.length > 0 ? totalIntentos / pagosProcesados.length : 0
  // Asumiendo costo de $50 por intento de cobranza
  const costoPromedioPorPeso = primaTotalCobrada > 0 ? (totalIntentos * 50) / primaTotalCobrada : 0

  return {
    efectividadCobranza: Math.round(efectividadCobranza * 100) / 100,
    primaTotalEmitida,
    primaTotalCobrada,
    primaPendiente,
    agingCorriente,
    aging1a30,
    aging31a60,
    aging61a90,
    agingMas90,
    lapseRatio: Math.round(lapseRatio * 100) / 100,
    polizasActivas,
    polizasCanceladasPorMora,
    polizasEnGracia,
    polizasRehabilitadas,
    tasaRehabilitacion: Math.round(tasaRehabilitacion * 100) / 100,
    tasaRechazo: Math.round(tasaRechazo * 100) / 100,
    rechazosTotal: pagosRechazados.length,
    motivosRechazo,
    canalDomiciliacion: Math.round(canalDomiciliacion * 100) / 100,
    canalTransferencia: Math.round(canalTransferencia * 100) / 100,
    canalTarjeta: Math.round(canalTarjeta * 100) / 100,
    canalEfectivo: Math.round(canalEfectivo * 100) / 100,
    canalCheque: Math.round(canalCheque * 100) / 100,
    costoPromedioPorPeso: Math.round(costoPromedioPorPeso * 100) / 100,
    intentosCobranzaPromedio: Math.round(intentosCobranzaPromedio * 100) / 100,
  }
}
