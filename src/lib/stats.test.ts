import { describe, expect, it } from 'vitest'
import type { Goal, Task } from '../data/types'
import { habitsKept, monthDays, recentWeeks, shiftMonth, summarizeWeeks, weeklyGoal } from './stats'

const task = (date: string, isDone: boolean): Task => ({
  id: date + isDone,
  date,
  title: 'Задача',
  isDone,
  doneAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
})
const goal = (weekStart: string, isDone: boolean): Goal => ({
  id: weekStart + isDone,
  weekStart,
  title: 'Цель',
  isDone,
  doneAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
})

describe('recentWeeks', () => {
  it('отдаёт понедельники от старой недели к текущей', () => {
    expect(recentWeeks('2026-10-03', 3)).toEqual(['2026-09-14', '2026-09-21', '2026-09-28'])
  })
})

describe('summarizeWeeks', () => {
  it('считает задачи и цели по неделям, пустая неделя без процента', () => {
    const tasks = [task('2026-09-28', true), task('2026-10-03', false), task('2026-09-22', true)]
    const goals = [goal('2026-09-28', true), goal('2026-09-28', false)]
    const [empty, previous, current] = summarizeWeeks(tasks, goals, recentWeeks('2026-10-03', 3))
    expect(empty).toMatchObject({ total: 0, percent: null })
    expect(previous).toMatchObject({ total: 1, done: 1, percent: 100 })
    expect(current).toMatchObject({ total: 2, done: 1, percent: 50, goalsTotal: 2, goalsDone: 1 })
  })
})

describe('habitsKept', () => {
  // Неделя с понедельника 28 сентября 2026.
  const WEEK = '2026-09-28'
  const set = (...days: string[]) => new Set(days)

  it('знает норму недели по расписанию', () => {
    expect(weeklyGoal({ frequency: 'daily', days: [], timesPerWeek: null })).toBe(7)
    expect(weeklyGoal({ frequency: 'days', days: [1, 3, 5], timesPerWeek: null })).toBe(3)
    expect(weeklyGoal({ frequency: 'weekly', days: [], timesPerWeek: 2 })).toBe(2)
  })

  it('считает привычки, набравшие норму', () => {
    const habits = [
      // Пн, ср, пт: отмечены все три.
      {
        schedule: { frequency: 'days' as const, days: [1, 3, 5], timesPerWeek: null },
        checks: set('2026-09-28', '2026-09-30', '2026-10-02'),
      },
      // Пн, ср, пт: отметка во вторник нормы не закрывает.
      {
        schedule: { frequency: 'days' as const, days: [1, 3, 5], timesPerWeek: null },
        checks: set('2026-09-28', '2026-09-29', '2026-10-02'),
      },
      // Два раза в неделю: набрано.
      {
        schedule: { frequency: 'weekly' as const, days: [], timesPerWeek: 2 },
        checks: set('2026-09-29', '2026-10-03'),
      },
      // Каждый день: пропущен один день.
      {
        schedule: { frequency: 'daily' as const, days: [], timesPerWeek: null },
        checks: set('2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03'),
      },
    ]
    expect(habitsKept(habits, WEEK)).toBe(2)
  })
})

describe('месяц', () => {
  it('листает месяцы через границу года', () => {
    expect(shiftMonth('2026-10', -1)).toBe('2026-09')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
  })

  it('раскладывает дни по неделям с понедельника', () => {
    // 1 октября 2026 это четверг: перед ним три пустые ячейки.
    const days = monthDays('2026-10')
    expect(days.slice(0, 4)).toEqual([null, null, null, '2026-10-01'])
    expect(days).toHaveLength(3 + 31)
    expect(days[days.length - 1]).toBe('2026-10-31')
    // Июнь 2026 начинается с понедельника: пустых ячеек нет.
    expect(monthDays('2026-06')[0]).toBe('2026-06-01')
  })
})
