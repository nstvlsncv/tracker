import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '../../auth/useAuth'
import { useToast } from '../../components/useToast'
import { prepareAvatar } from '../../lib/avatar'
import { failureMessage, useAccount } from './useAccount'

type AvatarActions = {
  /** Можно ли вообще менять фото: в базе есть для него место. */
  available: boolean
  /** Фото сейчас сохраняется или удаляется. */
  busy: boolean
  /** Открыть выбор файла. */
  pick: () => void
  remove: () => void
  /** Скрытое поле выбора файла: его нужно один раз отрисовать рядом с кнопками. */
  input: ReactNode
}

/**
 * Смена фото профиля: выбор файла, обрезка и сжатие в браузере, сохранение.
 * Одно и то же для кружка в шапке Профиля и для кнопок в блоке «Аккаунт».
 */
export function useAvatar(): AvatarActions {
  const { profile, refreshProfile } = useAuth()
  const account = useAccount()
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const run = async (action: () => Promise<void>, done: string) => {
    setBusy(true)
    try {
      await action()
      await refreshProfile()
      toast({ message: done })
    } catch (reason) {
      toast({ message: failureMessage(reason) })
    }
    setBusy(false)
  }

  const upload = async (file: File) => {
    let image: Blob
    try {
      image = await prepareAvatar(file)
    } catch {
      toast({ message: 'Этот файл не открывается как картинка. Попробуй другой' })
      return
    }
    await run(() => account.saveAvatar(image), 'Фото обновлено')
  }

  return {
    available: profile?.avatarUrl !== undefined,
    busy,
    pick: () => inputRef.current?.click(),
    remove: () => run(() => account.removeAvatar(), 'Фото убрано'),
    input: (
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          // Сброс значения: тот же файл можно выбрать ещё раз.
          event.target.value = ''
          if (file) void upload(file)
        }}
      />
    ),
  }
}
