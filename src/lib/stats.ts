import type { Goal, HabitSchedule, Task } from '../data/types'
import { getISODay, parseISO } from 'date-fns'
import { weekStartISO } from './dates'
import { percent, shiftDate } from './metrics'

export type WeekSummary = {
  /** Понедельник недели. */
  weekStart: string
  total: number
  done: number
  /** Доля выполненных задач, 0–100. null: задач на неделе не было. */
  percent: number | null
  goalsTotal: number
  goalsDone: number
}

/** Понедельники последних `count` недель, от старой к текущей. */
export function recentWeeks(today: string, count: number): string[] {
  const current = weekStartISO(today)
  return Array.from({ length: count }, (_, index) => shiftDate(current, (index - count + 1) * 7))
}

/** Итоги по каждой неделе из списка: сколько задач и целей было и сколько выполнено. */
export function summarizeWeeks(tasks: Task[], goals: Goal[], weeks: string[]): WeekSummary[] {
  return weeks.map((weekStart) => {
    const weekTasks = tasks.filter((task) => weekStartISO(task.date) === weekStart)
    const weekGoals = goals.filter((goal) => goal.weekStart === weekStart)
    const done = weekTasks.filter((task) => task.isDone).length
    return {
      weekStart,
      total: weekTasks.length,
      done,
      percent: percent(done, weekTasks.length),
      goalsTotal: weekGoals.length,
      goalsDone: weekGoals.filter((goal) => goal.isDone).length,
    }
  })
}

/** Что трекер (и маскот) думает о неделе, в которой выполнено `percent` процентов задач. */
export function weekVerdict(percent: number | null): {
  mood: 'calm' | 'happy' | 'sad'
  title: string
} {
  if (percent === null) return { mood: 'calm', title: 'Неделя ещё чистый лист' }
  if (percent >= 80) return { mood: 'happy', title: 'Отличная неделя' }
  if (percent >= 40) return { mood: 'calm', title: 'Неделя идёт ровно' }
  return { mood: 'sad', title: 'Неделя пока буксует' }
}

/** Строка под вердиктом: сколько задач недели выполнено. */
export function weekSummary(done: number, total: number): string {
  return total === 0
    ? 'На этой неделе пока нет задач'
    : `На этой неделе выполнено ${done} из ${total} задач`
}

/**
 * Сколько раз привычку нужно было отметить за неделю по её расписанию:
 * каждый день 7, по дням недели столько, сколько дней выбрано, N раз в неделю N.
 */
export function weeklyGoal(schedule: HabitSchedule): number {
  if (schedule.frequency === 'days') return schedule.days.length
  if (schedule.frequency === 'weekly') return schedule.timesPerWeek ?? 1
  return 7
}

/**
 * Сколько привычек «удержались» на неделе: отмечены столько раз, сколько требует расписание.
 * У привычек по дням недели считаются только отметки в дни расписания.
 */
export function habitsKept(
  habits: Array<{ schedule: HabitSchedule; checks: ReadonlySet<string> }>,
  weekStart: string,
): number {
  const days = Array.from({ length: 7 }, (_, offset) => shiftDate(weekStart, offset))
  return habits.filter(({ schedule, checks }) => {
    const done = days.filter((date, index) => {
      if (!checks.has(date)) return false
      return schedule.frequency !== 'days' || schedule.days.includes(index + 1)
    }).length
    return done >= weeklyGoal(schedule)
  }).length
}

/** Соседний месяц: 'yyyy-MM' плюс `delta` месяцев. */
export function shiftMonth(month: string, delta: number): string {
  const index = Number(month.slice(0, 4)) * 12 + Number(month.slice(5)) - 1 + delta
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
}

/**
 * Ячейки календаря месяца 'yyyy-MM' по неделям с понедельника: даты месяца по порядку,
 * перед первым числом null на месте дней прошлого месяца.
 */
export function monthDays(month: string): (string | null)[] {
  const first = `${month}-01`
  const next = `${shiftMonth(month, 1)}-01`
  const days: (string | null)[] = Array.from({ length: getISODay(parseISO(first)) - 1 }, () => null)
  for (let date = first; date < next; date = shiftDate(date, 1)) days.push(date)
  return days
}
