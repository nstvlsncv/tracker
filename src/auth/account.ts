import { isNetworkError, supabase } from '../lib/supabase'

/** Пароль не подошёл либо новый пароль совпал со старым. Остальные ошибки бросаются. */
export type PasswordResult = 'ok' | 'wrong-password' | 'same-password'

/**
 * Действия с аккаунтом на экране Профиля. Настоящая реализация ходит в Supabase,
 * демо-реализация (`demoAccount.ts`) нужна экранам на /dev/app.
 * При сбое сети и прочих неожиданных ошибках методы бросают исключение.
 * Профиль в приложении методы не перечитывают: после успеха экран сам вызывает refreshProfile.
 */
export type AccountApi = {
  /** Логин. Поменять его нельзя: почтовый сервис не подключён, подтвердить новый адрес нечем. */
  email: string
  saveName: (name: string, lastName: string) => Promise<void>
  /** Сохранить фото профиля: уже обрезанную и сжатую картинку (см. `src/lib/avatar.ts`). */
  saveAvatar: (image: Blob) => Promise<void>
  removeAvatar: () => Promise<void>
  /** Меняет пароль и завершает все остальные сессии. */
  changePassword: (current: string, next: string) => Promise<PasswordResult>
  /** Удаляет аккаунт со всеми данными и выходит. */
  deleteAccount: (password: string) => Promise<PasswordResult>
}

type Options = {
  userId: string
  email: string
}

/** Проверка текущего пароля: повторный вход с ним. false: пароль не подошёл. */
async function confirmPassword(email: string, password: string): Promise<boolean> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (!error) return true
  if (isNetworkError(error)) throw error
  return false
}

/** Корзина хранилища с фото профиля. У каждого своя папка с именем его id. */
const AVATARS = 'avatars'

export function createSupabaseAccount({ userId, email }: Options): AccountApi {
  // Файл всегда один и тот же: новое фото заменяет старое.
  const avatarPath = `${userId}/avatar.jpg`

  return {
    email,

    async saveAvatar(image) {
      const bucket = supabase.storage.from(AVATARS)
      const { error } = await bucket.upload(avatarPath, image, {
        upsert: true,
        contentType: 'image/jpeg',
        cacheControl: '31536000',
      })
      if (error) throw error
      // Адрес файла не меняется, поэтому к нему добавляется метка времени: иначе браузер
      // показывал бы старое фото из кеша.
      const url = `${bucket.getPublicUrl(avatarPath).data.publicUrl}?v=${Date.now()}`
      const { error: saveError } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', userId)
      if (saveError) throw saveError
    },

    async removeAvatar() {
      const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId)
      if (error) throw error
      // Сам файл убирается следом: если не вышло, он просто останется лежать без дела.
      await supabase.storage.from(AVATARS).remove([avatarPath])
    },

    async saveName(name, lastName) {
      const { error } = await supabase
        .from('profiles')
        .update({ name, last_name: lastName || null })
        .eq('id', userId)
      if (error) throw error
    },

    async changePassword(current, next) {
      if (!(await confirmPassword(email, current))) return 'wrong-password'
      const { error } = await supabase.auth.updateUser({ password: next })
      if (error) {
        if (error.code === 'same_password') return 'same-password'
        throw error
      }
      // Дата смены нужна только для подписи в Профиле: если не записалась, пароль всё равно сменён.
      await supabase
        .from('profiles')
        .update({ password_changed_at: new Date().toISOString() })
        .eq('id', userId)
      await supabase.auth.signOut({ scope: 'others' })
      return 'ok'
    },

    async deleteAccount(password) {
      if (!(await confirmPassword(email, password))) return 'wrong-password'
      // Фото лежит в хранилище отдельно от таблиц: вместе с аккаунтом само оно не удалится.
      await supabase.storage.from(AVATARS).remove([avatarPath])
      const { error } = await supabase.rpc('delete_account')
      if (error) throw error
      // Аккаунта уже нет, осталось забыть сессию в этом браузере.
      await supabase.auth.signOut({ scope: 'local' })
      return 'ok'
    },
  }
}
