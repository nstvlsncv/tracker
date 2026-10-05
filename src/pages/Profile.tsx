import {
  Camera,
  CaretRight,
  ChatCircleDots,
  Check,
  ClockCounterClockwise,
  Devices,
  LockKey,
  Moon,
  Palette,
  SignOut,
  Sun,
  UserCircle,
} from '@phosphor-icons/react'
import { parseISO } from 'date-fns'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { Avatar } from '../components/Avatar'
import { Button } from '../components/Button'
import { buttonClassName } from '../components/buttonStyles'
import { Section } from '../components/Section'
import { CHANGELOG } from '../data/changelog'
import { ACCENTS, setAccent, useAccent } from '../lib/accent'
import { AUTHOR_URL } from '../lib/constants'
import { cx } from '../lib/cx'
import { formatDateNumeric } from '../lib/dates'
import { useSessionState } from '../lib/sessionState'
import { setTheme, useTheme } from '../lib/theme'
import type { Theme } from '../lib/theme'
import { PageHeader } from '../layout/PageHeader'
import { SignOutModal } from '../layout/SignOutModal'
import { AccountSection } from './profile/AccountSection'
import { DangerZone } from './profile/DangerZone'
import { PasswordSection } from './profile/PasswordSection'
import { SessionsSection } from './profile/SessionsSection'
import { useAccount } from './profile/useAccount'
import { useAvatar } from './profile/useAvatar'
import styles from './Profile.module.css'

const THEMES: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Светлая', icon: Sun },
  { value: 'dark', label: 'Тёмная', icon: Moon },
]

type Item = {
  /** Часть адреса: /profile/account. */
  id: string
  label: string
  icon: typeof Sun
  render: () => ReactNode
}

/**
 * Профиль устроен как настройки в Телеграме: слева шапка с фото и список пунктов, справа
 * содержимое выбранного. На телефоне это две ступени: сначала список, по нажатию один пункт
 * со стрелкой «назад». Какой пункт открыт, записано в адресе (/profile/sessions).
 */
export function Profile() {
  const { section } = useParams()
  // В демо для гостей нет смены пароля и удаления аккаунта: пароля гость не знает.
  const { profile, demo } = useAuth()
  const account = useAccount()
  const avatar = useAvatar()
  const [leaving, setLeaving] = useState(false)

  const items: Item[] = [
    {
      id: 'account',
      label: 'Аккаунт',
      icon: UserCircle,
      // Удаление аккаунта лежит здесь же, под данными аккаунта.
      render: () => (
        <>
          <AccountSection />
          {!demo && <DangerZone />}
        </>
      ),
    },
    { id: 'appearance', label: 'Оформление', icon: Palette, render: () => <Appearance /> },
    ...(demo
      ? []
      : [{ id: 'password', label: 'Пароль', icon: LockKey, render: () => <PasswordSection /> }]),
    {
      id: 'sessions',
      label: 'Сессии',
      icon: Devices,
      // После смены пароля другие сессии завершаются: список перечитывается заново.
      render: () => <SessionsSection key={profile?.passwordChangedAt} />,
    },
    { id: 'releases', label: 'История версий', icon: ClockCounterClockwise, render: () => <Releases /> },
    { id: 'feedback', label: 'Обратная связь', icon: ChatCircleDots, render: () => <Feedback /> },
  ]

  const opened = items.find((item) => item.id === section)
  // Незнакомый адрес (или пункт, которого в демо нет) ведёт к списку.
  if (section && !opened) return <Navigate to=".." relative="path" replace />
  // На компьютере справа всегда что-то открыто: без пункта в адресе это «Аккаунт».
  const shown = opened ?? items[0]
  const fullName = [profile?.name, profile?.lastName].filter(Boolean).join(' ')

  return (
    <>
      {/* Стрелка «назад» к списку: только на телефоне и только внутри пункта. */}
      <PageHeader title="Профиль" backTo={opened ? '..' : undefined} />

      <div className={cx(styles.layout, opened && styles.opened)}>
        <aside className={styles.menu}>
          <div className={styles.head}>
            {avatar.available ? (
              <button
                type="button"
                className={styles.photo}
                aria-label="Изменить фото профиля"
                aria-busy={avatar.busy}
                onClick={avatar.pick}
              >
                <Avatar url={profile?.avatarUrl} size={64} />
                <span className={styles.camera} aria-hidden>
                  <Camera />
                </span>
              </button>
            ) : (
              <Avatar size={64} />
            )}
            <div className={styles.who}>
              <span className={`t-heading-5 ${styles.name}`}>{fullName}</span>
              <span className={`t-body-sm ${styles.email}`}>{account.email}</span>
            </div>
            {avatar.input}
          </div>

          <nav className={styles.items} aria-label="Настройки профиля">
            {items.map(({ id, label, icon: Icon }) => (
              <Link
                key={id}
                // Из списка пункт лежит на уровень ниже, из другого пункта рядом.
                to={section ? `../${id}` : id}
                relative="path"
                aria-current={id === shown.id ? 'page' : undefined}
                className={cx('t-button', styles.item, id === shown.id && styles.current)}
              >
                <Icon aria-hidden />
                <span className={styles.label}>{label}</span>
                <CaretRight className={styles.caret} aria-hidden />
              </Link>
            ))}
          </nav>

          {/* Только на телефоне: в нижней панели кнопки выхода нет. */}
          <div className={styles.logout}>
            <Button tone="danger" icon={<SignOut aria-hidden />} onClick={() => setLeaving(true)}>
              Выйти
            </Button>
          </div>
        </aside>

        {/* key: при смене пункта содержимое создаётся заново и проявляется. */}
        <div key={shown.id} className={styles.pane}>
          {shown.render()}
        </div>
      </div>

      {leaving && <SignOutModal onClose={() => setLeaving(false)} />}
    </>
  )
}

/** Тема и акцентный цвет: выбираются одинаково, кружками. */
function Appearance() {
  const theme = useTheme()
  const accent = useAccent()

  return (
    <Section title="Оформление">
      <div className={styles.accents}>
        <span className={`t-caption ${styles.accentsLabel}`} id="theme-label">
          Тема
        </span>
        <div className={styles.swatches} role="radiogroup" aria-labelledby="theme-label">
          {THEMES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={value === theme}
              aria-label={label}
              title={label}
              className={cx(styles.swatch, styles[value], value === theme && styles.swatchSelected)}
              onClick={(event) => {
                // Новая тема расходится кругом из центра нажатого кружка.
                const rect = event.currentTarget.getBoundingClientRect()
                setTheme(value, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
              }}
            >
              <Icon aria-hidden />
            </button>
          ))}
        </div>
      </div>
      {/* Акцентный цвет: им отмечено всё сделанное и текущее, в него же красится маскот. */}
      <div className={styles.accents}>
        <span className={`t-caption ${styles.accentsLabel}`} id="accent-label">
          Акцентный цвет
        </span>
        <div className={styles.swatches} role="radiogroup" aria-labelledby="accent-label">
          {ACCENTS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={option.value === accent}
              aria-label={option.label}
              title={option.label}
              data-accent={option.value}
              className={cx(styles.swatch, option.value === accent && styles.swatchSelected)}
              onClick={() => setAccent(option.value)}
            >
              {option.value === accent && <Check aria-hidden />}
            </button>
          ))}
        </div>
      </div>
    </Section>
  )
}

/** История версий: сразу видна только последняя, остальные открываются кнопкой. */
function Releases() {
  const [showAll, setShowAll] = useSessionState('profile.showAllReleases', false)

  return (
    <Section title="История версий">
      <ol className={styles.releases}>
        {(showAll ? CHANGELOG : CHANGELOG.slice(0, 1)).map((release) => (
          <li key={release.version} className={styles.release}>
            <h3 className={styles.title}>
              Версия {release.version} · {formatDateNumeric(parseISO(release.date))}
            </h3>
            <p className={styles.text}>{release.text}</p>
          </li>
        ))}
      </ol>
      {CHANGELOG.length > 1 && (
        <div>
          <Button variant="secondary" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Скрыть' : 'Показать ещё'}
          </Button>
        </div>
      )}
    </Section>
  )
}

/** Обратная связь: вопрос и кнопка «Напиши мне» (открывает переписку с владелицей). */
function Feedback() {
  return (
    <Section title="Обратная связь">
      <p className={styles.text}>
        Нашлась ошибка, чего-то не хватает или просто есть идея?
      </p>
      <div>
        <a
          className={buttonClassName({})}
          href={AUTHOR_URL}
          target="_blank"
          rel="noreferrer"
        >
          Напиши мне
        </a>
      </div>
    </Section>
  )
}
