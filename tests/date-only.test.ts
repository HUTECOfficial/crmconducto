import test from 'node:test'
import assert from 'node:assert/strict'
import { addDaysDateOnly, addMonthsDateOnly, differenceInCalendarDays, formatDateOnly, todayDateOnly } from '../lib/date-only'

test('las fechas de vigencia se muestran sin desfase de día', () => {
  assert.equal(formatDateOnly('2026-08-20'), '20/08/2026')
  assert.equal(formatDateOnly('2026-01-01'), '01/01/2026')
})

test('la aritmética de fechas de calendario no depende de UTC local', () => {
  assert.equal(addDaysDateOnly('2026-01-31', 30), '2026-03-02')
  assert.equal(addMonthsDateOnly('2024-01-31', 1), '2024-02-29')
  assert.equal(differenceInCalendarDays('2026-03-01', '2026-02-28'), 1)
})

test('la fecha actual se calcula en la zona horaria de México', () => {
  assert.equal(todayDateOnly(new Date('2026-08-21T04:30:00.000Z')), '2026-08-20')
})
