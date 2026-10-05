import { useEffect } from 'react'
import { ACCENTS, getAccent, onAccentChange, setAccent } from '../lib/accent'
import type { Accent } from '../lib/accent'
import { supabase } from '../lib/supabase'
import { getTheme, onThemeChange, setTheme } from '../lib/theme'
import type { Theme } from '../lib/theme'

type Appearance = { theme?: Theme; accent?: Accent }

const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark'
const isAccent = (value: unknown): value is Accent =>
  ACCENTS.some((accent) => accent.value === value)

/**
 * Тема и акцентный цвет едут за аккаунтом: выбранное на одном устройстве появляется на другом.
 * Хранятся в данных пользователя Supabase (user_metadata), отдельной таблицы для них нет.
 * При входе берётся то, что записано в аккаунте; любое изменение сразу уходит в аккаунт.
 * Браузер по-прежнему помнит выбор сам (localStorage): страница красится до загрузки аккаунта.
 */
export function useAppearanceSync(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    // Что записано в аккаунте. null: ещё не знаем.
    let saved: Appearance | null = null
    // Выбор поменяли здесь раньше, чем пришёл ответ аккаунта: тогда главнее он.
    let touched = false

    const push = () => {
      if (!saved) {
        touched = true
        return
      }
      const next = { theme: getTheme(), accent: getAccent() }
      if (next.theme === saved.theme && next.accent === saved.accent) return
      saved = next
      // Не сохранилось (нет сети): выбор остаётся в этом браузере и уйдёт при следующей смене.
      void supabase.auth.updateUser({ data: next })
    }

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled || !data.user) return
      const meta = data.user.user_metadata ?? {}
      saved = {
        theme: isTheme(meta.theme) ? meta.theme : undefined,
        accent: isAccent(meta.accent) ? meta.accent : undefined,
      }
      if (!touched) {
        if (saved.theme) setTheme(saved.theme)
        if (saved.accent) setAccent(saved.accent)
      }
      // В аккаунте ещё пусто или выбор успели поменять: записываем текущий.
      push()
    })

    const offTheme = onThemeChange(push)
    const offAccent = onAccentChange(push)
    return () => {
      cancelled = true
      offTheme()
      offAccent()
    }
  }, [userId])
}
