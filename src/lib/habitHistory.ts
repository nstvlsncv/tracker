import { weekStartISO } from './dates'
import { shiftDate } from './metrics'

/** На сколько лет назад можно выбрать год, даже если привычка заведена недавно. */
const YEARS_BACK = 4

/**
 * Годы для выбора в истории, новые сверху: текущий и четыре предыдущих (привычку из жизни
 * можно внести задним числом), а если отметки есть и раньше, то до года `since`.
 */
export function historyYears(since: string, today: string): number[] {
  const last = Number(today.slice(0, 4))
  const first = Math.min(Number(since.slice(0, 4)), last - YEARS_BACK)
  return Array.from({ length: last - first + 1 }, (_, index) => last - index)
}

/**
 * Месяцы для выбора в истории на телефоне, новые сверху: текущий и одиннадцать предыдущих,
 * а если отметки есть и раньше, то до месяца `since`.
 */
export function historyMonths(since: string, today: string): string[] {
  const last = monthOf(today)
  const first = [monthOf(since), shiftMonth(last, -11)].sort()[0]
  const months: string[] = []
  for (let month = last; month >= first; month = shiftMonth(month, -1)) months.push(month)
  return months
}

/** Месяц в виде 'yyyy-MM'. */
export function monthOf(date: string): string {
  return date.slice(0, 7)
}

/** Соседний месяц: shiftMonth('2026-01', -1) === '2025-12'. */
export function shiftMonth(month: string, by: number): string {
  const index = Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1 + by
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
}

/**
 * Календарь месяца: строки это недели с понедельника, в каждой семь дней. null: день
 * другого месяца, клетка пустая. Будущие дни месяца в сетке есть, их рисует календарь.
 */
export function monthWeeks(month: string): (string | null)[][] {
  const first = `${month}-01`
  const weeks: (string | null)[][] = []
  for (let start = weekStartISO(first); monthOf(start) <= month; start = shiftDate(start, 7)) {
    if (monthOf(shiftDate(start, 6)) < month) continue
    weeks.push(Array.from({ length: 7 }, (_, day) => {
      const date = shiftDate(start, day)
      return monthOf(date) === month ? date : null
    }))
  }
  return weeks
}

const MONTHS_FULL = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

/** «Октябрь 2026». */
export function formatMonth(month: string): string {
  return `${MONTHS_FULL[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`
}

/** Последние `count` месяцев, начиная с текущего, новые первыми. */
export function recentMonths(today: string, count = 12): string[] {
  return Array.from({ length: count }, (_, back) => shiftMonth(monthOf(today), -back))
}

/** Двенадцать месяцев года по порядку: '2026-01' … '2026-12'. */
export function yearMonths(year: number): string[] {
  return Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`)
}
