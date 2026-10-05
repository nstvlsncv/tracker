import { getISODay, parseISO } from 'date-fns'
import type { Mood, Task } from '../data/types'
import { percent, shiftDate } from './metrics'

/** Настроения дня, от лучшего к худшему: в таком порядке они стоят в выборе. */
export const MOODS: Array<{ value: Mood; kind: MoodKind; label: string }> = [
  { value: 5, kind: 'great', label: 'Отличный день' },
  { value: 4, kind: 'good', label: 'Хороший день' },
  { value: 3, kind: 'okay', label: 'Обычный день' },
  { value: 2, kind: 'low', label: 'Так себе день' },
  { value: 1, kind: 'bad', label: 'Плохой день' },
]

/** Выражение лица маскота для настроения. */
export type MoodKind = 'great' | 'good' | 'okay' | 'low' | 'bad'

const BY_VALUE = new Map(MOODS.map((mood) => [mood.value, mood]))

export function moodKind(mood: Mood): MoodKind {
  return BY_VALUE.get(mood)!.kind
}

export function moodLabel(mood: Mood): string {
  return BY_VALUE.get(mood)!.label
}

/** Среднее настроение, одним знаком после запятой. null: отметок нет. */
export function averageMood(moods: Mood[]): number | null {
  if (moods.length === 0) return null
  return Math.round((moods.reduce((sum, mood) => sum + mood, 0) / moods.length) * 10) / 10
}

export type MoodInsights = {
  /** Сколько дней из последних `days` отмечено. */
  marked: number
  /** Среднее настроение за эти дни. null: отметок нет. */
  average: number | null
  /** День недели (1 = понедельник) с лучшим средним настроением. null: данных мало. */
  bestWeekday: number | null
  /** Доля выполненных задач в хорошие дни (настроение 4–5) и в плохие (1–2), 0–100. null: таких дней с задачами нет. */
  doneOnGoodDays: number | null
  doneOnBadDays: number | null
}

/** Сколько отметок нужно дню недели, чтобы он мог считаться лучшим: один удачный вторник не в счёт. */
const WEEKDAY_MIN_MARKS = 2

/**
 * Выводы из настроения за последние `days` дней: среднее, лучший день недели и как настроение
 * связано с выполненными задачами. Дни без отметки в расчёт не идут.
 */
export function moodInsights(
  moods: Record<string, Mood>,
  tasks: Task[],
  today: string,
  days: number,
): MoodInsights {
  const from = shiftDate(today, -(days - 1))
  const dates = Object.keys(moods).filter((date) => date >= from && date <= today)
  const values = dates.map((date) => moods[date])

  const byWeekday = new Map<number, Mood[]>()
  for (const date of dates) {
    const weekday = getISODay(parseISO(date))
    byWeekday.set(weekday, [...(byWeekday.get(weekday) ?? []), moods[date]])
  }
  let bestWeekday: number | null = null
  let bestAverage = 0
  for (const [weekday, list] of [...byWeekday].sort(([a], [b]) => a - b)) {
    const average = averageMood(list) ?? 0
    if (list.length >= WEEKDAY_MIN_MARKS && average > bestAverage) {
      bestAverage = average
      bestWeekday = weekday
    }
  }

  const doneOn = (fits: (mood: Mood) => boolean) => {
    const chosen = new Set(dates.filter((date) => fits(moods[date])))
    const list = tasks.filter((task) => chosen.has(task.date))
    return percent(list.filter((task) => task.isDone).length, list.length)
  }

  return {
    marked: dates.length,
    average: averageMood(values),
    bestWeekday,
    doneOnGoodDays: doneOn((mood) => mood >= 4),
    doneOnBadDays: doneOn((mood) => mood <= 2),
  }
}
