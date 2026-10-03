import {
  ArrowsClockwise,
  CalendarDots,
  ChartBar,
  House,
  SignOut,
  User,
} from '@phosphor-icons/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { cx } from '../lib/cx'
import { takeEntrance } from '../lib/entrance'
import { recall, remember } from '../lib/sessionState'
import { SignOutModal } from './SignOutModal'
import styles from './AppShell.module.css'

type Props = {
  /** Приставка к адресам меню. Нужна только витрине в режиме разработки (/dev/app). */
  basePath?: string
}

// motion: как иконка оживает при нажатии на раздел (как в нижнем меню Телеграма).
const NAV = [
  { to: '', label: 'Главная', icon: House, end: true, motion: 'bounce' },
  { to: 'week', label: 'Неделя', icon: CalendarDots, end: false, motion: 'flip' },
  { to: 'habits', label: 'Привычки', icon: ArrowsClockwise, end: false, motion: 'spin' },
  { to: 'stats', label: 'Итоги', icon: ChartBar, end: false, motion: 'bounce' },
  { to: 'profile', label: 'Профиль', icon: User, end: false, motion: 'nod' },
] as const

/** Раздел, к которому относится адрес: 'week' для /week/2026-W38, '' для Главной. */
function sectionOf(pathname: string, basePath: string): string {
  return pathname.slice(basePath.length).split('/').filter(Boolean)[0] ?? ''
}

/**
 * Каркас экранов после входа: меню и содержимое экрана. Меню стоит слева (на планшете
 * узкой полосой с иконками), а на телефоне превращается в нижнюю панель, как в iOS.
 */
export function AppShell({ basePath = '' }: Props) {
  const [leaving, setLeaving] = useState(false)
  // Сразу после входа приложение проявляется (см. экран входа).
  const [entering] = useState(takeEntrance)

  // Каждый раздел помнит, где его оставили: адрес внутри раздела (выбранная неделя) и прокрутку.
  const { pathname } = useLocation()
  const section = sectionOf(pathname, basePath)

  useEffect(() => {
    remember(`shell.path.${section}`, pathname)
  }, [section, pathname])

  // Прокрутка записывается на тот раздел, который сейчас на экране. Раздел хранится в ref
  // и меняется до того, как страница прокрутится под новый экран: иначе этот сдвиг
  // записался бы на раздел, с которого уходят, и стёр бы его положение.
  const shownSection = useRef(section)

  useEffect(() => {
    const save = () => remember(`shell.scroll.${shownSection.current}`, window.scrollY)
    window.addEventListener('scroll', save, { passive: true })
    return () => window.removeEventListener('scroll', save)
  }, [])

  // При переходе в другой раздел прокрутка встаёт туда, где была в нём в прошлый раз
  // (в начало, если раздел открыт впервые), а не остаётся от предыдущего экрана.
  useLayoutEffect(() => {
    const top = recall<number>(`shell.scroll.${section}`) ?? 0
    shownSection.current = section
    window.scrollTo(0, top)
    // Второй раз после отрисовки: к этому моменту содержимое экрана уже набрало высоту.
    const frame = requestAnimationFrame(() => window.scrollTo(0, top))
    return () => cancelAnimationFrame(frame)
  }, [section])
  // Какой пункт нажали последним и в который раз. Счётчик идёт в key иконки: при каждом
  // нажатии она создаётся заново, и анимация проигрывается снова, даже на уже открытом разделе.
  const [tap, setTap] = useState<{ to: string | null; count: number }>({ to: null, count: 0 })

  return (
    <div className={cx(styles.shell, entering && styles.entering)}>
      <aside className={styles.sidebar}>
        <div className={`t-heading-3 ${styles.logo}`}>Трекер</div>
        <nav className={styles.nav} aria-label="Разделы">
          {NAV.map(({ to, label, icon: Icon, end, motion }) => (
            <NavLink
              key={to}
              // Из другого раздела возвращаемся туда, где были. Нажатие на уже открытый
              // раздел ведёт в его начало (текущая неделя).
              to={(to !== section && recall<string>(`shell.path.${to}`)) || `${basePath}/${to}`}
              end={end}
              className={({ isActive }) => cx('t-button', styles.item, isActive && styles.active)}
              onClick={() => setTap((last) => ({ to, count: last.count + 1 }))}
            >
              <Icon
                key={tap.to === to ? tap.count : 0}
                className={tap.to === to ? styles[motion] : undefined}
                aria-hidden
              />
              <span className={styles.label}>{label}</span>
            </NavLink>
          ))}
        </nav>
        {/* На телефоне этой кнопки в меню нет: выход там на экране Профиля. */}
        <div className={styles.bottom}>
          <button type="button" className={cx('t-button', styles.item, styles.logout)} onClick={() => setLeaving(true)}>
            <SignOut aria-hidden />
            <span className={styles.label}>Выйти</span>
          </button>
        </div>
      </aside>
      {/* key: при смене раздела область создаётся заново и плавно проявляется. */}
      <main key={section} className={styles.main}>
        <Outlet />
      </main>
      {leaving && <SignOutModal onClose={() => setLeaving(false)} />}
    </div>
  )
}
