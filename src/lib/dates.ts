import { addDays, format, isSameMonth, isSameYear, isValid, parse, parseISO, startOfWeek } from 'date-fns'
import { ru } from 'date-fns/locale'

const fmt = (date: Date, pattern: string) => format(date, pattern, { locale: ru })

export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/** Понедельник недели, в которую попадает дата. */
export function weekStartOf(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 })
}

/** То же для дат-строк: '2026-09-16' → '2026-09-14'. */
export function weekStartISO(isoDate: string): string {
  return toISODate(weekStartOf(parseISO(isoDate)))
}

/** «15 сентября» */
export function formatDayMonth(date: Date): string {
  return fmt(date, 'd MMMM')
}

/** «15.09.2026» */
export function formatDateNumeric(date: Date): string {
  return fmt(date, 'dd.MM.yyyy')
}

/** «15.09» */
export function formatDayShort(date: Date): string {
  return fmt(date, 'dd.MM')
}

/** «ПН», «ВТ» */
export function formatWeekdayShort(date: Date): string {
  return fmt(date, 'EEEEEE').toUpperCase()
}

/**
 * «14–20 сентября 2026», «28 сентября – 4 октября 2026».
 * С `year: false` год опускается: «14–20 сентября».
 */
export function formatWeekRange(weekStart: Date, { year = true } = {}): string {
  const end = addDays(weekStart, 6)
  const tail = year ? 'd MMMM yyyy' : 'd MMMM'
  if (isSameMonth(weekStart, end)) return `${fmt(weekStart, 'd')}–${fmt(end, tail)}`
  if (isSameYear(weekStart, end)) return `${fmt(weekStart, 'd MMMM')} – ${fmt(end, tail)}`
  return `${fmt(weekStart, 'd MMMM yyyy')} – ${fmt(end, 'd MMMM yyyy')}`
}

/** «14.09–20.09» */
export function formatWeekRangeShort(weekStart: Date): string {
  return `${formatDayShort(weekStart)}–${formatDayShort(addDays(weekStart, 6))}`
}

// Неделя в адресе страницы: /week/2026-W38 (номер недели по ISO, неделя с понедельника).
const WEEK_PARAM = "RRRR-'W'II"

export function toWeekParam(weekStart: string): string {
  return format(parseISO(weekStart), WEEK_PARAM)
}

/** Понедельник недели из адреса или null, если в адресе не неделя. */
export function parseWeekParam(param: string): string | null {
  if (!/^\d{4}-W\d{2}$/.test(param)) return null
  const date = parse(param, WEEK_PARAM, new Date())
  return isValid(date) ? toISODate(weekStartOf(date)) : null
}
