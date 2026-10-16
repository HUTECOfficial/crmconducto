import test from 'node:test'
import assert from 'node:assert/strict'
import { situacionRenovacion, type PolizaRenovable } from '../lib/renovaciones'

const hoy = '2026-10-16'
const poliza = (overrides: Partial<PolizaRenovable>): PolizaRenovable => ({
  ramo: 'autos',
  estatus: 'activa',
  renovacionEstado: 'sin_iniciar',
  vigenciaFin: '2026-11-15',
  ...overrides,
})

test('avisa dentro de los 60 días previos al fin de vigencia', () => {
  const situacion = situacionRenovacion(poliza({}), hoy)
  assert.equal(situacion.estado, 'pendiente')
  assert.equal(situacion.dias, 30)
  assert.equal(situacion.generaAviso, true)
  assert.equal(situacion.prioridad, 'media')
})

test('no avisa fuera de la ventana de 60 días', () => {
  assert.equal(situacionRenovacion(poliza({ vigenciaFin: '2026-12-16' }), hoy).generaAviso, false)
})

test('deja de avisar cuando la renovación ya se completó o tiene póliza nueva', () => {
  assert.equal(situacionRenovacion(poliza({ renovacionEstado: 'renovada' }), hoy).estado, 'renovada')
  assert.equal(situacionRenovacion(poliza({ estatus: 'renovada' }), hoy).generaAviso, false)
  assert.equal(situacionRenovacion(poliza({ renovadaAId: 'nueva' }), hoy).generaAviso, false)
})

test('una renovación en proceso no genera avisos al cliente', () => {
  const situacion = situacionRenovacion(poliza({ renovacionEstado: 'en_proceso' }), hoy)
  assert.equal(situacion.estado, 'en_proceso')
  assert.equal(situacion.generaAviso, false)
})

test('las pólizas canceladas no generan avisos', () => {
  assert.equal(situacionRenovacion(poliza({ estatus: 'cancelada-cliente', vigenciaFin: '2026-10-20' }), hoy).generaAviso, false)
})

test('vencida sin renovar sólo se sigue durante 30 días', () => {
  assert.equal(situacionRenovacion(poliza({ vigenciaFin: '2026-10-01' }), hoy).estado, 'vencida_sin_renovar')
  assert.equal(situacionRenovacion(poliza({ vigenciaFin: '2026-09-01' }), hoy).generaAviso, false)
})

test('en Vida la renovación es al terminar la vigencia del producto', () => {
  const vida = poliza({ ramo: 'vida', vigenciaFin: '2026-11-01', vigenciaProductoFin: '2036-11-01' })
  assert.equal(situacionRenovacion(vida, hoy).generaAviso, false)
  assert.equal(situacionRenovacion({ ...vida, vigenciaProductoFin: '2026-11-01' }, hoy).generaAviso, true)
})
