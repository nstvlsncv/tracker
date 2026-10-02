import { describe, expect, it } from 'vitest'
import { moveTarget } from './taskMove'

describe('moveTarget', () => {
  const today = '2026-10-03'

  it('с прошедшего дня задача переносится на сегодня', () => {
    expect(moveTarget('2026-09-30', today)).toEqual({ date: today, label: 'Перенести на сегодня' })
  })

  it('с сегодняшнего дня на завтра', () => {
    expect(moveTarget(today, today)).toEqual({ date: '2026-10-04', label: 'Перенести на завтра' })
  })

  it('с будущего дня на следующий за ним', () => {
    expect(moveTarget('2026-10-31', today)).toEqual({
      date: '2026-11-01',
      label: 'Перенести на следующий день',
    })
  })
})
