import type { AccountApi, AccountSession } from './account'
import type { Profile } from './useAuth'

/** Пароль демо-аккаунта на /dev/app: с ним срабатывают смена пароля и удаление. */
export const DEMO_PASSWORD = 'demo1234'

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()

const DEMO_SESSIONS: AccountSession[] = [
  {
    id: 'current',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    lastActiveAt: minutesAgo(0),
    current: true,
  },
  {
    id: 'phone',
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    lastActiveAt: minutesAgo(125),
    current: false,
  },
  {
    id: 'work',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',
    lastActiveAt: minutesAgo(60 * 24 * 3),
    current: false,
  },
]

const pause = () => new Promise((resolve) => setTimeout(resolve, 400))

type Options = {
  /** Изменить демо-профиль в памяти. */
  update: (patch: Partial<Profile>) => void
  /** Что сделать вместо выхода после удаления аккаунта. */
  onDeleted: () => void
}

/** Аккаунт для экранов на /dev/app: всё происходит в памяти, в базу ничего не уходит. */
export function createDemoAccount({ update, onDeleted }: Options): AccountApi {
  let sessions = DEMO_SESSIONS
  let password = DEMO_PASSWORD

  return {
    email: 'demo@tracker.test',

    async saveName(name, lastName) {
      await pause()
      update({ name, lastName: lastName || null })
    },

    async changePassword(current, next) {
      await pause()
      if (current !== password) return 'wrong-password'
      if (next === password) return 'same-password'
      password = next
      sessions = sessions.filter((session) => session.current)
      update({ passwordChangedAt: new Date().toISOString() })
      return 'ok'
    },

    async listSessions() {
      await pause()
      return sessions
    },

    async endSession(id) {
      await pause()
      sessions = sessions.filter((session) => session.id !== id)
    },

    async endOtherSessions() {
      await pause()
      sessions = sessions.filter((session) => session.current)
    },

    async deleteAccount(given) {
      await pause()
      if (given !== password) return 'wrong-password'
      onDeleted()
      return 'ok'
    },
  }
}
