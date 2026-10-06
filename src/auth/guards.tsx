import { lazy, useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { Button } from '../components/Button'
import { Mascot } from '../components/Mascot'
import { PageLoader } from '../components/PageLoader'
import { entranceHoldLeft } from '../lib/entrance'
import { NETWORK_ERROR_MESSAGE } from '../lib/supabase'
import { useAuth } from './useAuth'
import styles from './guards.module.css'

function ConnectionError() {
  const { refreshProfile } = useAuth()
  return (
    <div className={styles.center}>
      <Mascot size={64} mood="shy" />
      <p>{NETWORK_ERROR_MESSAGE}</p>
      <Button variant="secondary" onClick={refreshProfile}>
        Повторить
      </Button>
    </div>
  )
}

// Лендинг видят только гости: лежит своим куском и вошедшим не грузится.
const Landing = lazy(() => import('../pages/landing/Landing').then((m) => ({ default: m.Landing })))

/**
 * Экраны после входа. Гость с главного адреса видит лендинг (рассказ о трекере с кнопкой
 * «Войти»), с любого другого уходит на вход.
 */
export function ProtectedRoute() {
  const { status } = useAuth()
  const { pathname } = useLocation()
  // Пока проверяется вход: чистый экран, а если ждать приходится дольше, маскот по центру.
  if (status === 'loading') return <PageLoader screen />
  if (status === 'error') return <ConnectionError />
  if (status === 'guest') return pathname === '/' ? <Landing /> : <Navigate to="/login" replace />
  return <Outlet />
}

/** Экран входа. Авторизованный уходит на Главную. */
export function GuestRoute() {
  const { status } = useAuth()
  // Сразу после входа экран ещё мгновение стоит: кнопка «Войти» празднует, экран растворяется.
  const hold = status === 'authenticated' ? entranceHoldLeft() : 0
  const [, refresh] = useState(0)
  useEffect(() => {
    if (!hold) return
    const timer = setTimeout(() => refresh((count) => count + 1), hold)
    return () => clearTimeout(timer)
  }, [hold])

  if (status === 'loading') return <PageLoader screen />
  if (status === 'error') return <ConnectionError />
  if (status === 'authenticated' && !hold) return <Navigate to="/" replace />
  return <Outlet />
}
