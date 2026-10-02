import { SignOut } from '@phosphor-icons/react'
import { parseISO } from 'date-fns'
import { useAuth } from '../auth/useAuth'
import { Button } from '../components/Button'
import { Section } from '../components/Section'
import { CHANGELOG } from '../data/changelog'
import { formatDayMonth } from '../lib/dates'
import { PageHeader } from '../layout/PageHeader'
import styles from './Profile.module.css'

// Сам экран Профиля (имя, пароль, сессии) появится на одном из следующих шагов.
// Пока здесь история версий и выход для телефона: в нижней панели его нет.
export function Profile() {
  const { signOut } = useAuth()

  return (
    <>
      <PageHeader title="Профиль" />

      <Section title="История версий">
        <ol className={styles.releases}>
          {CHANGELOG.map((release) => (
            <li key={release.version} className={styles.release}>
              <p className={`t-caption ${styles.meta}`}>
                Версия {release.version} · {formatDayMonth(parseISO(release.date))}
              </p>
              <h3 className="t-heading-5">{release.title}</h3>
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
