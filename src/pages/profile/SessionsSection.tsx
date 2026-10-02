import { Desktop, DeviceMobile, Laptop } from '@phosphor-icons/react'
import { parseISO } from 'date-fns'
import { useCallback, useEffect, useState } from 'react'
import type { AccountSession } from '../../auth/account'
import { Button } from '../../components/Button'
import { ConfirmModal } from '../../components/ConfirmModal'
import { Section } from '../../components/Section'
import { Skeleton } from '../../components/Skeleton'
import { useToast } from '../../components/useToast'
import { formatAgo } from '../../lib/dates'
import { describeUserAgent } from '../../lib/userAgent'
import { failureMessage, useAccount } from './useAccount'
import styles from './profile.module.css'

const DEVICE_ICONS = { desktop: Desktop, laptop: Laptop, mobile: DeviceMobile }

/** Блок «Сессии»: где выполнен вход. Чужую сессию можно завершить, текущую нет. */
export function SessionsSection() {
  const account = useAccount()
  const toast = useToast()
  // undefined: загружаются. 'error': загрузить не удалось.
  const [sessions, setSessions] = useState<AccountSession[] | 'error'>()
  // Что просят завершить (ждёт подтверждения в модалке): сессия или 'others'.
  const [asking, setAsking] = useState<AccountSession | 'others'>()
  // Время открытия экрана: от него считается «2 часа назад».
  const [now] = useState(() => new Date())

  const load = useCallback(() => {
    account.listSessions().then(setSessions, () => setSessions('error'))
  }, [account])

  useEffect(load, [load])

  const end = async (target: AccountSession | 'others') => {
    try {
      if (target === 'others') await account.endOtherSessions()
      else await account.endSession(target.id)
      toast({ message: target === 'others' ? 'Другие сессии завершены' : 'Сессия завершена' })
      setSessions(await account.listSessions())
    } catch (reason) {
      toast({ message: failureMessage(reason) })
    }
  }

  if (sessions === 'error') {
    return (
      <Section title="Сессии">
        <p className={styles.note}>Не удалось загрузить список сессий</p>
        <div>
          <Button
            variant="secondary"
            onClick={() => {
              setSessions(undefined)
              load()
            }}
          >
            Повторить
          </Button>
        </div>
      </Section>
    )
  }

  const others = sessions?.filter((session) => !session.current) ?? []

  return (
    <Section title="Сессии">
      <ul className={styles.sessions}>
        {!sessions &&
          [0, 1].map((row) => (
            <li key={row} className={styles.session}>
              <Skeleton width={24} height={24} />
              <div className={styles.sessionText}>
                <Skeleton width={160} />
                <Skeleton width={96} height={16} />
              </div>
            </li>
          ))}
        {sessions?.map((session) => {
          const { label, device } = describeUserAgent(session.userAgent)
          const Icon = DEVICE_ICONS[device]
          return (
            <li key={session.id} className={styles.session}>
              <Icon className={styles.sessionIcon} aria-hidden />
              <div className={styles.sessionText}>
                <span className={styles.fieldValue}>{label}</span>
                <span className={`t-body-sm ${styles.note}`}>
                  {session.current ? 'сейчас' : formatAgo(parseISO(session.lastActiveAt), now)}
                </span>
              </div>
              {session.current ? (
                <span className={`t-caption ${styles.badge}`}>Текущая</span>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setAsking(session)}>
                  Завершить
                </Button>
              )}
            </li>
          )
        })}
      </ul>
      {others.length > 1 && (
        <div>
          <Button variant="secondary" onClick={() => setAsking('others')}>
            Завершить остальные
          </Button>
        </div>
      )}
      {asking === 'others' && (
        <ConfirmModal
          title="Завершить остальные сессии?"
          confirmLabel="Завершить"
          onConfirm={() => end('others')}
          onClose={() => setAsking(undefined)}
        >
          Вход останется только на этом устройстве. На остальных придётся войти заново.
        </ConfirmModal>
      )}
      {asking && asking !== 'others' && (
        <ConfirmModal
          title="Завершить сессию?"
          confirmLabel="Завершить"
          onConfirm={() => end(asking)}
          onClose={() => setAsking(undefined)}
        >
          На устройстве «{describeUserAgent(asking.userAgent).label}» придётся войти заново.
        </ConfirmModal>
      )}
    </Section>
  )
}
