import test from 'node:test'
import assert from 'node:assert/strict'
import { baseComisionRecibo, calcularComision, estadoComisionAlAnularPago, resumirComisiones } from '../lib/comisiones'

test('la comisión es el porcentaje del recibo validado', () => {
  assert.equal(calcularComision(4_250, 10), 425)
  assert.equal(calcularComision(1_234.56, 12.5), 154.32)
})

test('rechaza porcentajes fuera de rango', () => {
  assert.throws(() => calcularComision(1_000, 120))
  assert.throws(() => calcularComision(1_000, -1))
})

test('en recibos UDIS la base es el importe convertido a MXN', () => {
  assert.equal(baseComisionRecibo({ moneda: 'UDIS', monto: 500, montoMxn: 4_250 }), 4_250)
  assert.equal(baseComisionRecibo({ moneda: 'MXN', monto: 1_000 }), 1_000)
  assert.throws(() => baseComisionRecibo({ moneda: 'UDIS', monto: 500 }))
  assert.throws(() => baseComisionRecibo({ moneda: 'USD', monto: 1_000 }))
})

test('anular un pago cancela la comisión pendiente y marca para revertir la pagada', () => {
  assert.equal(estadoComisionAlAnularPago('pendiente'), 'cancelada')
  assert.equal(estadoComisionAlAnularPago('pagada'), 'por_revertir')
  assert.equal(estadoComisionAlAnularPago('cancelada'), 'cancelada')
})

test('resume pendientes, pagadas y por revertir', () => {
  const resumen = resumirComisiones([
    { monto: 100, estatus: 'pendiente' },
    { monto: 50.5, estatus: 'pagada' },
    { monto: 20, estatus: 'por_revertir' },
    { monto: 999, estatus: 'cancelada' },
  ])
  assert.deepEqual(resumen, { pendiente: 100, pagada: 50.5, porRevertir: 20, total: 150.5 })
})
