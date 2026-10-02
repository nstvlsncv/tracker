import { describe, expect, it } from 'vitest'
import {
  formatDayMonth,
  formatDayShort,
  formatWeekRange,
  formatWeekRangeShort,
  toISODate,
  weekStartOf,
} from './dates'

describe('weekStartOf', () => {
  it('неделя начинается с понедельника', () => {
    expect(toISODate(weekStartOf(new Date(2026, 8, 15)))).toBe('2026-09-14') // вторник
    expect(toISODate(weekStartOf(new Date(2026, 8, 20)))).toBe('2026-09-14') // воскресенье
    expect(toISODate(weekStartOf(new Date(2026, 8, 14)))).toBe('2026-09-14') // понедельник
  })
})

describe('форматы дат', () => {
  it('день и месяц', () => {
    expect(formatDayMonth(new Date(2026, 8, 15))).toBe('15 сентября')
    expect(formatDayShort(new Date(2026, 8, 5))).toBe('05.09')
  })

  it('диапазон недели внутри месяца', () => {
    expect(formatWeekRange(new Date(2026, 8, 14))).toBe('14–20 сентября 2026')
    expect(formatWeekRangeShort(new Date(2026, 8, 14))).toBe('14.09–20.09')
  })

  it('диапазон недели на стыке месяцев и лет', () => {
    expect(formatWeekRange(new Date(2026, 8, 28))).toBe('28 сентября – 4 октября 2026')
    expect(formatWeekRange(new Date(2025, 11, 29))).toBe('29 декабря 2025 – 4 января 2026')
  })
})
