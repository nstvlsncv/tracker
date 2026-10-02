import { describe, expect, it } from 'vitest'
import { LOGIN_LOCK_MS } from '../lib/constants'
import { isLocked, NO_ATTEMPTS, registerFailure } from './validation'

describe('блокировка входа', () => {
  const now = 1_000_000

  it('блокирует на 5 минут после 5 неудачных попыток подряд', () => {
    let attempts = NO_ATTEMPTS
    for (let i = 0; i < 4; i++) {
      attempts = registerFailure(attempts, now)
      expect(isLocked(attempts, now)).toBe(false)
    }
    attempts = registerFailure(attempts, now)
    expect(isLocked(attempts, now)).toBe(true)
    expect(isLocked(attempts, now + LOGIN_LOCK_MS - 1)).toBe(true)
    expect(isLocked(attempts, now + LOGIN_LOCK_MS)).toBe(false)
  })

  it('после блокировки счёт начинается заново', () => {
    const locked = { failures: 0, lockedUntil: now }
    const next = registerFailure(locked, now + 1)
    expect(next).toEqual({ failures: 1, lockedUntil: 0 })
  })
})
