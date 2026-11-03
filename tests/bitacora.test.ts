import test from 'node:test'
import assert from 'node:assert/strict'
import { agruparEntradas, etiquetaCampo, rutaEntrada, type EntradaBitacora } from '../lib/bitacora'

const entrada = (overrides: Partial<EntradaBitacora>): EntradaBitacora => ({
  id: 1,
  createdAt: '2026-11-02T20:00:00.000Z',
  usuarioEmail: 'maggie@crm.com',
  accion: 'modificacion',
  entidad: 'polizas',
  polizaId: 'p1',
  origen: 'base',
  ...overrides,
})

test('etiquetas de campo para columnas y para nombres del historial', () => {
  assert.equal(etiquetaCampo('vendedor_id'), 'Vendedor')
  assert.equal(etiquetaCampo('vendedorId'), 'Vendedor')
  assert.equal(etiquetaCampo('tipoPago'), 'Tipo de pago')
  assert.equal(etiquetaCampo('campo_nuevo'), 'Campo nuevo')
})

test('junta la ráfaga de cambios a una póliza y la encabeza la póliza', () => {
  const grupos = agruparEntradas([
    entrada({ id: 3, entidad: 'pagos', createdAt: '2026-11-02T20:00:05.000Z' }),
    entrada({ id: 2, entidad: 'polizas', createdAt: '2026-11-02T20:00:03.000Z' }),
    entrada({ id: 1, entidad: 'pagos', createdAt: '2026-11-02T20:00:00.000Z' }),
  ])
  assert.equal(grupos.length, 1)
  assert.equal(grupos[0].principal.id, 2)
  assert.deepEqual(grupos[0].relacionadas.map(item => item.id), [3, 1])
})

test('no junta otro usuario, otra póliza, consultas ni cambios separados en el tiempo', () => {
  const grupos = agruparEntradas([
    entrada({ id: 5, createdAt: '2026-11-02T20:10:00.000Z' }),
    entrada({ id: 4, createdAt: '2026-11-02T20:09:59.000Z', usuarioEmail: 'gael@crm.com' }),
    entrada({ id: 3, createdAt: '2026-11-02T20:09:58.000Z', usuarioEmail: 'gael@crm.com', polizaId: 'p2' }),
    entrada({ id: 2, createdAt: '2026-11-02T20:09:57.000Z', usuarioEmail: 'gael@crm.com', polizaId: 'p2', accion: 'consulta' }),
    entrada({ id: 1, createdAt: '2026-11-02T20:00:00.000Z', usuarioEmail: 'gael@crm.com', polizaId: 'p2' }),
  ])
  assert.deepEqual(grupos.map(grupo => grupo.principal.id), [5, 4, 3, 2, 1])
})

test('enlaces: a la póliza, al cliente o a nada si se eliminó', () => {
  assert.equal(rutaEntrada(entrada({ entidad: 'pagos' })), '/polizas?poliza=p1')
  assert.equal(rutaEntrada(entrada({ accion: 'eliminacion', polizaId: 'p1', clienteId: undefined })), null)
  assert.equal(rutaEntrada(entrada({ entidad: 'clientes', polizaId: undefined, clienteId: 'c1' })), '/clientes?cliente=c1')
  assert.equal(rutaEntrada(entrada({ accion: 'consulta', entidad: 'pantalla', polizaId: undefined, ruta: '/comisiones' })), '/comisiones')
})
