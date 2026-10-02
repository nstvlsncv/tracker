import { describe, expect, it } from 'vitest'
import { habitHistory } from './habitHistory'

describe('habitHistory', () => {
  // 2 октября 2026 года это пятница.
  const weeks = habitHistory('2026-10-02')

  it('53 недели, последняя текущая, каждая с понедельника', () => {
    expect(weeks).toHaveLength(53)
    expect(weeks[52].start).toBe('2026-09-28')
    expect(weeks[0].start).toBe('2025-09-29')
  })

  it('будущие дни текущей недели не рисуются', () => {
    expect(weeks[52].days).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      null,
      null,
    ])
  })

  it('месяц подписан над неделей, в которую он начинается', () => {
    expect(weeks[52].month).toBe('Окт')
    expect(weeks[51].month).toBeNull()
    // 1 сентября 2026 это вторник недели с 31 августа.
    expect(weeks.find((week) => week.start === '2026-08-31')?.month).toBe('Сен')
  })

  it('месяц, который начнётся позже на этой неделе, ещё не подписан', () => {
    // Среда 30 сентября: 1 октября на этой же неделе, но ещё не наступило.
    expect(habitHistory('2026-09-30')[52].month).toBeNull()
  })
})
