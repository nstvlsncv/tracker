import type { AccountApi } from '../../auth/account'
import { useAuth } from '../../auth/useAuth'
import { isNetworkError, NETWORK_ERROR_MESSAGE } from '../../lib/supabase'

/** Действия с аккаунтом. Экран Профиля открыт только после входа, поэтому они есть всегда. */
export function useAccount(): AccountApi {
  const { account } = useAuth()
  if (!account) throw new Error('useAccount: экран открыт без входа')
  return account
}

/** Текст для тоста, когда действие не удалось не по вине пользователя. */
export function failureMessage(error: unknown): string {
  const known = typeof error === 'object' && error !== null ? error : {}
  return isNetworkError(known) ? NETWORK_ERROR_MESSAGE : 'Не получилось. Попробуй ещё раз'
}
