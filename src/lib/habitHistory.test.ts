import { describe, expect, it } from 'vitest'
import { habitHistory, historyYears } from './habitHistory'

describe('habitHistory: последние 12 месяцев', () => {
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

describe('habitHistory: календарный год', () => {
  it('прошлый год целиком: с недели 1 января до недели 31 декабря', () => {
    const weeks = habitHistory('2026-10-02', 2025)
    // 1 января 2025 это среда: понедельник и вторник первого столбца пустые.
    expect(weeks[0].start).toBe('2024-12-30')
    expect(weeks[0].days.slice(0, 3)).toEqual([null, null, '2025-01-01'])
    expect(weeks[0].month).toBe('Янв')
    // 31 декабря 2025 это среда: дальше уже другой год.
    expect(weeks.at(-1)?.days.slice(2, 4)).toEqual(['2025-12-31', null])
  })

  it('текущий год обрывается на текущей неделе', () => {
    const weeks = habitHistory('2026-10-02', 2026)
    expect(weeks.at(-1)?.start).toBe('2026-09-28')
  })
})

describe('historyYears', () => {
  it('с года начала по текущий, новые сверху', () => {
    expect(historyYears('2024-05-10', '2026-10-02')).toEqual([2026, 2025, 2024])
    expect(historyYears('2026-01-01', '2026-10-02')).toEqual([2026])
  })
})
