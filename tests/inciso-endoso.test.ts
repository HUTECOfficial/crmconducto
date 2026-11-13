import test from 'node:test'
import assert from 'node:assert/strict'
import { formatoIncisoEndoso, separarIncisoEndoso, unirIncisoEndoso } from '../lib/inciso-endoso'

test('separa inciso y endoso guardados juntos', () => {
  assert.deepEqual(separarIncisoEndoso('652 | AI749377'), { inciso: '652', endoso: 'AI749377' })
})

test('un valor anterior sin separador se toma como inciso', () => {
  assert.deepEqual(separarIncisoEndoso('652'), { inciso: '652', endoso: '' })
  assert.deepEqual(separarIncisoEndoso(undefined), { inciso: '', endoso: '' })
})

test('une los dos campos y conserva sólo el endoso cuando no hay inciso', () => {
  assert.equal(unirIncisoEndoso(' 652 ', ' AI749377 '), '652 | AI749377')
  assert.equal(unirIncisoEndoso('652', ''), '652')
  assert.equal(unirIncisoEndoso('', 'AI749377'), '| AI749377')
  assert.equal(unirIncisoEndoso('', ''), '')
  assert.deepEqual(separarIncisoEndoso(unirIncisoEndoso('', 'AI749377')), { inciso: '', endoso: 'AI749377' })
})

test('muestra cada campo con su etiqueta', () => {
  assert.equal(formatoIncisoEndoso('652 | AI749377'), 'Inciso 652 · Endoso AI749377')
  assert.equal(formatoIncisoEndoso('| AI749377'), 'Endoso AI749377')
  assert.equal(formatoIncisoEndoso(''), '')
})
