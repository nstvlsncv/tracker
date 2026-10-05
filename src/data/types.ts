export type Task = {
  id: string
  /** День задачи, 'yyyy-MM-dd'. */
  date: string
  title: string
  isDone: boolean
  doneAt: string | null
  createdAt: string
  /** Правило повтора, из которого появилась задача. null или нет поля: обычная задача. */
  ruleId?: string | null
  /** Место в списке дня, если задачи двигали вручную. null или нет поля: по времени создания. */
  position?: number | null
}

/** daily: каждый день. weekdays: с понедельника по пятницу. weekly: в день недели начала. */
export type Repeat = 'daily' | 'weekdays' | 'weekly'

/**
 * Правило повторяющейся задачи. Сами задачи на каждый день обычные: они появляются из правила,
 * когда открывают неделю, и дальше живут своей жизнью (их можно отметить, переименовать, удалить).
 */
export type TaskRule = {
  id: string
  title: string
  repeat: Repeat
  /** Первый день повтора, 'yyyy-MM-dd'. */
  startDate: string
  /** Последний день повтора. null: повторяется без конца. */
  endDate: string | null
  /** Дни, на которые задачу заново ставить не нужно: её там удалили или перенесли. */
  skipped: string[]
  createdAt: string
}

export type RulePatch = { endDate?: string | null; skipped?: string[] }

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
  /** daily: каждый день. days: по дням недели из `days`. weekly: `timesPerWeek` раз в неделю. */
  frequency: HabitFrequency
  /** Дни недели для 'days': 1 понедельник, 7 воскресенье. */
  days: number[]
  /** Норма для 'weekly'. */
  timesPerWeek: number | null
  /** Когда привычку убрали в архив. null: активна. */
  archivedAt: string | null
  /** Место в списке, меньше значит выше. null: порядок не задан, идёт по времени создания. */
  position: number | null
  createdAt: string
  /** Паузы: отпуск, болезнь. В эти дни привычка не ждёт отметки, и серию они не рвут. */
  pauses?: HabitPause[]
}

/** Пауза привычки: с какого дня по какой включительно. `to` null: пауза ещё идёт. */
export type HabitPause = { from: string; to: string | null }

/** Настроение дня: от 1 (плохой день) до 5 (отличный). */
export type Mood = 1 | 2 | 3 | 4 | 5

/** Отметка «привычка выполнена в этот день». */
export type HabitCheck = { habitId: string; date: string }

export type HabitFrequency = 'daily' | 'days' | 'weekly'

/** Расписание привычки: как часто её нужно отмечать. */
export type HabitSchedule = Pick<Habit, 'frequency' | 'days' | 'timesPerWeek' | 'pauses'>

export type HabitPatch = Partial<HabitSchedule> & {
  title?: string
  archivedAt?: string | null
  position?: number
  pauses?: HabitPause[]
}

/** `date` и `ruleId` меняются только у задач: перенос на другой день отвязывает от повтора. */
export type ItemPatch = {
  title?: string
  isDone?: boolean
  doneAt?: string | null
  date?: string
  ruleId?: string | null
  /** Только у целей: перенос на другую неделю. */
  weekStart?: string
  /** Только у задач: место в списке дня. */
  position?: number | null
}

/**
 * Откуда берутся и куда сохраняются задачи, цели и привычки. Настоящая реализация ходит в Supabase,
 * а для витрины в режиме разработки есть реализация в памяти. Методы бросают ошибку при сбое.
 */
export type PlannerApi = {
  /** `note`: заметка недели. undefined: заметок в этой базе нет (не применена свежая схема). */
  loadWeek: (weekStart: string) => Promise<{ tasks: Task[]; goals: Goal[]; note?: string }>
  /** Сохранить заметку недели. Пустой текст убирает её. */
  saveNote: (weekStart: string, text: string) => Promise<void>

  /** Настроение по дням ('yyyy-MM-dd'). null: его в этой базе нет (не применена свежая схема). */
  loadMoods: () => Promise<Record<string, Mood> | null>
  /** Записать настроение дня. null убирает отметку. */
  saveMood: (date: string, mood: Mood | null) => Promise<void>

  /** Правила повторяющихся задач. null: повтора в этой базе нет (не применена свежая схема). */
  loadRules: () => Promise<TaskRule[] | null>
  insertRule: (rule: TaskRule) => Promise<void>
  updateRule: (id: string, patch: RulePatch) => Promise<void>
  /** Поставить задачи из правил. Если на этот день задача правила уже есть, она не дублируется. */
  insertRuleTasks: (tasks: Task[]) => Promise<void>
  /** Удалить задачи правила начиная с этого дня («эту и все следующие»). */
  deleteRuleTasksFrom: (ruleId: string, fromDate: string) => Promise<void>
  /** Все задачи и цели начиная с этого понедельника: для экрана статистики. */
  loadHistory: (fromWeekStart: string) => Promise<{ tasks: Task[]; goals: Goal[] }>
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
