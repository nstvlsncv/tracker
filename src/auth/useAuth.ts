import type { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'
import type { AccountApi } from './account'

export type Profile = {
  id: string
  name: string
  lastName: string | null
  passwordChangedAt: string | null
  /** Адрес фото профиля. null: фото нет. undefined: фото в этой базе нет вовсе (не применена свежая схема). */
  avatarUrl?: string | null
}

/** error: сессия есть, но профиль загрузить не удалось (нет сети). */
export type AuthStatus = 'loading' | 'guest' | 'authenticated' | 'error'

export type AuthContextValue = {
  status: AuthStatus
  session: Session | null
  profile: Profile | null
  /** Перечитать профиль (после изменения или после ошибки сети). */
  refreshProfile: () => Promise<void>
  /** Действия с аккаунтом для экрана Профиля. null, пока вход не выполнен. */
  account: AccountApi | null
  /** Выйти на этом устройстве. Остальные сессии остаются. */
  signOut: () => void
  /** Демо для гостей (/demo): нет смены пароля и удаления аккаунта, у выхода свой текст. */
  demo?: boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth: нет AuthProvider выше по дереву')
  return value
}
