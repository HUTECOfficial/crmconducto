import test from 'node:test'
import assert from 'node:assert/strict'
import { calcularMontoMxnUdis, calcularPrimaTotalPlazo, calcularVigenciasPoliza, completarImportesComprometidos, estadoCobranzaRecibo, generarRecibos, resumirCobranza, type PeriodicidadPago, type ReciboExistente } from '../lib/payment-schedule'

const expectedCounts: Record<PeriodicidadPago, number> = {
  anual: 1,
  semestral: 2,
  trimestral: 4,
  mensual: 12,
}

for (const [periodicidad, expected] of Object.entries(expectedCounts) as Array<[PeriodicidadPago, number]>) {
  test(`genera recibos para periodicidad ${periodicidad}`, () => {
    const recibos = generarRecibos({
      primaTotal: 12_000,
      vigenciaInicio: '2026-01-15',
      vigenciaFin: '2027-01-15',
      periodicidad,
    })
    assert.equal(recibos.length, expected)
    assert.equal(recibos.reduce((sum, recibo) => sum + recibo.monto, 0), 12_000)
    assert.equal(recibos[0].fechaEmision, '2026-01-15')
    assert.equal(recibos[0].fechaLimite, '2026-02-14')
  })
}

test('la cobranza semestral de flotilla no se fragmenta por meses', () => {
  const recibos = generarRecibos({
    primaTotal: 60_000,
    vigenciaInicio: '2026-02-01',
    vigenciaFin: '2027-02-01',
    periodicidad: 'semestral',
  })
  assert.deepEqual(recibos.map(recibo => recibo.fechaEmision), ['2026-02-01', '2026-08-01'])
  assert.deepEqual(recibos.map(recibo => recibo.monto), [30_000, 30_000])
})

test('al cambiar periodicidad conserva los recibos pagados y recalcula sólo el saldo', () => {
  const pagado: ReciboExistente = {
    id: 'historico-1',
    monto: 3_000,
    numeroRecibo: 1,
    totalRecibos: 4,
    fechaEmision: '2026-01-01',
    fechaLimite: '2026-01-31',
    fechaPago: '2026-01-20',
    estatus: 'pagado',
  }
  const copia = structuredClone(pagado)
  const futuros = generarRecibos({
    primaTotal: 12_000,
    vigenciaInicio: '2026-01-01',
    vigenciaFin: '2027-01-01',
    periodicidad: 'semestral',
    recibosPagados: [pagado],
  })
  assert.deepEqual(pagado, copia)
  // El trimestre pagado cubre hasta abril; los 9 meses restantes se cobran semestralmente.
  assert.deepEqual(futuros.map(recibo => recibo.fechaEmision), ['2026-04-01', '2026-10-01'])
  assert.deepEqual(futuros.map(recibo => recibo.numeroRecibo), [2, 3])
  assert.deepEqual(futuros.map(recibo => recibo.monto), [6_000, 3_000])
})

test('en Vida, al cambiar de anual a mensual sólo los años restantes pasan a mensual', () => {
  const pagados: ReciboExistente[] = [2023, 2024, 2025].map((anio, index) => ({
    id: `anual-${index + 1}`,
    monto: 3_211.66,
    numeroRecibo: index + 1,
    totalRecibos: 10,
    fechaEmision: `${anio}-03-29`,
    fechaLimite: `${anio}-04-28`,
    estatus: 'pagado' as const,
  }))
  const copia = structuredClone(pagados)
  const recibos = generarRecibos({
    primaTotal: 32_116.6,
    primaAnual: 3_211.66,
    vigenciaInicio: '2023-03-29',
    vigenciaFin: '2033-03-29',
    periodicidad: 'mensual',
    primerRecibo: 267.64,
    recibosPagados: pagados,
  })
  assert.deepEqual(pagados, copia)
  // 7 años restantes × 12 meses, a partir de que termina el último año pagado.
  assert.equal(recibos.length, 84)
  assert.equal(recibos[0].numeroRecibo, 4)
  assert.equal(recibos[0].totalRecibos, 87)
  assert.equal(recibos[0].fechaEmision, '2026-03-29')
  assert.equal(recibos[0].anualidad, 4)
  assert.equal(recibos[83].fechaEmision, '2033-02-28')
  assert.equal(recibos[0].monto, 267.64)
  // Cada año restante suma exactamente su prima anual.
  for (let anualidad = 4; anualidad <= 10; anualidad++) {
    const delAnio = recibos.filter(recibo => recibo.anualidad === anualidad)
    assert.equal(delAnio.length, 12)
    assert.equal(Math.round(delAnio.reduce((sum, recibo) => sum + recibo.monto, 0) * 100) / 100, 3_211.66)
  }
})

test('al editar la prima, los pagados quedan como evidencia y el saldo se reparte entre los pendientes', () => {
  const pagados: ReciboExistente[] = [1, 2, 3].map(numero => ({
    id: `pagado-${numero}`,
    monto: 1_000,
    numeroRecibo: numero,
    totalRecibos: 12,
    fechaEmision: `2026-0${numero}-01`,
    fechaLimite: `2026-0${numero}-28`,
    estatus: 'pagado' as const,
  }))
  const copia = structuredClone(pagados)
  const pendientes = generarRecibos({
    primaTotal: 13_200,
    vigenciaInicio: '2026-01-01',
    vigenciaFin: '2027-01-01',
    periodicidad: 'mensual',
    recibosPagados: pagados,
  })
  assert.deepEqual(pagados, copia)
  assert.equal(pendientes.length, 9)
  assert.deepEqual(pendientes.map(recibo => recibo.numeroRecibo), [4, 5, 6, 7, 8, 9, 10, 11, 12])
  // Saldo 10,200 entre 9 recibos: ninguno carga sólo con la diferencia.
  assert.ok(pendientes.every(recibo => Math.abs(recibo.monto - 10_200 / 9) < 0.05))
  assert.equal(Math.round(pendientes.reduce((sum, recibo) => sum + recibo.monto, 0) * 100) / 100, 10_200)
})

test('rechaza un primer recibo mayor que la prima total', () => {
  assert.throws(() => generarRecibos({
    primaTotal: 1_000,
    vigenciaInicio: '2026-05-01',
    vigenciaFin: '2027-05-01',
    periodicidad: 'semestral',
    primerRecibo: 1_001,
  }))
})

test('el plazo central de pago es de 30 días y determina el vencimiento', () => {
  const [recibo] = generarRecibos({
    primaTotal: 1_000,
    vigenciaInicio: '2026-05-01',
    vigenciaFin: '2027-05-01',
    periodicidad: 'anual',
  })
  assert.equal(recibo.fechaLimite, '2026-05-31')
  assert.equal(estadoCobranzaRecibo(recibo, '2026-05-24'), 'proximo_vencer')
  assert.equal(estadoCobranzaRecibo(recibo, '2026-06-01'), 'vencido')
})

test('calcula por separado las vigencias anual, de pago y del producto', () => {
  assert.deepEqual(calcularVigenciasPoliza('2026-02-28', 10, 20), {
    vigenciaAnualFin: '2027-02-28',
    vigenciaPagoFin: '2036-02-28',
    vigenciaProductoFin: '2046-02-28',
  })
  assert.throws(() => calcularVigenciasPoliza('2026-01-01', 20, 10))
})

test('una póliza de vida genera recibos durante todo el plazo de pago por anualidad', () => {
  const primaTotal = calcularPrimaTotalPlazo(12_000, 3)
  const recibos = generarRecibos({
    primaTotal,
    vigenciaInicio: '2026-01-15',
    vigenciaFin: '2029-01-15',
    periodicidad: 'semestral',
  })
  assert.equal(primaTotal, 36_000)
  assert.equal(recibos.length, 6)
  assert.deepEqual(recibos.map(recibo => recibo.anualidad), [1, 1, 2, 2, 3, 3])
  assert.deepEqual(recibos.map(recibo => recibo.monto), [6_000, 6_000, 6_000, 6_000, 6_000, 6_000])
})

test('en Vida, los recibos subsecuentes salen de prima anual menos primer recibo', () => {
  const recibos = generarRecibos({
    primaTotal: 24_000,
    primaAnual: 12_000,
    vigenciaInicio: '2026-01-15',
    vigenciaFin: '2028-01-15',
    periodicidad: 'trimestral',
    primerRecibo: 4_500,
  })
  assert.deepEqual(recibos.map(recibo => recibo.monto), [4_500, 2_500, 2_500, 2_500, 4_500, 2_500, 2_500, 2_500])
  assert.deepEqual(recibos.map(recibo => recibo.anualidad), [1, 1, 1, 1, 2, 2, 2, 2])
})

test('convierte manualmente un recibo UDIS a MXN con precisión monetaria', () => {
  assert.equal(calcularMontoMxnUdis(1_250.5, 8.547321), 10_688.42)
  assert.throws(() => calcularMontoMxnUdis(1_250.5, 0))
})

test('al anular un pago el recibo vuelve a formar parte del saldo pendiente', () => {
  const pagado: ReciboExistente = {
    id: 'pago-1',
    monto: 12_000,
    numeroRecibo: 1,
    totalRecibos: 1,
    fechaEmision: '2026-01-01',
    fechaLimite: '2026-01-31',
    fechaPago: '2026-01-15',
    estatus: 'pagado',
  }
  assert.equal(resumirCobranza([pagado], 12_000).estatus, 'pagada')
  const anulado = { ...pagado, estatus: 'pendiente' as const, fechaPago: undefined }
  const resumen = resumirCobranza([anulado], 12_000, '2026-01-20')
  assert.equal(resumen.estatus, 'pendiente')
  assert.equal(resumen.cobrado, 0)
  assert.equal(resumen.pendiente, 12_000)
})

test('un recibo pagado importado en $0 toma el primer recibo y el saldo va al siguiente', () => {
  const pagadoSinImporte: ReciboExistente = {
    id: 'importado-1',
    monto: 0,
    numeroRecibo: 1,
    totalRecibos: 2,
    fechaEmision: '2026-04-21',
    fechaLimite: '2026-05-06',
    fechaPago: '2026-05-12',
    estatus: 'pagado',
  }
  const entrada = {
    primaTotal: 33_252.42,
    vigenciaInicio: '2026-04-21',
    vigenciaFin: '2027-04-21',
    periodicidad: 'semestral' as const,
    primerRecibo: 17_000,
    recibosPagados: [pagadoSinImporte],
    periodicidadPagados: 'semestral' as const,
  }
  assert.equal(completarImportesComprometidos(entrada)[0].monto, 17_000)
  const recibos = generarRecibos(entrada)
  assert.equal(recibos.length, 1)
  assert.equal(recibos[0].numeroRecibo, 2)
  assert.equal(recibos[0].monto, 16_252.42)
})

test('sin primer recibo, el pagado en $0 toma su parte proporcional', () => {
  const recibos = generarRecibos({
    primaTotal: 20_000,
    vigenciaInicio: '2026-01-01',
    vigenciaFin: '2027-01-01',
    periodicidad: 'semestral',
    recibosPagados: [{ id: 'p1', monto: 0, numeroRecibo: 1, totalRecibos: 2, fechaEmision: '2026-01-01', fechaLimite: '2026-01-31', estatus: 'pagado' }],
  })
  assert.deepEqual(recibos.map(recibo => recibo.monto), [10_000])
})
