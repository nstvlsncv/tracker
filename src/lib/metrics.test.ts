import { describe, expect, it } from 'vitest'
import {
  bestStreak,
  currentStreak,
  formatDays,
  greeting,
  percent,
  progress,
  shiftDate,
  sortItems,
  totalChecks,
  weekAnalytics,
} from './metrics'

const tasks = (date: string, done: number, total: number) =>
  Array.from({ length: total }, (_, i) => ({ date, isDone: i < done }))

describe('percent / progress', () => {
  it('возвращает null, если задач нет', () => {
    expect(percent(0, 0)).toBeNull()
    expect(progress([])).toBeNull()
  })

  it('округляет через Math.round', () => {
    expect(percent(1, 3)).toBe(33)
    expect(percent(2, 3)).toBe(67)
    expect(percent(1, 8)).toBe(13)
    expect(progress(tasks('2026-09-15', 0, 4))).toBe(0)
    expect(progress(tasks('2026-09-15', 4, 4))).toBe(100)
  })
})

describe('shiftDate', () => {
  it('переходит через границы месяца и года', () => {
    expect(shiftDate('2026-09-30', 1)).toBe('2026-10-01')
    expect(shiftDate('2026-01-01', -1)).toBe('2025-12-31')
    expect(shiftDate('2028-02-28', 1)).toBe('2028-02-29')
  })
})

describe('weekAnalytics', () => {
  const weekStart = '2026-09-14' // понедельник
  const today = '2026-09-16' // среда

  it('считает по всей неделе, включая будущие дни', () => {
    const all = [
      ...tasks('2026-09-14', 2, 2),
      ...tasks('2026-09-16', 1, 3),
      ...tasks('2026-09-19', 0, 5), // будущее
      ...tasks('2026-09-21', 1, 1), // другая неделя
    ]
    const goals = [{ isDone: true }, { isDone: false }, { isDone: true }]
    expect(weekAnalytics(all, goals, weekStart, today)).toEqual({
      total: 10,
      done: 3,
      remaining: 7,
      averageProgress: 30,
      productiveDay: '2026-09-14',
      goalsDone: 2,
    })
  })

  it('пустая неделя: прочерки вместо нулей', () => {
    const result = weekAnalytics([], [], weekStart, today)
    expect(result.total).toBe(0)
    expect(result.averageProgress).toBeNull()
    expect(result.productiveDay).toBeNull()
  })

  it('продуктивный день: при равенстве берётся более ранний', () => {
    const all = [...tasks('2026-09-14', 1, 2), ...tasks('2026-09-15', 2, 4)]
    expect(weekAnalytics(all, [], weekStart, today).productiveDay).toBe('2026-09-14')
  })

  it('продуктивный день: будущие дни не участвуют, сегодня участвует', () => {
    const all = [
      ...tasks('2026-09-14', 1, 4),
      ...tasks('2026-09-16', 3, 4),
      ...tasks('2026-09-17', 4, 4), // завтра, отмечено заранее
    ]
    expect(weekAnalytics(all, [], weekStart, today).productiveDay).toBe('2026-09-16')
  })

  it('продуктивный день: день с 0% считается, если других нет', () => {
    const all = tasks('2026-09-15', 0, 2)
    expect(weekAnalytics(all, [], weekStart, today).productiveDay).toBe('2026-09-15')
  })

  it('продуктивный день: null, если задачи есть только в будущем', () => {
    const all = tasks('2026-09-18', 0, 2)
    expect(weekAnalytics(all, [], weekStart, today).productiveDay).toBeNull()
  })
})

describe('currentStreak', () => {
  const today = '2026-09-15'

  it('0 без отметок', () => {
    expect(currentStreak([], today)).toBe(0)
  })

  it('считает подряд идущие дни, заканчивая сегодня', () => {
    expect(currentStreak(['2026-09-13', '2026-09-14', '2026-09-15'], today)).toBe(3)
  })

  it('если сегодня не отмечено, серия считается до вчера и не обнуляется', () => {
    expect(currentStreak(['2026-09-12', '2026-09-13', '2026-09-14'], today)).toBe(3)
  })

  it('обнуляется, если пропущен вчерашний день', () => {
    expect(currentStreak(['2026-09-12', '2026-09-13'], today)).toBe(0)
  })

  it('пропуск обрывает серию', () => {
    expect(currentStreak(['2026-09-10', '2026-09-11', '2026-09-14', '2026-09-15'], today)).toBe(2)
  })

  it('переходит через границу месяца', () => {
    expect(currentStreak(['2026-08-31', '2026-09-01', '2026-09-02'], '2026-09-02')).toBe(3)
  })
})

describe('bestStreak / totalChecks', () => {
  it('максимальная серия за всю историю', () => {
    const checks = [
      '2026-01-01',
      '2026-01-02',
      '2026-03-10',
      '2026-03-11',
      '2026-03-12',
      '2026-03-13',
      '2026-09-15',
    ]
    expect(bestStreak(checks)).toBe(4)
    expect(totalChecks(checks)).toBe(7)
  })

  it('не зависит от порядка и дублей', () => {
    expect(bestStreak(['2026-09-15', '2026-09-13', '2026-09-14', '2026-09-14'])).toBe(3)
    expect(totalChecks(['2026-09-14', '2026-09-14'])).toBe(1)
  })

  it('0 без отметок', () => {
    expect(bestStreak([])).toBe(0)
  })
})

describe('sortItems', () => {
  it('невыполненные сверху, внутри группы по времени создания', () => {
    const items = [
      { id: 'a', isDone: true, createdAt: '2026-09-15T08:00:00Z' },
      { id: 'b', isDone: false, createdAt: '2026-09-15T10:00:00Z' },
      { id: 'c', isDone: false, createdAt: '2026-09-15T09:00:00Z' },
      { id: 'd', isDone: true, createdAt: '2026-09-15T07:00:00Z' },
    ]
    expect(sortItems(items).map((item) => item.id)).toEqual(['c', 'b', 'd', 'a'])
    expect(items[0].id).toBe('a') // исходный массив не меняется
  })
})

describe('formatDays', () => {
  it('склоняет по правилам русского языка', () => {
    expect(formatDays(0)).toBe('0 дней')
    expect(formatDays(1)).toBe('1 день')
    expect(formatDays(2)).toBe('2 дня')
    expect(formatDays(4)).toBe('4 дня')
    expect(formatDays(5)).toBe('5 дней')
    expect(formatDays(11)).toBe('11 дней')
    expect(formatDays(14)).toBe('14 дней')
    expect(formatDays(21)).toBe('21 день')
    expect(formatDays(22)).toBe('22 дня')
    expect(formatDays(111)).toBe('111 дней')
  })
})

describe('greeting', () => {
  it('меняется по времени суток', () => {
    expect(greeting(5)).toBe('Доброе утро')
    expect(greeting(11)).toBe('Доброе утро')
    expect(greeting(12)).toBe('Добрый день')
    expect(greeting(17)).toBe('Добрый день')
    expect(greeting(18)).toBe('Добрый вечер')
    expect(greeting(22)).toBe('Добрый вечер')
    expect(greeting(23)).toBe('Доброй ночи')
    expect(greeting(0)).toBe('Доброй ночи')
    expect(greeting(4)).toBe('Доброй ночи')
  })
})
