// Формулы из SPEC.md, раздел 10. Даты везде в виде ISO-строк 'yyyy-MM-dd'
// в часовом поясе пользователя.

export type Checkable = { isDone: boolean }
export type DatedTask = Checkable & { date: string }
export type SortableItem = Checkable & { createdAt: string; position?: number | null }

export function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function countDone(items: Checkable[]): number {
  return items.filter((item) => item.isDone).length
}

/** Процент выполнения, округлённый до целого. Если считать не из чего, то null (в интерфейсе «—»). */
export function percent(done: number, total: number): number | null {
  return total === 0 ? null : Math.round((done / total) * 100)
}

/** % дня, а также прогресс недели и средний прогресс: формула одна, отличается набор задач. */
export function progress(tasks: Checkable[]): number | null {
  return percent(countDone(tasks), tasks.length)
}

export type WeekAnalytics = {
  total: number
  done: number
  remaining: number
  averageProgress: number | null
  /** ISO-дата самого продуктивного дня или null, если подходящих дней нет. */
  productiveDay: string | null
  goalsDone: number
}

export function weekAnalytics(
  tasks: DatedTask[],
  goals: Checkable[],
  weekStart: string,
  today: string,
): WeekAnalytics {
  const weekEnd = shiftDate(weekStart, 6)
  const weekTasks = tasks.filter((task) => task.date >= weekStart && task.date <= weekEnd)
  const done = countDone(weekTasks)

  // Будущие дни в «продуктивный день» не попадают. При равенстве берётся более ранний.
  let productiveDay: string | null = null
  let best = -1
  for (let i = 0; i < 7; i++) {
    const date = shiftDate(weekStart, i)
    if (date > today) break
    const value = progress(weekTasks.filter((task) => task.date === date))
    if (value !== null && value > best) {
      best = value
      productiveDay = date
    }
  }

  return {
    total: weekTasks.length,
    done,
    remaining: weekTasks.length - done,
    averageProgress: percent(done, weekTasks.length),
    productiveDay,
    goalsDone: countDone(goals),
  }
}

/** За сколько прошедших дней невыполненные задачи считаются «оставшимися с прошлых дней». */
export const OVERDUE_DAYS = 7

type OverdueCandidate = Checkable & { date: string; ruleId?: string | null }

/**
 * Невыполненные задачи последних дней: их предлагают перенести на сегодня, и из-за них
 * грустит маскот. Повторяющиеся не в счёт: у них на сегодня и так есть своя задача.
 */
export function overdueTasks<T extends OverdueCandidate>(tasks: T[], today: string): T[] {
  const from = shiftDate(today, -OVERDUE_DAYS)
  return tasks.filter(
    (task) => !task.isDone && !task.ruleId && task.date < today && task.date >= from,
  )
}

export function hasOverdue(tasks: OverdueCandidate[], today: string): boolean {
  return overdueTasks(tasks, today).length > 0
}

/**
 * Подряд идущие выполненные дни, заканчивая сегодня. Если сегодня ещё не отмечено,
 * серия считается до вчера включительно и не обнуляется до конца дня.
 */
export function currentStreak(checks: Iterable<string>, today: string): number {
  const days = new Set(checks)
  let day = days.has(today) ? today : shiftDate(today, -1)
  let streak = 0
  while (days.has(day)) {
    streak++
    day = shiftDate(day, -1)
  }
  return streak
}

export function bestStreak(checks: Iterable<string>): number {
  const days = [...new Set(checks)].sort()
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const day of days) {
    run = prev !== null && shiftDate(prev, 1) === day ? run + 1 : 1
    best = Math.max(best, run)
    prev = day
  }
  return best
}

export function totalChecks(checks: Iterable<string>): number {
  return new Set(checks).size
}

/**
 * Невыполненные сверху, выполненные снизу. Внутри группы сначала те, что расставлены вручную
 * (по своему месту), за ними остальные по времени создания: новая задача встаёт в конец.
 */
export function sortItems<T extends SortableItem>(items: T[]): T[] {
  const placed = (item: SortableItem) => item.position ?? Number.MAX_SAFE_INTEGER
  return [...items].sort(
    (a, b) =>
      Number(a.isDone) - Number(b.isDone) ||
      placed(a) - placed(b) ||
      a.createdAt.localeCompare(b.createdAt),
  )
}

export function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = Math.abs(n) % 10
  const mod100 = Math.abs(n) % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

export function formatDays(n: number): string {
  return `${n} ${pluralize(n, 'день', 'дня', 'дней')}`
}

export function greeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Доброе утро'
  if (hour >= 12 && hour < 18) return 'Добрый день'
  if (hour >= 18 && hour < 23) return 'Добрый вечер'
  return 'Доброй ночи'
}
