import type { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'

export type Profile = {
  id: string
  name: string
  lastName: string | null
  passwordChangedAt: string | null
}

/** error: сессия есть, но профиль загрузить не удалось (нет сети). */
export type AuthStatus = 'loading' | 'guest' | 'authenticated' | 'error'

export type AuthContextValue = {
  status: AuthStatus
  session: Session | null
  profile: Profile | null
  /** Перечитать профиль (после изменения или после ошибки сети). */
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth: нет AuthProvider выше по дереву')
  return value
}
