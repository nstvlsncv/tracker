// Всё, что нужно только после входа: оболочка с меню, экраны и хранилища данных.
// Лежит отдельным куском: экран входа открывается, не дожидаясь этого кода (см. App.tsx).
import { Outlet } from 'react-router'
import { useAuth } from './auth/useAuth'
import { DaysProvider } from './data/DaysProvider'
import { FinanceProvider } from './data/FinanceProvider'
import { HabitsProvider } from './data/HabitsProvider'
import { ListsProvider } from './data/ListsProvider'
import { PlannerProvider } from './data/PlannerProvider'
import { supabaseApi } from './data/supabaseApi'
import { supabaseDays } from './data/supabaseDays'
import { supabaseFinance } from './data/supabaseFinance'
import { supabaseLists } from './data/supabaseLists'

export { AppShell } from './layout/AppShell'
export { Finance } from './pages/finance/Finance'
export { Habits } from './pages/habits/Habits'
export { Home } from './pages/home/Home'
export { Lists } from './pages/lists/Lists'
export { Profile } from './pages/Profile'
export { Week } from './pages/week/Week'

/** Данные пользователя живут, пока он в аккаунте: при смене пользователя хранилище создаётся заново. */
export function Planner() {
  const { profile } = useAuth()
  return (
    <PlannerProvider key={profile?.id} api={supabaseApi}>
      <HabitsProvider api={supabaseApi}>
        <FinanceProvider api={supabaseFinance}>
          <ListsProvider api={supabaseLists}>
            <DaysProvider api={supabaseDays}>
              <Outlet />
            </DaysProvider>
          </ListsProvider>
        </FinanceProvider>
      </HabitsProvider>
    </PlannerProvider>
  )
}
