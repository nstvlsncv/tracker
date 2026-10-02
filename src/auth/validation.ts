import { LOGIN_LOCK_MS, LOGIN_MAX_ATTEMPTS } from '../lib/constants'

// Блокировка входа после серии неудачных попыток. Живёт только в браузере:
// это защита от случайного перебора, серверные лимиты держит Supabase.

export type LoginAttempts = { failures: number; lockedUntil: number }

export const NO_ATTEMPTS: LoginAttempts = { failures: 0, lockedUntil: 0 }

export function isLocked(attempts: LoginAttempts, now: number): boolean {
  return attempts.lockedUntil > now
}

/** Состояние после очередной неудачной попытки. Истёкшая блокировка начинает счёт заново. */
export function registerFailure(attempts: LoginAttempts, now: number): LoginAttempts {
  const failures = (attempts.lockedUntil && attempts.lockedUntil <= now ? 0 : attempts.failures) + 1
  return failures >= LOGIN_MAX_ATTEMPTS
    ? { failures: 0, lockedUntil: now + LOGIN_LOCK_MS }
    : { failures, lockedUntil: 0 }
}
