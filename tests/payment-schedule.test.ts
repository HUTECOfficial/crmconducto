import test from 'node:test'
import assert from 'node:assert/strict'
import { calcularMontoMxnUdis, calcularPrimaTotalPlazo, calcularVigenciasPoliza, estadoCobranzaRecibo, generarRecibos, resumirCobranza, type PeriodicidadPago, type ReciboExistente } from '../lib/payment-schedule'

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
  assert.equal(futuros.length, 1)
  assert.equal(futuros[0].monto, 9_000)
  assert.equal(futuros[0].numeroRecibo, 2)
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
