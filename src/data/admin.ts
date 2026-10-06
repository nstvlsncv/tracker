/**
 * Данные админки: сводная статистика по всем аккаунтам. Только числа и служебные сведения,
 * без содержимого: названий задач, заметок и сумм админка не видит.
 */

/** Один аккаунт: кто, когда появился и заходил, сколько чего завёл. */
export type AdminUser = {
  id: string
  email: string
  name: string | null
  lastName: string | null
  avatarUrl: string | null
  /** Когда завели аккаунт, ISO-строка. */
  createdAt: string
  /** Последний вход по паролю. null: ни разу не входил. */
  lastSignInAt: string | null
  /** Задачи: заведённые руками и выполненные (повторы, которые встали сами, не в счёт). */
  tasks: number
  tasksDone: number
  goals: number
  goalsDone: number
  habits: number
  /** Отметки привычек за всё время. */
  checks: number
  /** Дней с отмеченным настроением. */
  moods: number
  /** Недель с заметкой. */
  notes: number
  /** Правил повтора задач. */
  rules: number
  /** Строк в Финансах. */
  financeItems: number
  /** Последнее действие в трекере. null: человек ничего не создавал и не отмечал. */
  lastActivity: string | null
  /** Знакомство с трекером пройдено или пропущено. */
  onboarded: boolean
  theme: string | null
  accent: string | null
}

/** Активность за один день. */
export type AdminDay = {
  /** 'yyyy-MM-dd' */
  day: string
  tasksCreated: number
  tasksDone: number
  checks: number
  moods: number
  /** Сколько людей в этот день что-то создали или отметили. */
  activeUsers: number
}

/** Таблица базы и число строк в ней. */
export type AdminTable = { name: string; rows: number }

/** Откуда админка берёт данные: Supabase в приложении, память на странице для разработки. */
export type AdminApi = {
  /** Есть ли у вошедшего права админа. false и тогда, когда админки в базе ещё нет. */
  isAdmin: () => Promise<boolean>
  loadUsers: () => Promise<AdminUser[]>
  /** Активность по дням за последние `days` дней, от старых к новым. */
  loadDaily: (days: number) => Promise<AdminDay[]>
  loadTables: () => Promise<AdminTable[]>
}
