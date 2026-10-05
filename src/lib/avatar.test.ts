import { describe, expect, it } from 'vitest'
import { centerSquare } from './avatar'

describe('centerSquare', () => {
  it('из горизонтальной картинки вырезает квадрат по центру', () => {
    expect(centerSquare(400, 200)).toEqual({ x: 100, y: 0, side: 200 })
  })

  it('из вертикальной тоже', () => {
    expect(centerSquare(300, 900)).toEqual({ x: 0, y: 300, side: 300 })
  })

  it('квадратную берёт целиком', () => {
    expect(centerSquare(256, 256)).toEqual({ x: 0, y: 0, side: 256 })
  })
})
