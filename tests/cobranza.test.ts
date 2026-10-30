import test from 'node:test'
import assert from 'node:assert/strict'
import { compararPorVencimiento, nivelSemaforo, situacionCobranzaPoliza } from '../lib/cobranza'
import { generarRecibos, resumirCobranza, type ReciboExistente } from '../lib/payment-schedule'

const recibo = (overrides: Partial<ReciboExistente>): ReciboExistente => ({
  id: 'r1',
  monto: 1_000,
  numeroRecibo: 1,
  totalRecibos: 2,
  fechaEmision: '2026-10-01',
  fechaLimite: '2026-10-31',
  estatus: 'pendiente',
  ...overrides,
})

test('semáforo por días restantes', () => {
  assert.equal(nivelSemaforo(-3, false), 'rojo')
  assert.equal(nivelSemaforo(0, false), 'rojo')
  assert.equal(nivelSemaforo(5, false), 'rojo')
  assert.equal(nivelSemaforo(6, false), 'naranja')
  assert.equal(nivelSemaforo(9, false), 'naranja')
  assert.equal(nivelSemaforo(10, false), 'amarillo')
  assert.equal(nivelSemaforo(15, false), 'amarillo')
  assert.equal(nivelSemaforo(16, false), 'verde')
  assert.equal(nivelSemaforo(30, false), 'verde')
  assert.equal(nivelSemaforo(31, false), 'sin_color')
  assert.equal(nivelSemaforo(2, true), 'morado')
  assert.equal(nivelSemaforo(90, true), 'morado')
})

test('una póliza con todos sus recibos pagados no queda pendiente aunque prima_cobrada esté desfasada', () => {
  const situacion = situacionCobranzaPoliza(
    [recibo({ estatus: 'pagado' }), recibo({ id: 'r2', numeroRecibo: 2, estatus: 'pagado' })],
    { primaTotal: 5_000, primaCobrada: 0 },
    '2026-10-16',
  )
  assert.equal(situacion.estado, 'pagada')
  assert.equal(situacion.pendiente, 0)
  assert.equal(situacion.semaforo, 'sin_color')
})

test('un pago por validar pinta morado y no cuenta como cobrado', () => {
  const situacion = situacionCobranzaPoliza(
    [recibo({ estatus: 'por_validar' }), recibo({ id: 'r2', numeroRecibo: 2, fechaLimite: '2027-05-01' })],
    { primaTotal: 2_000, primaCobrada: 0 },
    '2026-10-16',
  )
  assert.equal(situacion.estado, 'pendiente')
  assert.equal(situacion.semaforo, 'morado')
  assert.equal(situacion.cobrado, 0)
  assert.equal(situacion.porValidar, 1_000)
  assert.equal(situacion.pendiente, 1_000)
  // No se avanza al recibo 2 hasta validar el 1.
  assert.equal(situacion.reciboActual?.id, 'r1')
})

test('el recibo actual es el próximo por vencer y define los días', () => {
  const situacion = situacionCobranzaPoliza(
    [recibo({ estatus: 'pagado' }), recibo({ id: 'r2', numeroRecibo: 2, fechaLimite: '2026-10-24' })],
    { primaTotal: 2_000, primaCobrada: 1_000 },
    '2026-10-16',
  )
  assert.equal(situacion.reciboActual?.id, 'r2')
  assert.equal(situacion.diasRestantes, 8)
  assert.equal(situacion.semaforo, 'naranja')
})

test('mientras el recibo 1 espera validación, el recibo en curso sigue siendo el 1', () => {
  const recibos = [
    recibo({ id: 'r1', estatus: 'por_validar', fechaLimite: '2026-10-10' }),
    recibo({ id: 'r2', numeroRecibo: 2, fechaLimite: '2026-11-10' }),
  ]
  const porValidar = situacionCobranzaPoliza(recibos, { primaTotal: 2_000, primaCobrada: 0 }, '2026-10-16')
  assert.equal(porValidar.reciboActual?.id, 'r1')
  assert.equal(porValidar.semaforo, 'morado')
  // Al validarlo, la póliza avanza al recibo 2 con su propia fecha límite.
  const validado = situacionCobranzaPoliza([{ ...recibos[0], estatus: 'pagado' }, recibos[1]], { primaTotal: 2_000, primaCobrada: 1_000 }, '2026-10-16')
  assert.equal(validado.reciboActual?.id, 'r2')
  assert.equal(validado.fechaVencimiento, '2026-11-10')
})

test('pólizas sin recibos usan prima total menos cobrada', () => {
  const situacion = situacionCobranzaPoliza([], { primaTotal: 3_000, primaCobrada: 1_000, fechaVencimiento: '2026-10-10' }, '2026-10-16')
  assert.equal(situacion.estado, 'vencida')
  assert.equal(situacion.pendiente, 2_000)
  assert.equal(situacion.semaforo, 'rojo')
})

test('ordena por vencimiento con las pagadas al final', () => {
  const hoy = '2026-10-16'
  const pagada = situacionCobranzaPoliza([recibo({ estatus: 'pagado' })], { primaTotal: 1_000, primaCobrada: 1_000 }, hoy)
  const lejana = situacionCobranzaPoliza([recibo({ fechaLimite: '2026-12-01' })], { primaTotal: 1_000, primaCobrada: 0 }, hoy)
  const vencida = situacionCobranzaPoliza([recibo({ fechaLimite: '2026-10-01' })], { primaTotal: 1_000, primaCobrada: 0 }, hoy)
  const ordenadas = [pagada, lejana, vencida].sort(compararPorVencimiento)
  assert.deepEqual(ordenadas, [vencida, lejana, pagada])
})

test('resumen separa cobrado, por validar y pendiente', () => {
  const resumen = resumirCobranza([
    recibo({ estatus: 'pagado' }),
    recibo({ id: 'r2', estatus: 'por_validar' }),
    recibo({ id: 'r3', estatus: 'pendiente' }),
  ], 3_000, '2026-10-16')
  assert.equal(resumen.cobrado, 1_000)
  assert.equal(resumen.porValidar, 1_000)
  assert.equal(resumen.pendiente, 1_000)
  assert.equal(resumen.estatus, 'pendiente')
})

test('la regeneración conserva los recibos por validar', () => {
  const recibos = generarRecibos({
    primaTotal: 4_000,
    vigenciaInicio: '2026-01-01',
    vigenciaFin: '2027-01-01',
    periodicidad: 'trimestral',
    recibosPagados: [recibo({ estatus: 'por_validar', fechaEmision: '2026-01-01', totalRecibos: 4 })],
  })
  assert.equal(recibos.length, 3)
  assert.equal(recibos[0].numeroRecibo, 2)
  assert.equal(recibos.reduce((sum, item) => sum + item.monto, 0), 3_000)
})

test('la fecha límite usa los días de gracia capturados', () => {
  const recibos = generarRecibos({
    primaTotal: 2_000,
    vigenciaInicio: '2026-01-01',
    vigenciaFin: '2027-01-01',
    periodicidad: 'semestral',
    diasGraciaPrimerRecibo: 15,
    diasGraciaSubsecuentes: 10,
  })
  assert.deepEqual(recibos.map(item => item.fechaLimite), ['2026-01-16', '2026-07-11'])
})
