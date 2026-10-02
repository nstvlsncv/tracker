import { describe, expect, it } from 'vitest'
import { describeUserAgent } from './userAgent'

const CHROME_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const EDGE_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0'
const CHROME_ANDROID =
  'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'

describe('describeUserAgent', () => {
  it('браузер и система', () => {
    expect(describeUserAgent(CHROME_MAC)).toEqual({ label: 'Chrome · macOS', device: 'laptop' })
    expect(describeUserAgent(SAFARI_IPHONE)).toEqual({ label: 'Safari · iPhone', device: 'mobile' })
  })

  it('Edge не путается с Chrome, Android не путается с Linux', () => {
    expect(describeUserAgent(EDGE_WINDOWS)).toEqual({ label: 'Edge · Windows', device: 'desktop' })
    expect(describeUserAgent(CHROME_ANDROID)).toEqual({ label: 'Chrome · Android', device: 'mobile' })
  })

  it('пустая или непонятная строка', () => {
    expect(describeUserAgent(null).label).toBe('Неизвестное устройство')
    expect(describeUserAgent('curl/8.0').label).toBe('Неизвестное устройство')
  })
})
