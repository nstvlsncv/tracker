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

export type ItemPatch = { title?: string; isDone?: boolean; doneAt?: string | null }

/**
 * Откуда берутся и куда сохраняются задачи и цели. Настоящая реализация ходит в Supabase,
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
}
