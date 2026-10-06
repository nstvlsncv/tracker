import type { AdminDay, AdminUser } from '../data/admin'

const DAY_MS = 24 * 60 * 60 * 1000

/** Сколько дней без действий человек ещё считается активным и сколько затихшим. */
export const ACTIVE_DAYS = 7
export const IDLE_DAYS = 30

/**
 * active: был в трекере за последние 7 дней. idle: за последние 30. gone: давно не был.
 * fresh: ни разу ничего не делал (аккаунт завели, но человек не начал).
 */
export type UserStatus = 'active' | 'idle' | 'gone' | 'fresh'

export const STATUS_LABELS: Record<UserStatus, string> = {
  active: 'Активен',
  idle: 'Затих',
  gone: 'Пропал',
  fresh: 'Не начал',
}

/** Порядок статусов при сортировке: сначала те, кто пользуется. */
export const STATUS_ORDER: UserStatus[] = ['active', 'idle', 'gone', 'fresh']

/** Когда человека последний раз видели: самое свежее из действия в трекере и входа. */
export function lastSeen(user: AdminUser): string | null {
  const stamps = [user.lastActivity, user.lastSignInAt].filter((stamp): stamp is string => Boolean(stamp))
  return stamps.length > 0 ? stamps.sort()[stamps.length - 1] : null
}

/** Сколько полных дней прошло с момента `stamp`. */
const daysSince = (stamp: string, now: Date) => (now.getTime() - new Date(stamp).getTime()) / DAY_MS

export function userStatus(user: AdminUser, now: Date): UserStatus {
  // Статус считается по действиям: вход без единого действия ещё не делает человека активным.
  if (!user.lastActivity) return 'fresh'
  const days = daysSince(lastSeen(user) ?? user.lastActivity, now)
  if (days <= ACTIVE_DAYS) return 'active'
  if (days <= IDLE_DAYS) return 'idle'
  return 'gone'
}

/** Имя для таблицы: имя и фамилия, а если их нет, логин. */
export function userName(user: AdminUser): string {
  return [user.name, user.lastName].filter(Boolean).join(' ') || user.email
}

/** Доля в процентах, целым числом. При нулевом знаменателе null: считать не из чего. */
export function percent(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 100) : null
}

export type Overview = {
  users: number
  active: number
  idle: number
  gone: number
  fresh: number
  /** Аккаунтов, заведённых за последние 30 дней. */
  newUsers: number
  /** Задач создано и выполнено за период графика. */
  tasksCreated: number
  tasksDone: number
  /** Отметок привычек и настроения за период графика. */
  checks: number
  moods: number
  /** Доля выполненных задач за всё время по всем аккаунтам. */
  doneRate: number | null
}

export function overview(users: AdminUser[], daily: AdminDay[], now: Date): Overview {
  const count = (status: UserStatus) => users.filter((user) => userStatus(user, now) === status).length
  const sum = (pick: (day: AdminDay) => number) => daily.reduce((total, day) => total + pick(day), 0)
  return {
    users: users.length,
    active: count('active'),
    idle: count('idle'),
    gone: count('gone'),
    fresh: count('fresh'),
    newUsers: users.filter((user) => daysSince(user.createdAt, now) <= IDLE_DAYS).length,
    tasksCreated: sum((day) => day.tasksCreated),
    tasksDone: sum((day) => day.tasksDone),
    checks: sum((day) => day.checks),
    moods: sum((day) => day.moods),
    doneRate: percent(
      users.reduce((total, user) => total + user.tasksDone, 0),
      users.reduce((total, user) => total + user.tasks, 0),
    ),
  }
}

/** Возможность трекера и признак того, что человек ею пользуется. */
export type Feature = { id: string; label: string; used: (user: AdminUser) => boolean }

export const FEATURES: Feature[] = [
  { id: 'tasks', label: 'Задачи', used: (user) => user.tasks > 0 },
  { id: 'goals', label: 'Цели недели', used: (user) => user.goals > 0 },
  { id: 'habits', label: 'Привычки', used: (user) => user.habits > 0 },
  { id: 'rules', label: 'Повтор задач', used: (user) => user.rules > 0 },
  { id: 'moods', label: 'Настроение дня', used: (user) => user.moods > 0 },
  { id: 'notes', label: 'Заметка недели', used: (user) => user.notes > 0 },
  { id: 'finance', label: 'Финансы', used: (user) => user.financeItems > 0 },
  { id: 'avatar', label: 'Фото профиля', used: (user) => Boolean(user.avatarUrl) },
  { id: 'dark', label: 'Тёмная тема', used: (user) => user.theme === 'dark' },
  { id: 'accent', label: 'Свой акцентный цвет', used: (user) => Boolean(user.accent) && user.accent !== 'lime' },
  { id: 'onboarded', label: 'Знакомство пройдено', used: (user) => user.onboarded },
]

export type Adoption = { id: string; label: string; users: number; share: number }

/** Сколько людей пользуется каждой возможностью, от самой популярной к самой редкой. */
export function adoption(users: AdminUser[]): Adoption[] {
  return FEATURES.map(({ id, label, used }) => {
    const count = users.filter(used).length
    return { id, label, users: count, share: percent(count, users.length) ?? 0 }
  }).sort((a, b) => b.users - a.users)
}

/** Число с пробелами между тысячами: «2 140». */
export function formatCount(value: number): string {
  return value.toLocaleString('ru-RU').replace(/[\u00a0\u202f]/g, ' ')
}
