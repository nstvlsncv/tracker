import { describe, expect, it } from 'vitest'
import type { HabitSchedule } from '../data/types'
import {
  checkBlock,
  completionRate,
  currentPause,
  habitStreaks,
  isDueOn,
  scheduleLabel,
  withPause,
  withoutPause,
} from './habits'

// Суббота 3 октября 2026, неделя с понедельника 28 сентября.
const TODAY = '2026-10-03'
const daily: HabitSchedule = { frequency: 'daily', days: [], timesPerWeek: null }
const monWedFri: HabitSchedule = { frequency: 'days', days: [1, 3, 5], timesPerWeek: null }
const thrice: HabitSchedule = { frequency: 'weekly', days: [], timesPerWeek: 3 }
const set = (...days: string[]) => new Set(days)

describe('habitStreaks', () => {
  it('каждый день: считает подряд, сегодняшний неотмеченный день серию не рвёт', () => {
    const { current, best } = habitStreaks(daily, set('2026-09-30', '2026-10-01', '2026-10-02'), TODAY)
    expect(current).toEqual({ value: 3, unit: 'days' })
    expect(best.value).toBe(3)
  })

  it('каждый день: пропуск обнуляет текущую серию', () => {
    const { current, best } = habitStreaks(daily, set('2026-09-28', '2026-09-29', '2026-10-03'), TODAY)
    expect(current.value).toBe(1)
    expect(best.value).toBe(2)
  })

  it('по дням недели: дни вне расписания серию не рвут', () => {
    // Пн 28, ср 30, пт 2: между ними вторник и четверг без отметок.
    const { current } = habitStreaks(monWedFri, set('2026-09-28', '2026-09-30', '2026-10-02'), TODAY)
    expect(current.value).toBe(3)
  })

  it('по дням недели: пропуск своего дня рвёт серию', () => {
    const { current, best } = habitStreaks(monWedFri, set('2026-09-28', '2026-10-02'), TODAY)
    expect(current.value).toBe(1)
    expect(best.value).toBe(1)
  })

  it('N раз в неделю: серия в неделях, текущая неделя без нормы её не рвёт', () => {
    const checks = set(
      '2026-09-14', '2026-09-16', '2026-09-18',
      '2026-09-21', '2026-09-22', '2026-09-27',
      '2026-09-29',
    )
    const { current, best } = habitStreaks(thrice, checks, TODAY)
    expect(current).toEqual({ value: 2, unit: 'weeks' })
    expect(best.value).toBe(2)
  })
})

describe('isDueOn', () => {
  it('по дням недели: ждёт отметки только в свои дни', () => {
    expect(isDueOn(monWedFri, set(), '2026-10-02')).toBe(true)
    expect(isDueOn(monWedFri, set(), TODAY)).toBe(false)
  })

  it('N раз в неделю: ждёт, пока норма недели не набрана', () => {
    expect(isDueOn(thrice, set('2026-09-28', '2026-09-29'), TODAY)).toBe(true)
    expect(isDueOn(thrice, set('2026-09-28', '2026-09-29', '2026-09-30'), TODAY)).toBe(false)
    expect(isDueOn(thrice, set('2026-09-28', '2026-09-29', TODAY), TODAY)).toBe(true)
  })
})

describe('checkBlock', () => {
  it('каждый день: отметить можно всегда', () => {
    expect(checkBlock(daily, set(), TODAY)).toBeNull()
  })

  it('по дням недели: только в дни расписания', () => {
    // 3 октября суббота, 2 октября пятница.
    expect(checkBlock(monWedFri, set(), TODAY)).toContain('пн, ср, пт')
    expect(checkBlock(monWedFri, set(), '2026-10-02')).toBeNull()
  })

  it('N раз в неделю: пока норма недели не набрана', () => {
    expect(checkBlock(thrice, set('2026-09-28', '2026-09-29'), TODAY)).toBeNull()
    expect(checkBlock(thrice, set('2026-09-28', '2026-09-29', '2026-09-30'), TODAY)).toBe(
      'Норма недели уже набрана: 3 из 3',
    )
    // Норма считается по неделе самого дня, а не по текущей.
    expect(checkBlock(thrice, set('2026-09-28', '2026-09-29', '2026-09-30'), '2026-09-25')).toBeNull()
  })
})

describe('scheduleLabel и completionRate', () => {
  it('подписи расписания', () => {
    expect(scheduleLabel(daily)).toBe('Каждый день')
    expect(scheduleLabel(monWedFri)).toBe('Пн, ср, пт')
    expect(scheduleLabel(thrice)).toBe('3 раза в неделю')
  })

  it('доля за неделю: по дням недели считаются только дни расписания', () => {
    // За 7 дней до субботы в расписании пн, ср, пт: отмечены два из трёх.
    expect(completionRate(monWedFri, set('2026-09-28', '2026-10-02'), TODAY, 7)).toBe(67)
    expect(completionRate(thrice, set('2026-09-28', '2026-09-29', '2026-09-30'), TODAY, 7)).toBe(100)
  })
})

describe('пауза привычки', () => {
  // Пауза со вторника 29 сентября по четверг 1 октября.
  const paused: HabitSchedule = { ...daily, pauses: [{ from: '2026-09-29', to: '2026-10-01' }] }

  it('дни паузы серию не рвут', () => {
    const checks = set('2026-09-27', '2026-09-28', '2026-10-02', TODAY)
    expect(habitStreaks(paused, checks, TODAY).current).toEqual({ value: 4, unit: 'days' })
    // Без паузы те же отметки дали бы серию из двух дней.
    expect(habitStreaks(daily, checks, TODAY).current).toEqual({ value: 2, unit: 'days' })
  })

  it('на паузе привычка не ждёт отметки, и поставить её нельзя', () => {
    const open: HabitSchedule = { ...daily, pauses: [{ from: '2026-10-01', to: null }] }
    expect(isDueOn(open, set(), TODAY)).toBe(false)
    expect(checkBlock(open, set(), TODAY)).toContain('на паузе')
    expect(isDueOn(open, set(), '2026-09-30')).toBe(true)
  })

  it('доля выполнения считается по дням без паузы', () => {
    // За 7 дней до субботы: три дня на паузе, из четырёх оставшихся отмечены два.
    expect(completionRate(paused, set('2026-09-28', TODAY), TODAY, 7)).toBe(50)
  })

  it('неделя с паузой не рвёт серию «N раз в неделю»', () => {
    const weekly: HabitSchedule = { ...thrice, pauses: [{ from: '2026-09-21', to: '2026-09-24' }] }
    const checks = set('2026-09-14', '2026-09-15', '2026-09-16', '2026-09-28', '2026-09-29', '2026-09-30')
    expect(habitStreaks(weekly, checks, TODAY).current).toEqual({ value: 2, unit: 'weeks' })
    expect(habitStreaks(thrice, checks, TODAY).current).toEqual({ value: 1, unit: 'weeks' })
  })

  it('ставится с сегодняшнего дня и снимается вчерашним', () => {
    const started = withPause([], TODAY)
    expect(started).toEqual([{ from: TODAY, to: null }])
    expect(withPause(started, TODAY)).toBe(started)
    expect(currentPause({ ...daily, pauses: started }, TODAY)).toEqual({ from: TODAY, to: null })
    // Поставили и сняли в один день: паузы как не было.
    expect(withoutPause(started, TODAY)).toEqual([])
    expect(withoutPause([{ from: '2026-09-29', to: null }], TODAY)).toEqual([
      { from: '2026-09-29', to: '2026-10-02' },
    ])
  })
})
