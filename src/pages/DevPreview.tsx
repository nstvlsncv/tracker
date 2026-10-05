import { useEffect, useMemo, useRef, useState } from 'react'
import { Route, Routes, useNavigate } from 'react-router'
import { createDemoAccount } from '../auth/demoAccount'
import { AuthContext } from '../auth/useAuth'
import type { AuthContextValue, Profile as ProfileData } from '../auth/useAuth'
import { useToast } from '../components/useToast'
import { createMemoryApi } from '../data/memoryApi'
import { HabitsProvider } from '../data/HabitsProvider'
import { PlannerProvider } from '../data/PlannerProvider'
import { AppShell } from '../layout/AppShell'
import { forgetSessionState } from '../lib/sessionState'
import { Habits } from './habits/Habits'
import { Home } from './home/Home'
import { Profile } from './Profile'
import { Stats } from './stats/Stats'
import { Week } from './week/Week'

type Props = {
  /** Адрес, под которым открыто демо. */
  base?: string
  /**
   * Демо для гостей (/demo, кнопка «Посмотреть демо» на экране входа): обезличенный
   * профиль, подсказка при открытии, «Выйти» возвращает на экран входа.
   */
  visitor?: boolean
}

/**
 * Экраны приложения без входа и без базы, на демо-данных в памяти. Всё, что здесь меняют,
 * живёт до обновления страницы. По адресу /demo открыто всем, /dev/app только в разработке.
 */
export function DevPreview({ base = '/dev/app', visitor = false }: Props) {
  const toast = useToast()
  const navigate = useNavigate()

  // Память экранов общая с настоящим приложением: демо начинает с чистого листа
  // и ничего после себя не оставляет.
  const greeted = useRef(false)
  useEffect(() => {
    forgetSessionState()
    if (visitor && !greeted.current) {
      greeted.current = true
      toast({ message: 'Это демо: ничего не сохраняется' })
    }
    return forgetSessionState
  }, [visitor, toast])

  const api = useMemo(() => createMemoryApi(), [])
  const [profile, setProfile] = useState<ProfileData>(() => ({
    id: 'demo',
    name: visitor ? 'Гость' : 'Анастасия',
    lastName: visitor ? null : 'Власенкова',
    passwordChangedAt: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString(),
    avatarUrl: null,
  }))
  const account = useMemo(
    () =>
      createDemoAccount({
        update: (patch) => setProfile((current) => ({ ...current, ...patch })),
        onDeleted: () => toast({ message: 'В демо-режиме аккаунт остаётся на месте' }),
      }),
    [toast],
  )
  const auth = useMemo<AuthContextValue>(
    () => ({
      status: 'authenticated',
      session: null,
      profile,
      refreshProfile: async () => {},
      account,
      demo: visitor,
      signOut: () => {
        if (visitor) navigate('/login')
        else toast({ message: 'В демо-режиме выхода нет' })
      },
    }),
    [toast, profile, account, visitor, navigate],
  )

  return (
    <AuthContext.Provider value={auth}>
      <PlannerProvider api={api}>
        <HabitsProvider api={api}>
          <Routes>
            <Route element={<AppShell basePath={base} />}>
              <Route index element={<Home />} />
              <Route path="week/:isoWeek?" element={<Week />} />
              <Route path="habits" element={<Habits />} />
              <Route path="stats" element={<Stats />} />
              <Route path="profile/:section?" element={<Profile />} />
            </Route>
          </Routes>
        </HabitsProvider>
      </PlannerProvider>
    </AuthContext.Provider>
  )
}
