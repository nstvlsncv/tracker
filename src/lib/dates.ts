import { addDays, format, isSameMonth, isSameYear, startOfWeek } from 'date-fns'
import { ru } from 'date-fns/locale'

const fmt = (date: Date, pattern: string) => format(date, pattern, { locale: ru })

export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/** Понедельник недели, в которую попадает дата. */
export function weekStartOf(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 })
}

/** «15 сентября» */
export function formatDayMonth(date: Date): string {
  return fmt(date, 'd MMMM')
}

/** «15.09» */
export function formatDayShort(date: Date): string {
  return fmt(date, 'dd.MM')
}

/** «14–20 сентября 2026», «28 сентября – 4 октября 2026» */
export function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6)
  if (isSameMonth(weekStart, end)) return `${fmt(weekStart, 'd')}–${fmt(end, 'd MMMM yyyy')}`
  if (isSameYear(weekStart, end)) return `${fmt(weekStart, 'd MMMM')} – ${fmt(end, 'd MMMM yyyy')}`
  return `${fmt(weekStart, 'd MMMM yyyy')} – ${fmt(end, 'd MMMM yyyy')}`
}

/** «14.09–20.09» */
export function formatWeekRangeShort(weekStart: Date): string {
  return `${formatDayShort(weekStart)}–${formatDayShort(addDays(weekStart, 6))}`
}
