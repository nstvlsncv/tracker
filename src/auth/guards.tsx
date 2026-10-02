import { Navigate, Outlet } from 'react-router'
import { Button } from '../components/Button'
import { AppSkeleton } from '../layout/AppSkeleton'
import { NETWORK_ERROR_MESSAGE } from '../lib/supabase'
import { LoginSkeleton } from '../pages/auth/LoginSkeleton'
import { useAuth } from './useAuth'
import styles from './guards.module.css'

function ConnectionError() {
  const { refreshProfile } = useAuth()
  return (
    <div className={styles.center}>
      <p>{NETWORK_ERROR_MESSAGE}</p>
      <Button variant="secondary" onClick={refreshProfile}>
        Повторить
      </Button>
    </div>
  )
}

/** Экраны после входа. Гость уходит на вход. */
export function ProtectedRoute() {
  const { status } = useAuth()
  // Пока проверяется вход, показываем силуэт приложения, а не пустую страницу.
  if (status === 'loading') return <AppSkeleton />
  if (status === 'error') return <ConnectionError />
  if (status === 'guest') return <Navigate to="/login" replace />
  return <Outlet />
}

/** Экран входа. Авторизованный уходит на Главную. */
export function GuestRoute() {
  const { status } = useAuth()
  if (status === 'loading') return <LoginSkeleton />
  if (status === 'error') return <ConnectionError />
  if (status === 'authenticated') return <Navigate to="/" replace />
  return <Outlet />
}
