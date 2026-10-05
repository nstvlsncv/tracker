import { weekStartISO } from '../lib/dates'
import { shiftDate } from '../lib/metrics'
import { supabase } from '../lib/supabase'
import type {
  Goal,
  Habit,
  HabitCheck,
  HabitFrequency,
  ItemPatch,
  Mood,
  PlannerApi,
  Repeat,
  Task,
  TaskRule,
} from './types'

type TaskRow = {
  id: string
  date: string
  title: string
  is_done: boolean
  done_at: string | null
  created_at: string
  /** Колонки может ещё не быть в базе (её добавляет свежая версия schema.sql). */
  rule_id?: string | null
}
type GoalRow = Omit<TaskRow, 'date' | 'rule_id'> & { week_start: string }

type RuleRow = {
  id: string
  title: string
  repeat: Repeat
  start_date: string
  end_date: string | null
  skipped: string[] | null
  created_at: string
}

// Все колонки, а не список: так чтение работает и до того, как в базе появилась rule_id.
const TASK_COLUMNS = '*'
const GOAL_COLUMNS = 'id, week_start, title, is_done, done_at, created_at'

const toTask = (row: TaskRow): Task => ({
  id: row.id,
  date: row.date,
  title: row.title,
  isDone: row.is_done,
  doneAt: row.done_at,
  createdAt: row.created_at,
  ruleId: row.rule_id ?? null,
})

const toTaskRow = (task: Task) => ({
  id: task.id,
  date: task.date,
  title: task.title,
  is_done: task.isDone,
  done_at: task.doneAt,
  created_at: task.createdAt,
  // Поле уходит в базу только у задач из правил: обычные сохраняются и без колонки rule_id.
  ...(task.ruleId && { rule_id: task.ruleId }),
})

const toRule = (row: RuleRow): TaskRule => ({
  id: row.id,
  title: row.title,
  repeat: row.repeat,
  startDate: row.start_date,
  endDate: row.end_date,
  skipped: row.skipped ?? [],
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
  ...(patch.date !== undefined && { date: patch.date }),
  ...(patch.ruleId !== undefined && { rule_id: patch.ruleId }),
})

type HabitRow = {
  id: string
  title: string
  frequency: string
  archived_at: string | null
  created_at: string
  /** Этих колонок может ещё не быть в базе (их добавляет свежая версия schema.sql). */
  position?: number | null
  days?: number[] | null
  times_per_week?: number | null
}

// Все колонки, а не список: так чтение работает и до того, как в базе появилась position.
const HABIT_COLUMNS = '*'

const toHabit = (row: HabitRow): Habit => ({
  id: row.id,
  title: row.title,
  frequency: (['days', 'weekly'].includes(row.frequency) ? row.frequency : 'daily') as HabitFrequency,
  days: row.days ?? [],
  timesPerWeek: row.times_per_week ?? null,
  archivedAt: row.archived_at,
  position: row.position ?? null,
  createdAt: row.created_at,
})

/** Supabase отдаёт не больше 1000 строк за запрос. */
const PAGE_SIZE = 1000

/** Запросы Supabase возвращают ошибку значением. Здесь она превращается в исключение. */
async function unwrap<T>(request: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await request
  if (error) throw error
  return data
}

/** Читает таблицу целиком, страница за страницей: отметок привычек за год больше тысячи. */
async function loadAllChecks(): Promise<HabitCheck[]> {
  const checks: HabitCheck[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const page =
      (await unwrap(
        supabase
          .from('habit_checks')
          .select('habit_id, date')
          .order('date')
          .order('habit_id')
          .range(from, from + PAGE_SIZE - 1),
      )) ?? []
    for (const row of page) checks.push({ habitId: row.habit_id, date: row.date })
    if (page.length < PAGE_SIZE) return checks
  }
}

// user_id в строки не передаётся: база сама подставляет текущего пользователя,
// а правила доступа не дают прочитать или изменить чужое.
export const supabaseApi: PlannerApi = {
  async loadWeek(weekStart) {
    const [tasks, goals, note] = await Promise.all([
      unwrap(
        supabase
          .from('tasks')
          .select(TASK_COLUMNS)
          .gte('date', weekStart)
          .lte('date', shiftDate(weekStart, 6)),
      ),
      unwrap(supabase.from('goals').select(GOAL_COLUMNS).eq('week_start', weekStart)),
      // Таблицы заметок может ещё не быть: тогда неделя открывается без заметки.
      supabase
        .from('week_notes')
        .select('text')
        .eq('week_start', weekStart)
        .maybeSingle()
        .then(({ data, error }) => (error ? undefined : ((data?.text as string) ?? ''))),
    ])
    return { tasks: (tasks ?? []).map(toTask), goals: (goals ?? []).map(toGoal), note }
  },

  async saveNote(weekStart, text) {
    await unwrap(
      text
        ? supabase
            .from('week_notes')
            .upsert(
              { week_start: weekStart, text, updated_at: new Date().toISOString() },
              { onConflict: 'user_id,week_start' },
            )
        : supabase.from('week_notes').delete().eq('week_start', weekStart),
    )
  },

  async loadMoods() {
    const moods: Record<string, Mood> = {}
    // По строке на день: читаем страницами, за три года их уже больше тысячи.
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from('day_moods')
        .select('date, mood')
        .order('date')
        .range(from, from + PAGE_SIZE - 1)
      // Таблицы настроений может ещё не быть: тогда трекер работает без них.
      if (error) return null
      for (const row of data ?? []) moods[row.date as string] = row.mood as Mood
      if ((data ?? []).length < PAGE_SIZE) return moods
    }
  },

  async saveMood(date, mood) {
    await unwrap(
      mood
        ? supabase
            .from('day_moods')
            .upsert(
              { date, mood, updated_at: new Date().toISOString() },
              { onConflict: 'user_id,date' },
            )
        : supabase.from('day_moods').delete().eq('date', date),
    )
  },

  async loadRules() {
    const { data, error } = await supabase.from('task_rules').select('*')
    // Таблицы правил может ещё не быть: тогда трекер работает без повтора.
    return error ? null : (data as RuleRow[]).map(toRule)
  },

  async insertRule(rule) {
    await unwrap(
      supabase.from('task_rules').insert({
        id: rule.id,
        title: rule.title,
        repeat: rule.repeat,
        start_date: rule.startDate,
        end_date: rule.endDate,
        skipped: rule.skipped,
        created_at: rule.createdAt,
      }),
    )
  },

  async updateRule(id, patch) {
    await unwrap(
      supabase
        .from('task_rules')
        .update({
          ...(patch.endDate !== undefined && { end_date: patch.endDate }),
          ...(patch.skipped !== undefined && { skipped: patch.skipped }),
        })
        .eq('id', id),
    )
  },

  async insertRuleTasks(tasks) {
    if (tasks.length === 0) return
    // Неделю могли открыть на двух устройствах сразу: вторая попытка поставить ту же задачу
    // правила на тот же день молча пропускается.
    await unwrap(
      supabase
        .from('tasks')
        .upsert(tasks.map(toTaskRow), { onConflict: 'rule_id,date', ignoreDuplicates: true }),
    )
  },

  async deleteRuleTasksFrom(ruleId, fromDate) {
    await unwrap(supabase.from('tasks').delete().eq('rule_id', ruleId).gte('date', fromDate))
  },

  async loadHistory(fromWeekStart) {
    // За 12 недель задач заведомо меньше тысячи строк, которые отдаёт один запрос.
    const [tasks, goals] = await Promise.all([
      unwrap(supabase.from('tasks').select(TASK_COLUMNS).gte('date', fromWeekStart)),
      unwrap(supabase.from('goals').select(GOAL_COLUMNS).gte('week_start', fromWeekStart)),
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
    await unwrap(supabase.from('tasks').insert(toTaskRow(task)))
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

  async loadHabits() {
    const [habits, checks] = await Promise.all([
      unwrap(supabase.from('habits').select(HABIT_COLUMNS)),
      loadAllChecks(),
    ])
    return { habits: (habits ?? []).map(toHabit), checks }
  },

  async insertHabit(habit) {
    await unwrap(
      supabase.from('habits').insert({
        id: habit.id,
        title: habit.title,
        frequency: habit.frequency,
        archived_at: habit.archivedAt,
        created_at: habit.createdAt,
        // Колонки расписания уходят в базу только у привычек не на каждый день:
        // обычные сохраняются и до того, как в базе появились эти колонки.
        ...(habit.frequency !== 'daily' && {
          days: habit.days,
          times_per_week: habit.timesPerWeek,
        }),
      }),
    )
  },

  async updateHabit(id, patch) {
    await unwrap(
      supabase
        .from('habits')
        .update({
          ...(patch.title !== undefined && { title: patch.title }),
          ...(patch.archivedAt !== undefined && { archived_at: patch.archivedAt }),
          ...(patch.position !== undefined && { position: patch.position }),
          ...(patch.frequency !== undefined && { frequency: patch.frequency }),
          ...(patch.days !== undefined && { days: patch.days }),
          ...(patch.timesPerWeek !== undefined && { times_per_week: patch.timesPerWeek }),
        })
        .eq('id', id),
    )
  },

  async deleteHabit(id) {
    // Отметки удаляются базой вместе с привычкой.
    await unwrap(supabase.from('habits').delete().eq('id', id))
  },

  async setHabitCheck(habitId, date, done) {
    await unwrap(
      done
        ? supabase.from('habit_checks').upsert({ habit_id: habitId, date })
        : supabase.from('habit_checks').delete().eq('habit_id', habitId).eq('date', date),
    )
  },
}
