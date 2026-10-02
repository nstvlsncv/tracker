import { toISODate, weekStartISO } from '../lib/dates'
import { newId } from '../lib/id'
import { shiftDate } from '../lib/metrics'
import type { Goal, Habit, HabitCheck, PlannerApi, Task } from './types'

/**
 * Хранилище в памяти с демо-данными. Используется только в режиме разработки
 * (адреса /dev/app/…), чтобы смотреть экраны без входа и без базы.
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
    task(0, 'Прогулка с Винсом в 9:00', true),
    task(0, 'Прогулка с Винсом в 21:00', true),
    task(1, 'Сверстать макет дашборда'),
    task(1, 'Запустить стирку чёрного', true),
    task(1, 'Прогулка с Винсом в 9:00', true),
    task(2, 'Стоматолог 15:00'),
    { ...task(0, 'Задача с прошлой недели', true), date: shiftDate(weekStart, -5) },
  ]
  let goals: Goal[] = [
    goal('Подготовиться к др'),
    goal('Реализовать Pet-проект «Трекер»'),
    goal('Сделать резюме'),
    goal('Прочитать 2 главы книги «Задача трёх тел» (2 часть)', true),
  ]

  const today = toISODate(new Date())
  const habit = (title: string, archived = false): Habit => ({
    id: newId(),
    title,
    frequency: 'daily',
    archivedAt: archived ? new Date().toISOString() : null,
    position: null,
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, stamp++)).toISOString(),
  })
  let habits: Habit[] = [
    habit('Витамины вечером'),
    habit('Портфолио'),
    habit('Чтение 20 минут'),
    habit('Витамины утром'),
    habit('Зарядка 30 минут'),
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
    ...run(habits[4], 0, 1),
    ...run(habits[5], 40, 9),
  ]

  // Небольшая задержка, чтобы было видно состояние загрузки.
  const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 300))

  return {
    async loadWeek(start) {
      await wait()
      const end = shiftDate(start, 6)
      return {
        tasks: tasks.filter((item) => item.date >= start && item.date <= end),
        goals: goals.filter((item) => item.weekStart === start),
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
