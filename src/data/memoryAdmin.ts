import type { AdminApi, AdminDay, AdminUser } from './admin'

const DAY_MS = 24 * 60 * 60 * 1000
const ago = (days: number, hours = 0) => new Date(Date.now() - days * DAY_MS - hours * 3_600_000).toISOString()
const iso = (date: Date) => date.toISOString().slice(0, 10)

type Seed = Partial<AdminUser> & Pick<AdminUser, 'id' | 'email' | 'name'>

const user = (seed: Seed): AdminUser => ({
  lastName: null,
  avatarUrl: null,
  createdAt: ago(40),
  lastSignInAt: ago(1),
  tasks: 0,
  tasksDone: 0,
  goals: 0,
  goalsDone: 0,
  habits: 0,
  checks: 0,
  moods: 0,
  notes: 0,
  rules: 0,
  financeItems: 0,
  lastActivity: null,
  onboarded: false,
  theme: null,
  accent: null,
  ...seed,
})

/** Выдуманные аккаунты для страницы разработки: люди разной активности, ничего личного. */
const USERS: AdminUser[] = [
  user({
    id: 'u1', email: 'anna@example.com', name: 'Анна', lastName: 'Орлова', createdAt: ago(64),
    lastSignInAt: ago(0, 2), lastActivity: ago(0, 1), tasks: 412, tasksDone: 351, goals: 27, goalsDone: 19,
    habits: 6, checks: 238, moods: 51, notes: 8, rules: 4, financeItems: 12, onboarded: true,
    theme: 'light', accent: 'lime',
  }),
  user({
    id: 'u2', email: 'misha@example.com', name: 'Миша', createdAt: ago(41), lastSignInAt: ago(1, 5),
    lastActivity: ago(1, 3), tasks: 187, tasksDone: 122, goals: 12, goalsDone: 5, habits: 3, checks: 74,
    moods: 9, rules: 2, onboarded: true, theme: 'dark', accent: 'sky',
  }),
  user({
    id: 'u3', email: 'lena@example.com', name: 'Лена', lastName: 'Ким', createdAt: ago(29),
    lastSignInAt: ago(3), lastActivity: ago(3, 6), tasks: 96, tasksDone: 71, goals: 9, goalsDone: 6,
    habits: 4, checks: 61, moods: 22, notes: 3, financeItems: 7, onboarded: true, theme: 'light', accent: 'pink',
  }),
  user({
    id: 'u4', email: 'oleg@example.com', name: 'Олег', createdAt: ago(22), lastSignInAt: ago(12),
    lastActivity: ago(12, 4), tasks: 34, tasksDone: 15, goals: 3, goalsDone: 1, habits: 1, checks: 6,
    theme: 'dark', accent: 'lime',
  }),
  user({
    id: 'u5', email: 'katya@example.com', name: 'Катя', lastName: 'Белова', createdAt: ago(58),
    lastSignInAt: ago(37), lastActivity: ago(39), tasks: 51, tasksDone: 20, goals: 4, goalsDone: 1,
    habits: 2, checks: 11, moods: 2, theme: 'light', accent: 'violet',
  }),
  user({
    id: 'u6', email: 'dima@example.com', name: 'Дима', createdAt: ago(9), lastSignInAt: ago(2),
    lastActivity: ago(2, 8), tasks: 23, tasksDone: 17, goals: 2, goalsDone: 2, habits: 2, checks: 9,
    moods: 4, financeItems: 5, onboarded: true, theme: 'light', accent: 'yellow',
  }),
  user({
    id: 'u7', email: 'sonya@example.com', name: 'Соня', createdAt: ago(5), lastSignInAt: ago(5),
    lastActivity: null,
  }),
  user({
    id: 'u8', email: 'guest@example.com', name: null, createdAt: ago(2), lastSignInAt: null,
    lastActivity: null,
  }),
]

/** Ровная, но не одинаковая активность: будни живее выходных, к сегодняшнему дню чуть больше. */
function days(count: number): AdminDay[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.now() - (count - 1 - index) * DAY_MS)
    const weekend = date.getDay() === 0 || date.getDay() === 6
    const wave = 0.6 + 0.4 * Math.sin(index / 3) + index / (count * 2)
    const scale = (weekend ? 0.5 : 1) * wave
    return {
      day: iso(date),
      tasksCreated: Math.round(14 * scale),
      tasksDone: Math.round(11 * scale),
      checks: Math.round(9 * scale),
      moods: Math.round(3 * scale),
      activeUsers: Math.max(1, Math.round(4 * scale)),
    }
  })
}

const pause = () => new Promise((resolve) => setTimeout(resolve, 200))

/** Админка на выдуманных данных: для страницы разработки (/dev/admin), без входа и без базы. */
export function createMemoryAdmin(): AdminApi {
  return {
    async isAdmin() {
      return true
    },
    async loadUsers() {
      await pause()
      return USERS
    },
    async loadDaily(count) {
      await pause()
      return days(count)
    },
    async loadTables() {
      await pause()
      return [
        { name: 'profiles', rows: 8 },
        { name: 'tasks', rows: 2140 },
        { name: 'goals', rows: 57 },
        { name: 'task_rules', rows: 6 },
        { name: 'habits', rows: 18 },
        { name: 'habit_checks', rows: 399 },
        { name: 'day_moods', rows: 88 },
        { name: 'week_notes', rows: 11 },
        { name: 'finance_items', rows: 24 },
        { name: 'finance_checks', rows: 31 },
        { name: 'finance_days', rows: 4 },
        { name: 'finance_spends', rows: 212 },
        { name: 'lists', rows: 9 },
        { name: 'list_items', rows: 143 },
      ]
    },
  }
}
