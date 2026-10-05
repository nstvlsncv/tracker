import { createContext, useContext } from 'react'
import type { Goal, Mood, Repeat, Task } from './types'

export type WeekStatus = 'loading' | 'ready' | 'error'

export type PlannerValue = {
  /** Все задачи и цели, загруженные за сеанс. Экраны сами выбирают нужные по дате. */
  tasks: Task[]
  goals: Goal[]
  /** Состояние загрузки по понедельнику недели. undefined: неделю ещё не запрашивали. */
  weekStatus: Record<string, WeekStatus | undefined>
  /** Понедельники недель, в которых есть хотя бы одна задача или цель. */
  weeksWithData: string[]
  /** Загрузить неделю, если она ещё не загружена. `force` перезапрашивает после ошибки. */
  loadWeek: (weekStart: string, force?: boolean) => void

  /** Все задачи и цели начиная с этого понедельника, свежие из базы: для статистики. */
  loadHistory: (fromWeekStart: string) => Promise<{ tasks: Task[]; goals: Goal[] }>
  /** Заметки недель по понедельнику. undefined: заметок в этой базе нет. */
  notes: Record<string, string> | undefined
  /** Сохранить заметку недели. Пустой текст убирает её. */
  saveNote: (weekStart: string, text: string) => void
  /** Настроение по дням. undefined: ещё грузится. null: настроений в этой базе нет. */
  moods: Record<string, Mood> | null | undefined
  /** Отметить настроение дня. null убирает отметку. */
  setMood: (date: string, mood: Mood | null) => void
  /** Можно ли ставить задачам повтор (в базе есть правила повтора). */
  canRepeat: boolean

  /** С `repeat` задача повторяется начиная с этого дня. */
  addTask: (date: string, title: string, repeat?: Repeat) => void
  toggleTask: (id: string, done: boolean) => void
  renameTask: (id: string, title: string) => void
  deleteTask: (id: string) => void
  /** Перенести задачи на другой день (невыполненное с прошлых дней на сегодня). */
  moveTasks: (ids: string[], date: string) => void
  /** Перестать повторять: убрать эту задачу и все следующие по её правилу. */
  endRepeat: (taskId: string) => void

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
