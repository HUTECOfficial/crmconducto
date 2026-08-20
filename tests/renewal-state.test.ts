import test from 'node:test'
import assert from 'node:assert/strict'
import { cancelarEstadoRenovacion, completarEstadoRenovacion, iniciarEstadoRenovacion } from '../lib/renewal-state'

test('crea y completa una renovación', () => {
  const iniciada = iniciarEstadoRenovacion('pendiente')
  assert.equal(iniciada, 'en_proceso')
  assert.equal(completarEstadoRenovacion(iniciada), 'renovada')
})

test('cancela una renovación sin completar', () => {
  const iniciada = iniciarEstadoRenovacion('pendiente')
  assert.equal(cancelarEstadoRenovacion(iniciada), 'cancelada')
})

test('una renovación cancelada puede iniciarse nuevamente', () => {
  const cancelada = cancelarEstadoRenovacion(iniciarEstadoRenovacion('sin_iniciar'))
  assert.equal(iniciarEstadoRenovacion(cancelada), 'en_proceso')
})

test('una renovación completada no puede reiniciarse', () => {
  assert.throws(() => iniciarEstadoRenovacion('renovada'))
})
