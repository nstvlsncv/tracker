import { describe, expect, it } from 'vitest'
import type { Goal, Task } from '../data/types'
import { recentWeeks, summarizeWeeks } from './stats'

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
