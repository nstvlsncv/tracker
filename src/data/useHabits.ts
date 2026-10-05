import { createContext, useContext } from 'react'
import type { Habit, HabitSchedule } from './types'

export type HabitsStatus = 'loading' | 'ready' | 'error'

export type HabitsValue = {
  status: HabitsStatus
  /** Активные привычки в заданном порядке (а где он не задан, по времени создания). */
  habits: Habit[]
  /** Привычки в архиве: на экранах и в подсчётах не участвуют, но хранят историю. */
  archived: Habit[]
  /** Дни 'yyyy-MM-dd', в которые привычка выполнена. Ключ: id привычки. */
  checks: Record<string, ReadonlySet<string> | undefined>
  /** Повторить загрузку после ошибки. */
  reload: () => void

  addHabit: (title: string, schedule: HabitSchedule) => void
  /** Изменить название и расписание. */
  editHabit: (id: string, title: string, schedule: HabitSchedule) => void
  /** Поставить или снять отметку за день (сегодня или задним числом). */
  toggleCheck: (id: string, date: string, done: boolean) => void
  /** Задать порядок активных привычек: id сверху вниз. */
  reorderHabits: (ids: string[]) => void
  /** Убрать в архив. Показывает тост с «Отменить». */
  /** Поставить привычку на паузу с сегодняшнего дня или снять с неё. */
  pauseHabit: (id: string, today: string) => void
  resumeHabit: (id: string, today: string) => void
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
