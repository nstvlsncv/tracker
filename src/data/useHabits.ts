import { createContext, useContext } from 'react'
import type { Habit } from './types'

export type HabitsStatus = 'loading' | 'ready' | 'error'

export type HabitsValue = {
  status: HabitsStatus
  /** Активные привычки. */
  habits: Habit[]
  /** Привычки в архиве: на экранах и в подсчётах не участвуют, но хранят историю. */
  archived: Habit[]
  /** Дни 'yyyy-MM-dd', в которые привычка выполнена. Ключ: id привычки. */
  checks: Record<string, ReadonlySet<string> | undefined>
  /** Повторить загрузку после ошибки. */
  reload: () => void

  addHabit: (title: string) => void
  renameHabit: (id: string, title: string) => void
  /** Поставить или снять отметку за день (сегодня или задним числом). */
  toggleCheck: (id: string, date: string, done: boolean) => void
  /** Убрать в архив. Показывает тост с «Отменить». */
  archiveHabit: (id: string) => void
  restoreHabit: (id: string) => void
  /** Удалить навсегда вместе с историей. */
  deleteHabit: (id: string) => void
}

export const HabitsContext = createContext<HabitsValue | null>(null)

export function useHabits(): HabitsValue {
  const value = useContext(HabitsContext)
  if (!value) throw new Error('useHabits: нет HabitsProvider выше по дереву')
  return value
}
