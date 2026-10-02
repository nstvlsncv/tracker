import { IconContext } from '@phosphor-icons/react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { GuestRoute, ProtectedRoute } from './auth/guards'
import { useAuth } from './auth/useAuth'
import { ToastProvider } from './components/Toast'
import { HabitsProvider } from './data/HabitsProvider'
import { PlannerProvider } from './data/PlannerProvider'
import { supabaseApi } from './data/supabaseApi'
import { AppShell } from './layout/AppShell'
import { AppSkeleton } from './layout/AppSkeleton'
import { Login } from './pages/auth/Login'
import { LoginSkeleton } from './pages/auth/LoginSkeleton'
import { DevPreview } from './pages/DevPreview'
import { Habits } from './pages/habits/Habits'
import { Home } from './pages/home/Home'
import { Profile } from './pages/Profile'
import { Showcase } from './pages/Showcase'
import { Week } from './pages/week/Week'

/** Все иконки приложения: набор Phosphor, начертание bold, чтобы держать вес рядом с Unbounded. */
const ICONS = { weight: 'bold' } as const

/** Данные пользователя живут, пока он в аккаунте: при смене пользователя хранилище создаётся заново. */
function Planner() {
  const { profile } = useAuth()
  return (
    <PlannerProvider key={profile?.id} api={supabaseApi}>
      <HabitsProvider api={supabaseApi}>
        <Outlet />
      </HabitsProvider>
    </PlannerProvider>
  )
}

export default function App() {
  return (
    <IconContext.Provider value={ICONS}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<GuestRoute />}>
                <Route path="/login" element={<Login />} />
              </Route>
              <Route element={<ProtectedRoute />}>
                <Route element={<Planner />}>
                  <Route element={<AppShell />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/week/:isoWeek?" element={<Week />} />
                    <Route path="/habits" element={<Habits />} />
                    <Route path="/profile" element={<Profile />} />
                  </Route>
                </Route>
              </Route>
              {/* Только в режиме разработки: витрина компонентов, экраны на демо-данных и заглушки загрузки. */}
              {import.meta.env.DEV && <Route path="/dev" element={<Showcase />} />}
              {import.meta.env.DEV && <Route path="/dev/app/*" element={<DevPreview />} />}
            {import.meta.env.DEV && <Route path="/dev/skeleton/app" element={<AppSkeleton />} />}
            {import.meta.env.DEV && <Route path="/dev/skeleton/login" element={<LoginSkeleton />} />}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </IconContext.Provider>
  )
}
