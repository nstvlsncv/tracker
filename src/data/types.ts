export type Task = {
  id: string
  /** День задачи, 'yyyy-MM-dd'. */
  date: string
  title: string
  isDone: boolean
  doneAt: string | null
  createdAt: string
}

export type Goal = {
  id: string
  /** Понедельник недели цели, 'yyyy-MM-dd'. */
  weekStart: string
  title: string
  isDone: boolean
  doneAt: string | null
  createdAt: string
}

export type Habit = {
  id: string
  title: string
  /** Пока только 'daily'. Поле заложено под будущие варианты цели. */
  frequency: string
  /** Когда привычку убрали в архив. null: активна. */
  archivedAt: string | null
  createdAt: string
}

/** Отметка «привычка выполнена в этот день». */
export type HabitCheck = { habitId: string; date: string }

export type HabitPatch = { title?: string; archivedAt?: string | null }

export type ItemPatch = { title?: string; isDone?: boolean; doneAt?: string | null }

/**
 * Откуда берутся и куда сохраняются задачи, цели и привычки. Настоящая реализация ходит в Supabase,
 * а для витрины в режиме разработки есть реализация в памяти. Методы бросают ошибку при сбое.
 */
export type PlannerApi = {
  loadWeek: (weekStart: string) => Promise<{ tasks: Task[]; goals: Goal[] }>
  /** Понедельники всех недель, в которых есть хотя бы одна задача или цель. */
  loadWeeksWithData: () => Promise<string[]>
  insertTask: (task: Task) => Promise<void>
  updateTask: (id: string, patch: ItemPatch) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  insertGoal: (goal: Goal) => Promise<void>
  updateGoal: (id: string, patch: ItemPatch) => Promise<void>
  deleteGoal: (id: string) => Promise<void>

  /** Все привычки пользователя (и активные, и архивные) со всеми отметками. */
  loadHabits: () => Promise<{ habits: Habit[]; checks: HabitCheck[] }>
  insertHabit: (habit: Habit) => Promise<void>
  updateHabit: (id: string, patch: HabitPatch) => Promise<void>
  /** Удаляет привычку навсегда вместе с историей отметок. */
  deleteHabit: (id: string) => Promise<void>
  /** Поставить или снять отметку за день. */
  setHabitCheck: (habitId: string, date: string, done: boolean) => Promise<void>
}
