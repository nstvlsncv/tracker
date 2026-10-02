import { createContext, useContext } from 'react'
import type { Goal, Task } from './types'

export type WeekStatus = 'loading' | 'ready' | 'error'

export type PlannerValue = {
  /** Все задачи и цели, загруженные за сеанс. Экраны сами выбирают нужные по дате. */
  tasks: Task[]
  goals: Goal[]
  /** Состояние загрузки по понедельнику недели. undefined: неделю ещё не запрашивали. */
  weekStatus: Record<string, WeekStatus | undefined>
  /** Понедельники недель для списка: те, где есть данные, и добавленные вручную за сеанс. */
  knownWeeks: string[]
  /** Добавить неделю в список. Пустая неделя живёт до перезагрузки страницы. */
  addWeek: (weekStart: string) => void
  /** Загрузить неделю, если она ещё не загружена. `force` перезапрашивает после ошибки. */
  loadWeek: (weekStart: string, force?: boolean) => void

  addTask: (date: string, title: string) => void
  toggleTask: (id: string, done: boolean) => void
  renameTask: (id: string, title: string) => void
  deleteTask: (id: string) => void

  addGoal: (weekStart: string, title: string) => void
  toggleGoal: (id: string, done: boolean) => void
  renameGoal: (id: string, title: string) => void
  deleteGoal: (id: string) => void
}

export const PlannerContext = createContext<PlannerValue | null>(null)

export function usePlanner(): PlannerValue {
  const value = useContext(PlannerContext)
  if (!value) throw new Error('usePlanner: нет PlannerProvider выше по дереву')
  return value
}
