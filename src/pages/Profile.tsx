import { Moon, Sun } from '@phosphor-icons/react'
import { parseISO } from 'date-fns'
import { useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { Button } from '../components/Button'
import { Section } from '../components/Section'
import { Segmented } from '../components/Segmented'
import { CHANGELOG } from '../data/changelog'
import { formatDateTimeNumeric } from '../lib/dates'
import { setTheme, useTheme } from '../lib/theme'
import { PageHeader } from '../layout/PageHeader'
import { AccountSection } from './profile/AccountSection'
import { DangerZone } from './profile/DangerZone'
import { PasswordSection } from './profile/PasswordSection'
import { SessionsSection } from './profile/SessionsSection'
import styles from './Profile.module.css'

/** Экран Профиля: аккаунт, пароль, сессии, оформление, история версий и удаление аккаунта. */
export function Profile() {
  const { profile } = useAuth()
  const theme = useTheme()
  // В истории версий сразу видна только последняя, остальные открываются кнопкой.
  const [showAll, setShowAll] = useState(false)

  return (
    <>
      <PageHeader title="Профиль" />

      <Section title="Оформление">
        <div>
          <Segmented
            aria-label="Тема оформления"
            value={theme}
            onChange={(next, button) => {
              // Новая тема расходится кругом из центра нажатой кнопки.
              const rect = button.getBoundingClientRect()
              setTheme(next, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
            }}
            options={[
              { value: 'light', label: 'Светлая', icon: <Sun aria-hidden /> },
              { value: 'dark', label: 'Тёмная', icon: <Moon aria-hidden /> },
            ]}
          />
        </div>
      </Section>

      <AccountSection />
      <PasswordSection />
      {/* После смены пароля другие сессии завершаются: список перечитывается заново. */}
      <SessionsSection key={profile?.passwordChangedAt} />

      <Section title="История версий">
        <ol className={styles.releases}>
          {(showAll ? CHANGELOG : CHANGELOG.slice(0, 1)).map((release) => (
            <li key={release.version} className={styles.release}>
              <h3 className={styles.title}>
                Версия {release.version} · {formatDateTimeNumeric(parseISO(release.date))}
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

      <DangerZone />
    </>
  )
}
