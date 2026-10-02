import { weekStartISO } from '../lib/dates'
import { shiftDate } from '../lib/metrics'
import { supabase } from '../lib/supabase'
import type { Goal, ItemPatch, PlannerApi, Task } from './types'

type TaskRow = {
  id: string
  date: string
  title: string
  is_done: boolean
  done_at: string | null
  created_at: string
}
type GoalRow = Omit<TaskRow, 'date'> & { week_start: string }

const TASK_COLUMNS = 'id, date, title, is_done, done_at, created_at'
const GOAL_COLUMNS = 'id, week_start, title, is_done, done_at, created_at'

const toTask = (row: TaskRow): Task => ({
  id: row.id,
  date: row.date,
  title: row.title,
  isDone: row.is_done,
  doneAt: row.done_at,
  createdAt: row.created_at,
})

const toGoal = (row: GoalRow): Goal => ({
  id: row.id,
  weekStart: row.week_start,
  title: row.title,
  isDone: row.is_done,
  doneAt: row.done_at,
  createdAt: row.created_at,
})

const toRowPatch = (patch: ItemPatch) => ({
  ...(patch.title !== undefined && { title: patch.title }),
  ...(patch.isDone !== undefined && { is_done: patch.isDone }),
  ...(patch.doneAt !== undefined && { done_at: patch.doneAt }),
})

/** Запросы Supabase возвращают ошибку значением. Здесь она превращается в исключение. */
async function unwrap<T>(request: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await request
  if (error) throw error
  return data
}

// user_id в строки не передаётся: база сама подставляет текущего пользователя,
// а правила доступа не дают прочитать или изменить чужое.
export const supabaseApi: PlannerApi = {
  async loadWeek(weekStart) {
    const [tasks, goals] = await Promise.all([
      unwrap(
        supabase
          .from('tasks')
          .select(TASK_COLUMNS)
          .gte('date', weekStart)
          .lte('date', shiftDate(weekStart, 6)),
      ),
      unwrap(supabase.from('goals').select(GOAL_COLUMNS).eq('week_start', weekStart)),
    ])
    return { tasks: (tasks ?? []).map(toTask), goals: (goals ?? []).map(toGoal) }
  },

  async loadWeeksWithData() {
    // TODO(open): Supabase отдаёт не больше 1000 строк за запрос. Когда задач станет больше,
    // список недель нужно считать в базе (представление или функция).
    const [tasks, goals] = await Promise.all([
      unwrap(supabase.from('tasks').select('date')),
      unwrap(supabase.from('goals').select('week_start')),
    ])
    const weeks = new Set<string>()
    for (const row of tasks ?? []) weeks.add(weekStartISO(row.date))
    for (const row of goals ?? []) weeks.add(row.week_start)
    return [...weeks]
  },

  async insertTask(task) {
    await unwrap(
      supabase.from('tasks').insert({
        id: task.id,
        date: task.date,
        title: task.title,
        is_done: task.isDone,
        done_at: task.doneAt,
        created_at: task.createdAt,
      }),
    )
  },

  async updateTask(id, patch) {
    await unwrap(supabase.from('tasks').update(toRowPatch(patch)).eq('id', id))
  },

  async deleteTask(id) {
    await unwrap(supabase.from('tasks').delete().eq('id', id))
  },

  async insertGoal(goal) {
    await unwrap(
      supabase.from('goals').insert({
        id: goal.id,
        week_start: goal.weekStart,
        title: goal.title,
        is_done: goal.isDone,
        done_at: goal.doneAt,
        created_at: goal.createdAt,
      }),
    )
  },

  async updateGoal(id, patch) {
    await unwrap(supabase.from('goals').update(toRowPatch(patch)).eq('id', id))
  },

  async deleteGoal(id) {
    await unwrap(supabase.from('goals').delete().eq('id', id))
  },
}
