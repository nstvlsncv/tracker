import { describe, expect, it } from 'vitest'
import { averageMood, moodKind, moodLabel } from './moods'

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
