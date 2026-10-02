import type { Session, User } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext } from './useAuth'
import type { AuthStatus, Profile } from './useAuth'

type ProfileResult = Profile | 'error'

const PROFILE_COLUMNS = 'id, name, last_name, password_changed_at'

type ProfileRow = {
  id: string
  name: string
  last_name: string | null
  password_changed_at: string | null
}

const toProfile = (row: ProfileRow): Profile => ({
  id: row.id,
  name: row.name,
  lastName: row.last_name,
  passwordChangedAt: row.password_changed_at,
})

const signOut = () => {
  supabase.auth.signOut({ scope: 'local' })
}

async function loadProfile(user: User): Promise<ProfileResult> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', user.id)
    .maybeSingle()
  if (error) return 'error'
  if (data) return toProfile(data)

  // Пользователей заводят вручную в Supabase (Authentication → Users → Add user),
  // поэтому профиль создаётся при первом входе. Имя: часть email до «@», меняется в Профиле.
  const { data: created, error: createError } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      name: user.email?.split('@')[0] ?? 'Без имени',
      password_changed_at: user.created_at,
    })
    .select(PROFILE_COLUMNS)
    .single()
  return createError ? 'error' : toProfile(created)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // undefined: ещё не знаем. null: сессии точно нет.
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  // Результат загрузки профиля вместе с тем, чей он: чужой или устаревший не используется.
  const [loaded, setLoaded] = useState<{ userId: string; profile: ProfileResult } | null>(null)
  // Последний определённый статус. Пока профиль загружается, экраны не размонтируются.
  const [status, setStatus] = useState<AuthStatus>('loading')

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  const user = session?.user
  const userId = user?.id
  const profile = userId && loaded?.userId === userId ? loaded.profile : undefined

  // Сессия обновляется при каждом продлении токена, а профиль нужен один раз на пользователя.
  const userRef = useRef(user)
  useEffect(() => {
    userRef.current = user
  })

  useEffect(() => {
    const current = userRef.current
    if (!userId || !current) return
    let cancelled = false
    loadProfile(current).then((result) => {
      if (!cancelled) setLoaded({ userId, profile: result })
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  let resolved: AuthStatus | undefined
  if (session === null) resolved = 'guest'
  else if (session && profile) resolved = profile === 'error' ? 'error' : 'authenticated'
  if (resolved && resolved !== status) setStatus(resolved)

  const refreshProfile = useCallback(async () => {
    const current = userRef.current
    if (userId && current) setLoaded({ userId, profile: await loadProfile(current) })
  }, [userId])

  const value = useMemo(
    () => ({
      status,
      session: session ?? null,
      profile: profile && profile !== 'error' ? profile : null,
      refreshProfile,
      signOut,
    }),
    [status, session, profile, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
