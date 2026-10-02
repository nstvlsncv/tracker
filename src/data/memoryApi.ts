import { toISODate, weekStartISO } from '../lib/dates'
import { newId } from '../lib/id'
import { shiftDate } from '../lib/metrics'
import type { Goal, PlannerApi, Task } from './types'

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
  }
}
