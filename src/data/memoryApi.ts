import { toISODate, weekStartISO } from '../lib/dates'
import { newId } from '../lib/id'
import { shiftDate } from '../lib/metrics'
import type { Goal, Habit, HabitCheck, PlannerApi, Task, TaskRule } from './types'

/**
 * Хранилище в памяти с демо-данными: экраны без входа и без базы. На нём работают
 * демо для гостей (/demo) и экраны для разработки (/dev/app).
 * После перезагрузки страницы данные возвращаются к исходным.
 */
export function createMemoryApi(): PlannerApi {
  const weekStart = weekStartISO(toISODate(new Date()))
  let stamp = 0
  const base = (title: string, isDone = false) => ({
    id: newId(),
    title,
    isDone,
    doneAt: isDone ? new Date().toISOString() : null,
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, stamp++)).toISOString(),
  })
  const task = (day: number, title: string, isDone = false): Task => ({
    ...base(title, isDone),
    date: shiftDate(weekStart, day),
  })
  const goal = (title: string, isDone = false): Goal => ({ ...base(title, isDone), weekStart })

  let tasks: Task[] = [
    // Демо видят посторонние (/demo): данные нейтральные, ничего личного.
    task(0, 'Утренняя пробежка', true),
    task(0, 'Купить продукты', true),
    task(1, 'Подготовить презентацию'),
    task(1, 'Запустить стирку', true),
    task(1, 'Позвонить родителям', true),
    task(2, 'Стоматолог в 15:00'),
    task(3, 'Оплатить счета'),
    task(4, 'Созвон с командой'),
    { ...task(0, 'Задача с прошлой недели', true), date: shiftDate(weekStart, -5) },
    // Прошлые недели: чтобы графику в Статистике было что показать.
    ...[1, 2, 3, 4, 5, 6, 7, 8].flatMap((weeksAgo) =>
      Array.from({ length: 6 + (weeksAgo % 3) }, (_, index) => ({
        ...task(0, `Задача ${index + 1}`, (index * 7 + weeksAgo * 3) % 10 < 5 + (weeksAgo % 4)),
        date: shiftDate(weekStart, -7 * weeksAgo + (index % 7)),
      })),
    ),
    // На сегодня задачи есть всегда, в какой бы день недели ни открыли демо.
    { ...task(0, 'Спланировать неделю', true), date: toISODate(new Date()) },
    { ...task(0, 'Разобрать почту'), date: toISODate(new Date()) },
    { ...task(0, 'Почитать перед сном'), date: toISODate(new Date()) },
  ]
  // Повторяющаяся задача: её экземпляры на каждый день ставит само приложение.
  let rules: TaskRule[] = [
    {
      id: newId(),
      title: 'Прогулка 30 минут',
      repeat: 'daily',
      startDate: weekStart,
      endDate: null,
      skipped: [],
      createdAt: new Date(Date.UTC(2026, 0, 1)).toISOString(),
    },
  ]
  const notes = new Map<string, string>([
    [weekStart, 'Хорошая неделя: закрыты почти все задачи. На следующей не забыть про стоматолога.'],
  ])
  let goals: Goal[] = [
    goal('Закончить курс по дизайну'),
    goal('Три тренировки'),
    goal('Разобрать гардероб'),
    goal('Прочитать две главы книги', true),
  ]

  const today = toISODate(new Date())
  const habit = (title: string, archived = false): Habit => ({
    id: newId(),
    title,
    frequency: 'daily',
    days: [],
    timesPerWeek: null,
    archivedAt: archived ? new Date().toISOString() : null,
    position: null,
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, stamp++)).toISOString(),
  })
  let habits: Habit[] = [
    habit('Витамины вечером'),
    habit('Английский 15 минут'),
    habit('Чтение 20 минут'),
    habit('Витамины утром'),
    { ...habit('Зарядка'), frequency: 'days', days: [1, 3, 5] },
    { ...habit('Спортзал'), frequency: 'weekly', timesPerWeek: 3 },
    habit('Холодный душ', true),
  ]
  /** Отметки подряд: `length` дней, последний из них `daysAgo` дней назад. */
  const run = (target: Habit, daysAgo: number, length: number): HabitCheck[] =>
    Array.from({ length }, (_, index) => ({
      habitId: target.id,
      date: shiftDate(today, -daysAgo - index),
    }))
  let checks: HabitCheck[] = [
    ...run(habits[1], 1, 3),
    ...run(habits[2], 0, 12),
    ...run(habits[2], 30, 32),
    ...run(habits[2], 110, 5),
    // Отметки больше года назад: у этой привычки появляется выбор года в истории.
    ...run(habits[2], 400, 20),
    ...run(habits[3], 0, 27),
    // Зарядка по пн, ср, пт: отметки за последние три недели в свои дни.
    ...[0, 2, 4, 7, 9, 11, 14, 16].map((offset) => ({
      habitId: habits[4].id,
      date: shiftDate(weekStart, 4 - offset),
    })),
    // Спортзал три раза в неделю: две полные недели и два раза на этой.
    ...[-14, -12, -10, -7, -5, -2, 0, 2].map((offset) => ({
      habitId: habits[5].id,
      date: shiftDate(weekStart, offset),
    })),
    ...run(habits[6], 40, 9),
  ]

  // Отметок в будущем не бывает: в начале недели часть демо-отметок ещё не наступила.
  checks = checks.filter((check) => check.date <= today)

  // Небольшая задержка, чтобы было видно состояние загрузки.
  const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 300))

  return {
    async loadWeek(start) {
      await wait()
      const end = shiftDate(start, 6)
      return {
        tasks: tasks.filter((item) => item.date >= start && item.date <= end),
        goals: goals.filter((item) => item.weekStart === start),
        note: notes.get(start) ?? '',
      }
    },
    async saveNote(start, text) {
      if (text) notes.set(start, text)
      else notes.delete(start)
    },
    async loadRules() {
      return rules
    },
    async insertRule(rule) {
      rules = [...rules, rule]
    },
    async updateRule(id, patch) {
      rules = rules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule))
    },
    async insertRuleTasks(added) {
      const taken = new Set(tasks.map((item) => `${item.ruleId}|${item.date}`))
      tasks = [...tasks, ...added.filter((item) => !taken.has(`${item.ruleId}|${item.date}`))]
    },
    async deleteRuleTasksFrom(ruleId, fromDate) {
      tasks = tasks.filter((item) => item.ruleId !== ruleId || item.date < fromDate)
    },
    async loadHistory(from) {
      await wait()
      return {
        tasks: tasks.filter((item) => item.date >= from),
        goals: goals.filter((item) => item.weekStart >= from),
      }
    },
    async loadWeeksWithData() {
      return [
        ...new Set([
          ...tasks.map((item) => weekStartISO(item.date)),
          ...goals.map((item) => item.weekStart),
        ]),
      ]
    },
    async insertTask(item) {
      tasks = [...tasks, item]
    },
    async updateTask(id, patch) {
      tasks = tasks.map((item) => (item.id === id ? { ...item, ...patch } : item))
    },
    async deleteTask(id) {
      tasks = tasks.filter((item) => item.id !== id)
    },
    async insertGoal(item) {
      goals = [...goals, item]
    },
    async updateGoal(id, patch) {
      goals = goals.map((item) => (item.id === id ? { ...item, ...patch } : item))
    },
    async deleteGoal(id) {
      goals = goals.filter((item) => item.id !== id)
    },
    async loadHabits() {
      await wait()
      return { habits, checks }
    },
    async insertHabit(item) {
      habits = [...habits, item]
    },
    async updateHabit(id, patch) {
      habits = habits.map((item) => (item.id === id ? { ...item, ...patch } : item))
    },
    async deleteHabit(id) {
      habits = habits.filter((item) => item.id !== id)
      checks = checks.filter((check) => check.habitId !== id)
    },
    async setHabitCheck(habitId, date, done) {
      checks = checks.filter((check) => check.habitId !== habitId || check.date !== date)
      if (done) checks = [...checks, { habitId, date }]
    },
  }
}
