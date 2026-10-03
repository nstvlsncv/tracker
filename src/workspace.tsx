// Всё, что нужно только после входа: оболочка с меню, экраны и хранилища данных.
// Лежит отдельным куском: экран входа открывается, не дожидаясь этого кода (см. App.tsx).
import { Outlet } from 'react-router'
import { useAuth } from './auth/useAuth'
import { HabitsProvider } from './data/HabitsProvider'
import { PlannerProvider } from './data/PlannerProvider'
import { supabaseApi } from './data/supabaseApi'

export { AppShell } from './layout/AppShell'
export { Habits } from './pages/habits/Habits'
export { Home } from './pages/home/Home'
export { Profile } from './pages/Profile'
export { Stats } from './pages/stats/Stats'
export { Week } from './pages/week/Week'

/** Данные пользователя живут, пока он в аккаунте: при смене пользователя хранилище создаётся заново. */
export function Planner() {
  const { profile } = useAuth()
  return (
    <PlannerProvider key={profile?.id} api={supabaseApi}>
      <HabitsProvider api={supabaseApi}>
        <Outlet />
      </HabitsProvider>
    </PlannerProvider>
  )
}
