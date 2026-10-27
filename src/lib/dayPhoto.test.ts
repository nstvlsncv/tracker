import { describe, expect, it } from 'vitest'
import { fitSize } from './dayPhoto'

describe('fitSize: размер фото дня', () => {
  it('большое фото уменьшается по длинной стороне с теми же пропорциями', () => {
    expect(fitSize(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 })
    expect(fitSize(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 })
  })

  it('маленькое не растёт', () => {
    expect(fitSize(800, 600, 1600)).toEqual({ width: 800, height: 600 })
  })
})
