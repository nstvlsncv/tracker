import type { Goal, Task } from '../data/types'
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
