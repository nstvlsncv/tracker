import { weekStartISO } from './dates'
import { shiftDate } from './metrics'

/** Сколько недель показывает история привычки: год с запасом, чтобы влезли все 12 месяцев. */
export const HISTORY_WEEKS = 53

const MONTHS = ['Янв', 'Февр', 'Март', 'Апр', 'Май', 'Июнь', 'Июль', 'Авг', 'Сен', 'Окт', 'Нояб', 'Дек']

export type HistoryWeek = {
  /** Понедельник недели. */
  start: string
  /** Семь дней с понедельника. null: день ещё не наступил, точка не рисуется. */
  days: (string | null)[]
  /** Название месяца над столбцом, если в эту неделю месяц начинается. */
  month: string | null
}

/**
 * Сетка истории привычки: столбцы это недели (с понедельника), последняя неделя текущая.
 * Строится по настоящему календарю, даты в виде 'yyyy-MM-dd'.
 */
export function habitHistory(today: string, weeks = HISTORY_WEEKS): HistoryWeek[] {
  const first = shiftDate(weekStartISO(today), -7 * (weeks - 1))
  return Array.from({ length: weeks }, (_, index) => {
    const start = shiftDate(first, index * 7)
    const dates = Array.from({ length: 7 }, (_, day) => shiftDate(start, day))
    const firstOfMonth = dates.find((date) => date.endsWith('-01'))
    return {
      start,
      days: dates.map((date) => (date > today ? null : date)),
      month: firstOfMonth && firstOfMonth <= today ? MONTHS[Number(firstOfMonth.slice(5, 7)) - 1] : null,
    }
  })
}
