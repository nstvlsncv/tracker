import { IconContext } from '@phosphor-icons/react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { GuestRoute, ProtectedRoute } from './auth/guards'
import { useAuth } from './auth/useAuth'
import { ToastProvider } from './components/Toast'
import { PlannerProvider } from './data/PlannerProvider'
import { supabaseApi } from './data/supabaseApi'
import { AppShell } from './layout/AppShell'
import { Login } from './pages/auth/Login'
import { ComingSoon } from './pages/ComingSoon'
import { DevPreview } from './pages/DevPreview'
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
      <Outlet />
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
                    <Route path="/" element={<ComingSoon title="Главная" />} />
                    <Route path="/week/:isoWeek?" element={<Week />} />
                    <Route path="/habits" element={<ComingSoon title="Привычки" />} />
                    <Route path="/profile" element={<Profile />} />
                  </Route>
                </Route>
              </Route>
              {/* Только в режиме разработки: витрина компонентов и экраны на демо-данных. */}
              {import.meta.env.DEV && <Route path="/dev" element={<Showcase />} />}
              {import.meta.env.DEV && <Route path="/dev/app/*" element={<DevPreview />} />}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </IconContext.Provider>
  )
}
