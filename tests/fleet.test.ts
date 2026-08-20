import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizarNumeroInciso, numeroIncisoDisponible, validarNumeroInciso } from '../lib/fleet'

test('crea una unidad con número de inciso normalizado', () => {
  assert.equal(normalizarNumeroInciso('  001-A  '), '001-A')
  assert.equal(validarNumeroInciso('001-A'), true)
})

test('rechaza una unidad sin número de inciso', () => {
  assert.equal(validarNumeroInciso('   '), false)
})

test('impide incisos duplicados dentro de la misma flotilla', () => {
  assert.equal(numeroIncisoDisponible('001-a', ['001-A', '002']), false)
  assert.equal(numeroIncisoDisponible('003', ['001-A', '002']), true)
})

test('permite conservar el inciso de la unidad durante edición', () => {
  assert.equal(numeroIncisoDisponible('001-A', ['001-A', '002'], '001-A'), true)
})
