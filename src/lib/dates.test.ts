import { describe, expect, it } from 'vitest'
import {
  formatDateNumeric,
  formatDayMonth,
  formatDayShort,
  formatWeekdayShort,
  formatWeekRange,
  formatWeekRangeShort,
  parseWeekParam,
  toISODate,
  toWeekParam,
  weekStartISO,
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
    expect(formatDateNumeric(new Date(2026, 9, 2))).toBe('02.10.2026')
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

describe('без года и день недели', () => {
  it('диапазон недели без года', () => {
    expect(formatWeekRange(new Date(2026, 8, 14), { year: false })).toBe('14–20 сентября')
    expect(formatWeekRange(new Date(2026, 8, 28), { year: false })).toBe('28 сентября – 4 октября')
  })

  it('короткий день недели заглавными', () => {
    expect(formatWeekdayShort(new Date(2026, 8, 14))).toBe('ПН')
    expect(formatWeekdayShort(new Date(2026, 8, 20))).toBe('ВС')
  })
})

describe('неделя в адресе страницы', () => {
  it('понедельник для даты-строки', () => {
    expect(weekStartISO('2026-09-16')).toBe('2026-09-14')
    expect(weekStartISO('2026-09-20')).toBe('2026-09-14')
  })

  it('туда и обратно', () => {
    expect(toWeekParam('2026-09-14')).toBe('2026-W38')
    expect(parseWeekParam('2026-W38')).toBe('2026-09-14')
  })

  it('неделя на стыке лет относится к году по ISO', () => {
    expect(toWeekParam('2025-12-29')).toBe('2026-W01')
    expect(parseWeekParam('2026-W01')).toBe('2025-12-29')
  })

  it('мусор в адресе даёт null', () => {
    expect(parseWeekParam('abc')).toBeNull()
    expect(parseWeekParam('2026-W99')).toBeNull()
    expect(parseWeekParam('2026-09-14')).toBeNull()
  })
})
