import { getISODay, parseISO } from 'date-fns'
import type { Repeat, TaskRule } from '../data/types'
import { shiftDate } from './metrics'

/** Варианты повтора в том порядке, в каком они стоят в окне «Добавить задачу». */
export const REPEAT_OPTIONS: Array<{ value: Repeat | 'none'; label: string }> = [
  { value: 'none', label: 'Не повторять' },
  { value: 'daily', label: 'Каждый день' },
  { value: 'weekdays', label: 'По будням' },
  { value: 'weekly', label: 'Раз в неделю' },
]

/** Попадает ли день под правило повтора. Начало, конец и пропуски правила тоже учитываются. */
export function isRuleDate(rule: TaskRule, date: string): boolean {
  if (date < rule.startDate) return false
  if (rule.endDate && date > rule.endDate) return false
  if (rule.skipped.includes(date)) return false
  const weekday = getISODay(parseISO(date))
  if (rule.repeat === 'weekdays') return weekday <= 5
  if (rule.repeat === 'weekly') return weekday === getISODay(parseISO(rule.startDate))
  return true
}

/** Дни недели (с понедельника `weekStart`), на которые у правила должна стоять задача. */
export function ruleDatesInWeek(rule: TaskRule, weekStart: string): string[] {
  return [0, 1, 2, 3, 4, 5, 6]
    .map((offset) => shiftDate(weekStart, offset))
    .filter((date) => isRuleDate(rule, date))
}
