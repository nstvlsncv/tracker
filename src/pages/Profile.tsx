import { Check, Moon, Sun } from '@phosphor-icons/react'
import { parseISO } from 'date-fns'
import { useAuth } from '../auth/useAuth'
import { Button } from '../components/Button'
import { Section } from '../components/Section'
import { CHANGELOG } from '../data/changelog'
import { ACCENTS, setAccent, useAccent } from '../lib/accent'
import { cx } from '../lib/cx'
import { formatDateNumeric } from '../lib/dates'
import { useSessionState } from '../lib/sessionState'
import { setTheme, useTheme } from '../lib/theme'
import type { Theme } from '../lib/theme'
import { PageHeader } from '../layout/PageHeader'
import { AccountSection } from './profile/AccountSection'
import { DangerZone } from './profile/DangerZone'
import { PasswordSection } from './profile/PasswordSection'
import { SessionsSection } from './profile/SessionsSection'
import styles from './Profile.module.css'

const THEMES: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Светлая', icon: Sun },
  { value: 'dark', label: 'Тёмная', icon: Moon },
]

/** Экран Профиля: аккаунт, пароль, сессии, оформление, история версий и удаление аккаунта. */
export function Profile() {
  // В демо для гостей нет смены пароля и удаления аккаунта: пароля гость не знает.
  const { profile, demo } = useAuth()
  const theme = useTheme()
  const accent = useAccent()
  // В истории версий сразу видна только последняя, остальные открываются кнопкой.
  const [showAll, setShowAll] = useSessionState('profile.showAllReleases', false)

  return (
    <>
      <PageHeader title="Профиль" backTo=".." />

      <Section title="Оформление">
        {/* Тема выбирается так же, как акцентный цвет: кружками. */}
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
                className={cx(
                  styles.swatch,
                  styles[value],
                  value === theme && styles.swatchSelected,
                )}
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

      <AccountSection />
      {!demo && <PasswordSection />}
      {/* После смены пароля другие сессии завершаются: список перечитывается заново. */}
      <SessionsSection key={profile?.passwordChangedAt} />

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

      {!demo && <DangerZone />}
    </>
  )
}
