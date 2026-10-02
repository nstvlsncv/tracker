import { useMemo, useState } from 'react'
import { Route, Routes } from 'react-router'
import { createDemoAccount } from '../auth/demoAccount'
import { AuthContext } from '../auth/useAuth'
import type { AuthContextValue, Profile as ProfileData } from '../auth/useAuth'
import { useToast } from '../components/useToast'
import { createMemoryApi } from '../data/memoryApi'
import { PlannerProvider } from '../data/PlannerProvider'
import { AppShell } from '../layout/AppShell'
import { ComingSoon } from './ComingSoon'
import { Profile } from './Profile'
import { Week } from './week/Week'

const BASE = '/dev/app'

/**
 * Экраны приложения без входа и без базы, на демо-данных в памяти.
 * Доступно только в режиме разработки по адресу /dev/app.
 */
export function DevPreview() {
  const toast = useToast()
  const api = useMemo(() => createMemoryApi(), [])
  const [profile, setProfile] = useState<ProfileData>(() => ({
    id: 'demo',
    name: 'Анастасия',
    lastName: 'Власенкова',
    passwordChangedAt: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString(),
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
      signOut: () => toast({ message: 'В демо-режиме выхода нет' }),
    }),
    [toast, profile, account],
  )

  return (
    <AuthContext.Provider value={auth}>
      <PlannerProvider api={api}>
        <Routes>
          <Route element={<AppShell basePath={BASE} />}>
            <Route index element={<ComingSoon title="Главная" />} />
            <Route path="week/:isoWeek?" element={<Week />} />
            <Route path="habits" element={<ComingSoon title="Привычки" />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </PlannerProvider>
    </AuthContext.Provider>
  )
}
