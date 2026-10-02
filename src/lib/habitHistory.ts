import { weekStartISO } from './dates'
import { shiftDate } from './metrics'

/** Сколько недель показывают «последние 12 месяцев»: год с запасом, чтобы влезли все месяцы. */
export const HISTORY_WEEKS = 53

const MONTHS = ['Янв', 'Февр', 'Март', 'Апр', 'Май', 'Июнь', 'Июль', 'Авг', 'Сен', 'Окт', 'Нояб', 'Дек']

/** Что показывает история: последние 12 месяцев или календарный год. */
export type HistoryPeriod = 'recent' | number

export type HistoryWeek = {
  /** Понедельник недели. */
  start: string
  /** Семь дней с понедельника. null: день вне периода или ещё не наступил, точка не рисуется. */
  days: (string | null)[]
  /** Название месяца над столбцом, если в эту неделю месяц начинается. */
  month: string | null
}

/**
 * Сетка истории привычки: столбцы это недели с понедельника, строки дни недели.
 * Строится по настоящему календарю, даты в виде 'yyyy-MM-dd'. Недели после сегодняшней
 * не рисуются, поэтому текущий год обрывается на текущей неделе.
 */
export function habitHistory(today: string, period: HistoryPeriod = 'recent'): HistoryWeek[] {
  const from =
    period === 'recent' ? shiftDate(weekStartISO(today), -7 * (HISTORY_WEEKS - 1)) : `${period}-01-01`
  const to = period === 'recent' ? today : `${period}-12-31`
  const inside = (date: string) => date >= from && date <= to && date <= today

  const weeks: HistoryWeek[] = []
  for (let start = weekStartISO(from); start <= to && start <= today; start = shiftDate(start, 7)) {
    const dates = Array.from({ length: 7 }, (_, day) => shiftDate(start, day))
    const firstOfMonth = dates.find((date) => date.endsWith('-01') && inside(date))
    weeks.push({
      start,
      days: dates.map((date) => (inside(date) ? date : null)),
      month: firstOfMonth ? MONTHS[Number(firstOfMonth.slice(5, 7)) - 1] : null,
    })
  }
  return weeks
}

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
