import type { AccountApi } from './account'
import type { Profile } from './useAuth'

/** Пароль демо-аккаунта на /dev/app: с ним срабатывают смена пароля и удаление. */
export const DEMO_PASSWORD = 'demo1234'

const pause = () => new Promise((resolve) => setTimeout(resolve, 400))

type Options = {
  /** Изменить демо-профиль в памяти. */
  update: (patch: Partial<Profile>) => void
  /** Что сделать вместо выхода после удаления аккаунта. */
  onDeleted: () => void
}

/** Аккаунт для экранов на /dev/app: всё происходит в памяти, в базу ничего не уходит. */
export function createDemoAccount({ update, onDeleted }: Options): AccountApi {
  let password = DEMO_PASSWORD

  return {
    email: 'demo@tracker.test',

    async saveName(name, lastName) {
      await pause()
      update({ name, lastName: lastName || null })
    },

    async saveAvatar(image) {
      await pause()
      // В демо фото живёт в памяти вкладки, до обновления страницы.
      update({ avatarUrl: URL.createObjectURL(image) })
    },

    async removeAvatar() {
      await pause()
      update({ avatarUrl: null })
    },

    async changePassword(current, next) {
      await pause()
      if (current !== password) return 'wrong-password'
      if (next === password) return 'same-password'
      password = next
      update({ passwordChangedAt: new Date().toISOString() })
      return 'ok'
    },

    async deleteAccount(given) {
      await pause()
      if (given !== password) return 'wrong-password'
      onDeleted()
      return 'ok'
    },
  }
}
