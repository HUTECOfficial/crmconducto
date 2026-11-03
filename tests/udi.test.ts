import test from 'node:test'
import assert from 'node:assert/strict'
import { fechaPagoEsperada, udiParaFecha } from '../lib/udi'

// Valores reales publicados en el DOF.
const valores = { '2026-11-08': 8.893123, '2026-11-09': 8.895396, '2026-11-10': 8.897671 }

test('usa el valor publicado del día de pago', () => {
  assert.deepEqual(udiParaFecha(valores, '2026-11-09'), { valor: 8.895396, fecha: '2026-11-09', estimado: false })
})

test('proyecta los días aún no publicados con el crecimiento diario más reciente', () => {
  const udi = udiParaFecha(valores, '2026-11-12')
  assert.ok(udi?.estimado)
  // Dos días más al ritmo del 9→10 de noviembre (~0.0256% diario).
  const factor = 8.897671 / 8.895396
  assert.ok(Math.abs(udi!.valor - 8.897671 * factor * factor) < 1e-6)
})

test('sin valores anteriores no inventa un valor', () => {
  assert.equal(udiParaFecha(valores, '2026-11-01'), null)
})

test('un recibo vencido se paga hoy; uno por vencer, en su fecha límite', () => {
  assert.equal(fechaPagoEsperada('2026-10-20', '2026-11-02'), '2026-11-02')
  assert.equal(fechaPagoEsperada('2026-11-12', '2026-11-02'), '2026-11-12')
})
