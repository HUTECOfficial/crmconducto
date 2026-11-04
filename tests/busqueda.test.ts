import test from 'node:test'
import assert from 'node:assert/strict'
import { coincideTerminos, patronAproximado, terminosBusqueda, textoBuscablePoliza } from '../lib/busqueda'

const texto = textoBuscablePoliza(
  { numeroPoliza: '92880W03', nombreAsegurado: 'Julio César Lozano', ramo: 'gmm', grupo: 'Dagón' },
  { nombre: 'LOZANO AMADOR JULIO CESAR', telefono: '55 1234-5678', email: 'julio@correo.com', rfc: 'LOAJ800101' },
  'AXA Seguros',
)

test('busca sin acentos, sin importar mayúsculas ni el orden de las palabras', () => {
  assert.ok(coincideTerminos(texto, terminosBusqueda('cesar lozano')))
  assert.ok(coincideTerminos(texto, terminosBusqueda('DAGON axa')))
  assert.ok(coincideTerminos(texto, terminosBusqueda('92880w03')))
  assert.ok(!coincideTerminos(texto, terminosBusqueda('lozano gnp')))
})

test('encuentra teléfonos aunque se capturen sin espacios ni guiones', () => {
  assert.ok(coincideTerminos(texto, terminosBusqueda('5512345678')))
})

test('búsqueda vacía coincide con todo', () => {
  assert.deepEqual(terminosBusqueda('   '), [])
  assert.ok(coincideTerminos(texto, []))
})

test('número de póliza dictado por voz: mismos caracteres en el mismo orden', () => {
  assert.equal(patronAproximado('9669504'), '%9%6%6%9%5%0%4%')
  assert.equal(patronAproximado('96695-u04'), '%9%6%6%9%5%U%0%4%')
  assert.equal(patronAproximado('2964'), null) // muy corto: daría demasiadas coincidencias
})
