export const MEXICO_TIME_ZONE = 'America/Mexico_City'

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export interface DateOnlyParts {
  year: number
  month: number
  day: number
}

export function parseDateOnly(value: string): DateOnlyParts {
  const match = DATE_ONLY_PATTERN.exec(value)
  if (!match) throw new Error(`Fecha de calendario inválida: ${value}`)

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Fecha de calendario inválida: ${value}`)
  }

  return { year, month, day }
}

export function toDateOnly(parts: DateOnlyParts): string {
  return `${parts.year.toString().padStart(4, '0')}-${parts.month.toString().padStart(2, '0')}-${parts.day.toString().padStart(2, '0')}`
}

export function dateOnlyToUtcDate(value: string): Date {
  const { year, month, day } = parseDateOnly(value)
  return new Date(Date.UTC(year, month - 1, day))
}

export function formatDateOnly(value: string, locale = 'es-MX'): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dateOnlyToUtcDate(value))
}

export function todayDateOnly(now = new Date(), timeZone = MEXICO_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function addDaysDateOnly(value: string, days: number): string {
  const date = dateOnlyToUtcDate(value)
  date.setUTCDate(date.getUTCDate() + days)
  return toDateOnly({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  })
}

export function addMonthsDateOnly(value: string, months: number): string {
  const { year, month, day } = parseDateOnly(value)
  const firstOfTarget = new Date(Date.UTC(year, month - 1 + months, 1))
  const targetYear = firstOfTarget.getUTCFullYear()
  const targetMonth = firstOfTarget.getUTCMonth()
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()

  return toDateOnly({
    year: targetYear,
    month: targetMonth + 1,
    day: Math.min(day, lastDay),
  })
}

export function differenceInCalendarDays(left: string, right: string): number {
  return Math.round((dateOnlyToUtcDate(left).getTime() - dateOnlyToUtcDate(right).getTime()) / 86_400_000)
}

export function compareDateOnly(left: string, right: string): number {
  return left.localeCompare(right)
}
