import { IconContext } from '@phosphor-icons/react'
import { lazy, Suspense } from 'react'
import type { ComponentType } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { GuestRoute, ProtectedRoute } from './auth/guards'
import { ToastProvider } from './components/Toast'
import { PageLoader } from './components/PageLoader'
import { Login } from './pages/auth/Login'

/** Все иконки приложения: набор Phosphor, начертание bold, чтобы держать вес рядом с Unbounded. */
const ICONS = { weight: 'bold' } as const

// Код грузится частями. Сразу приходит только то, что нужно экрану входа. Всё, что открывается
// после входа, лежит отдельным куском, демо и страницы для разработки ещё двумя.
const loadWorkspace = () => import('./workspace')
type Workspace = Awaited<ReturnType<typeof loadWorkspace>>
const fromWorkspace = <K extends keyof Workspace>(name: K) =>
  lazy(() => loadWorkspace().then((module) => ({ default: module[name] as ComponentType })))

const Planner = fromWorkspace('Planner')
const AppShell = fromWorkspace('AppShell')
const Home = fromWorkspace('Home')
const Week = fromWorkspace('Week')
const Habits = fromWorkspace('Habits')
const Profile = fromWorkspace('Profile')
const Stats = fromWorkspace('Stats')

const DevPreview = lazy(() => import('./pages/DevPreview').then((m) => ({ default: m.DevPreview })))
const Showcase = lazy(() => import('./pages/Showcase').then((m) => ({ default: m.Showcase })))
const OgImage = lazy(() => import('./pages/OgImage').then((m) => ({ default: m.OgImage })))

// Кусок с приложением начинает грузиться сразу, не дожидаясь проверки входа: пока она идёт,
// он уже в пути. Экрану входа это не мешает.
void loadWorkspace()

export default function App() {
  return (
    <IconContext.Provider value={ICONS}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            {/* Пока кусок кода в пути: тот же экран загрузки, что и при проверке входа. */}
            <Suspense fallback={<PageLoader screen />}>
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
                    <Route path="/stats" element={<Stats />} />
                    <Route path="/profile" element={<Profile />} />
                  </Route>
                </Route>
              </Route>
              {/* Демо для гостей: настоящий трекер на данных в памяти, без входа и без базы. */}
              <Route path="/demo/*" element={<DevPreview base="/demo" visitor />} />
              {/* Только в режиме разработки: витрина компонентов, экраны на демо-данных и заглушки загрузки. */}
              {import.meta.env.DEV && <Route path="/dev" element={<Showcase />} />}
              {import.meta.env.DEV && <Route path="/dev/og" element={<OgImage />} />}
              {import.meta.env.DEV && <Route path="/dev/app/*" element={<DevPreview />} />}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </IconContext.Provider>
  )
}
