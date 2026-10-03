import { describe, expect, it } from 'vitest'
import type { TaskRule } from '../data/types'
import { ruleDatesInWeek } from './repeat'

// Понедельник 28 сентября 2026.
const WEEK = '2026-09-28'
const rule = (patch: Partial<TaskRule>): TaskRule => ({
  id: 'r',
  title: 'Задача',
  repeat: 'daily',
  startDate: WEEK,
  endDate: null,
  skipped: [],
  createdAt: '2026-09-28T00:00:00.000Z',
  ...patch,
})

describe('ruleDatesInWeek', () => {
  it('каждый день: все семь дней', () => {
    expect(ruleDatesInWeek(rule({}), WEEK)).toHaveLength(7)
  })

  it('по будням: без субботы и воскресенья', () => {
    expect(ruleDatesInWeek(rule({ repeat: 'weekdays' }), WEEK)).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
    ])
  })

  it('раз в неделю: тот же день недели, что у начала', () => {
    const weekly = rule({ repeat: 'weekly', startDate: '2026-09-30' })
    expect(ruleDatesInWeek(weekly, WEEK)).toEqual(['2026-09-30'])
    expect(ruleDatesInWeek(weekly, '2026-10-05')).toEqual(['2026-10-07'])
  })

  it('не раньше начала, не позже конца и без пропущенных дней', () => {
    const bounded = rule({ startDate: '2026-09-29', endDate: '2026-10-02', skipped: ['2026-10-01'] })
    expect(ruleDatesInWeek(bounded, WEEK)).toEqual(['2026-09-29', '2026-09-30', '2026-10-02'])
    expect(ruleDatesInWeek(bounded, '2026-09-21')).toEqual([])
  })
})
