import { describe, expect, it } from 'vitest'
import { formatMonth, historyMonths, historyYears, monthWeeks, shiftMonth, yearMonths } from './habitHistory'

describe('historyYears', () => {
  it('текущий год и четыре предыдущих, новые сверху', () => {
    expect(historyYears('2026-01-01', '2026-10-02')).toEqual([2026, 2025, 2024, 2023, 2022])
  })

  it('если отметки есть раньше, список доходит до их года', () => {
    expect(historyYears('2020-05-10', '2026-10-02')).toEqual([2026, 2025, 2024, 2023, 2022, 2021, 2020])
  })
})

describe('historyMonths', () => {
  it('текущий месяц и одиннадцать предыдущих, новые сверху', () => {
    const months = historyMonths('2026-09-01', '2026-10-02')
    expect(months).toHaveLength(12)
    expect(months[0]).toBe('2026-10')
    expect(months[11]).toBe('2025-11')
  })

  it('если отметки есть раньше, список доходит до их месяца', () => {
    const months = historyMonths('2024-03-15', '2026-10-02')
    expect(months.at(-1)).toBe('2024-03')
    expect(months).toHaveLength(32)
  })
})

describe('календарь месяца', () => {
  it('октябрь 2026 начинается в четверг и занимает пять недель', () => {
    const weeks = monthWeeks('2026-10')
    expect(weeks).toHaveLength(5)
    expect(weeks[0]).toEqual([null, null, null, '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'])
    expect(weeks[4][5]).toBe('2026-10-31')
    expect(weeks[4][6]).toBeNull()
  })

  it('месяц, который начинается в понедельник, без пустой первой недели', () => {
    expect(monthWeeks('2026-06')[0][0]).toBe('2026-06-01')
  })

  it('соседние месяцы через границу года', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2025-12', 1)).toBe('2026-01')
    expect(formatMonth('2026-10')).toBe('Октябрь 2026')
  })
})

describe('yearMonths', () => {
  it('двенадцать месяцев года по порядку', () => {
    const months = yearMonths(2026)
    expect(months).toHaveLength(12)
    expect(months[0]).toBe('2026-01')
    expect(months[11]).toBe('2026-12')
  })
})
