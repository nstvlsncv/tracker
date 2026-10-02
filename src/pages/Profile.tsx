import { Moon, SignOut, Sun } from '@phosphor-icons/react'
import { parseISO } from 'date-fns'
import { useAuth } from '../auth/useAuth'
import { Button } from '../components/Button'
import { Section } from '../components/Section'
import { Segmented } from '../components/Segmented'
import { CHANGELOG } from '../data/changelog'
import { formatDateNumeric } from '../lib/dates'
import { setTheme, useTheme } from '../lib/theme'
import { PageHeader } from '../layout/PageHeader'
import styles from './Profile.module.css'

// Сам экран Профиля (имя, пароль, сессии) появится на одном из следующих шагов.
// Пока здесь тема оформления, история версий и выход для телефона: в нижней панели его нет.
export function Profile() {
  const { signOut } = useAuth()
  const theme = useTheme()

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

      <Section title="История версий">
        <ol className={styles.releases}>
          {CHANGELOG.map((release) => (
            <li key={release.version} className={styles.release}>
              <h3 className={styles.title}>
                Версия {release.version} · {release.title} · {formatDateNumeric(parseISO(release.date))}
              </h3>
              <ul className={styles.notes}>
                {release.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </Section>

      <div className={styles.logout}>
        <Button tone="danger" size="lg" fullWidth icon={<SignOut aria-hidden />} onClick={signOut}>
          Выйти
        </Button>
      </div>
    </>
  )
}
