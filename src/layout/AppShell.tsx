import { IconCalendarWeek, IconHome, IconLogout, IconRefresh, IconUser } from '@tabler/icons-react'
import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { cx } from '../lib/cx'
import styles from './AppShell.module.css'

type Props = {
  /** Приставка к адресам меню. Нужна только витрине в режиме разработки (/dev/app). */
  basePath?: string
}

const NAV = [
  { to: '', label: 'Главная', icon: IconHome, end: true },
  { to: 'week', label: 'Неделя', icon: IconCalendarWeek, end: false },
  { to: 'habits', label: 'Привычки', icon: IconRefresh, end: false },
  { to: 'profile', label: 'Профиль', icon: IconUser, end: false },
]

/** Каркас экранов после входа: боковое меню слева и содержимое экрана справа. */
export function AppShell({ basePath = '' }: Props) {
  const { signOut } = useAuth()

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={`t-heading-3 ${styles.logo}`}>Трекер</div>
        <nav className={styles.nav} aria-label="Разделы">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={`${basePath}/${to}`}
              end={end}
              className={({ isActive }) => cx('t-button', styles.item, isActive && styles.active)}
            >
              <Icon aria-hidden />
              <span className={styles.label}>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className={styles.bottom}>
          {/* Выход сразу, без подтверждения. */}
          <button type="button" className={cx('t-button', styles.item, styles.logout)} onClick={signOut}>
            <IconLogout aria-hidden />
            <span className={styles.label}>Выйти</span>
          </button>
        </div>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
