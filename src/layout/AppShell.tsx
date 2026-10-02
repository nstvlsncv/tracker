import { ArrowsClockwise, CalendarDots, House, SignOut, User } from '@phosphor-icons/react'
import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { cx } from '../lib/cx'
import styles from './AppShell.module.css'

type Props = {
  /** Приставка к адресам меню. Нужна только витрине в режиме разработки (/dev/app). */
  basePath?: string
}

// motion: как иконка оживает, когда раздел выбирают (как в нижнем меню Телеграма).
const NAV = [
  { to: '', label: 'Главная', icon: House, end: true, motion: 'bounce' },
  { to: 'week', label: 'Неделя', icon: CalendarDots, end: false, motion: 'flip' },
  { to: 'habits', label: 'Привычки', icon: ArrowsClockwise, end: false, motion: 'spin' },
  { to: 'profile', label: 'Профиль', icon: User, end: false, motion: 'nod' },
] as const

/**
 * Каркас экранов после входа: меню и содержимое экрана. Меню стоит слева (на планшете
 * узкой полосой с иконками), а на телефоне превращается в нижнюю панель, как в iOS.
 */
export function AppShell({ basePath = '' }: Props) {
  const { signOut } = useAuth()

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={`t-heading-3 ${styles.logo}`}>Трекер</div>
        <nav className={styles.nav} aria-label="Разделы">
          {NAV.map(({ to, label, icon: Icon, end, motion }) => (
            <NavLink
              key={to}
              to={`${basePath}/${to}`}
              end={end}
              className={({ isActive }) => cx('t-button', styles.item, isActive && styles.active)}
            >
              <Icon className={styles[motion]} aria-hidden />
              <span className={styles.label}>{label}</span>
            </NavLink>
          ))}
        </nav>
        {/* На телефоне этой кнопки в меню нет: выход там на экране Профиля. */}
        <div className={styles.bottom}>
          <button type="button" className={cx('t-button', styles.item, styles.logout)} onClick={signOut}>
            <SignOut aria-hidden />
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
