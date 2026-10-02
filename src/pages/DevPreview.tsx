import { useMemo } from 'react'
import { Route, Routes } from 'react-router'
import { AuthContext } from '../auth/useAuth'
import type { AuthContextValue } from '../auth/useAuth'
import { useToast } from '../components/useToast'
import { createMemoryApi } from '../data/memoryApi'
import { PlannerProvider } from '../data/PlannerProvider'
import { AppShell } from '../layout/AppShell'
import { ComingSoon } from './ComingSoon'
import { Week } from './week/Week'

const BASE = '/dev/app'

/**
 * Экраны приложения без входа и без базы, на демо-данных в памяти.
 * Доступно только в режиме разработки по адресу /dev/app.
 */
export function DevPreview() {
  const toast = useToast()
  const api = useMemo(() => createMemoryApi(), [])
  const auth = useMemo<AuthContextValue>(
    () => ({
      status: 'authenticated',
      session: null,
      profile: { id: 'demo', name: 'Анастасия', lastName: 'Власенкова', passwordChangedAt: null },
      refreshProfile: async () => {},
      signOut: () => toast({ message: 'В демо-режиме выхода нет' }),
    }),
    [toast],
  )

  return (
    <AuthContext.Provider value={auth}>
      <PlannerProvider api={api}>
        <Routes>
          <Route element={<AppShell basePath={BASE} />}>
            <Route index element={<ComingSoon title="Главная" />} />
            <Route path="week/:isoWeek?" element={<Week />} />
            <Route path="habits" element={<ComingSoon title="Привычки" />} />
            <Route path="profile" element={<ComingSoon title="Профиль" />} />
          </Route>
        </Routes>
      </PlannerProvider>
    </AuthContext.Provider>
  )
}
