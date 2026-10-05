import { describe, expect, it } from 'vitest'
import type { Mood, Task } from '../data/types'
import { averageMood, moodInsights, moodKind, moodLabel } from './moods'

describe('moods', () => {
  it('знает лицо и подпись каждого настроения', () => {
    expect(moodKind(5)).toBe('great')
    expect(moodKind(1)).toBe('bad')
    expect(moodLabel(3)).toBe('Обычный день')
  })

  it('считает среднее с одним знаком после запятой', () => {
    expect(averageMood([])).toBeNull()
    expect(averageMood([5, 4, 4])).toBe(4.3)
    expect(averageMood([1, 2])).toBe(1.5)
  })
})

describe('moodInsights', () => {
  // Понедельник 5 октября 2026.
  const TODAY = '2026-10-05'
  const task = (date: string, isDone: boolean): Task => ({
    id: `${date}-${isDone}-${Math.random()}`,
    date,
    title: 'Задача',
    isDone,
    doneAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  })
  const moods: Record<string, Mood> = {
    '2026-10-05': 5, // пн
    '2026-09-28': 4, // пн
    '2026-09-29': 2, // вт
    '2026-09-22': 1, // вт
    '2026-10-02': 5, // пт, одна отметка
    '2026-08-01': 1, // вне периода
  }

  it('считает среднее и число отметок только за период', () => {
    const result = moodInsights(moods, [], TODAY, 30)
    expect(result.marked).toBe(5)
    expect(result.average).toBe(3.4)
  })

  it('лучший день недели: по среднему, одна отметка не в счёт', () => {
    expect(moodInsights(moods, [], TODAY, 30).bestWeekday).toBe(1)
    expect(moodInsights({ '2026-10-05': 5 }, [], TODAY, 30).bestWeekday).toBeNull()
  })

  it('связывает настроение с выполненными задачами', () => {
    const tasks = [
      task('2026-10-05', true),
      task('2026-09-28', true),
      task('2026-09-28', false),
      task('2026-10-02', true),
      task('2026-09-29', false),
      task('2026-09-22', true),
    ]
    const result = moodInsights(moods, tasks, TODAY, 30)
    expect(result.doneOnGoodDays).toBe(75)
    expect(result.doneOnBadDays).toBe(50)
  })

  it('без задач в такие дни связи нет', () => {
    expect(moodInsights(moods, [], TODAY, 30).doneOnGoodDays).toBeNull()
  })
})
