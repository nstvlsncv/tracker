import { supabase } from '../lib/supabase'
import type { AdminApi, AdminDay, AdminTable, AdminUser } from './admin'

type UserRow = {
  id: string
  email: string
  name: string | null
  last_name: string | null
  avatar_url: string | null
  created_at: string
  last_sign_in_at: string | null
  tasks: number
  tasks_done: number
  goals: number
  goals_done: number
  habits: number
  checks: number
  moods: number
  notes: number
  rules: number
  finance_items: number
  last_activity: string | null
  onboarded: boolean
  theme: string | null
  accent: string | null
}

type DayRow = {
  day: string
  tasks_created: number
  tasks_done: number
  checks: number
  moods: number
  active_users: number
}

const toUser = (row: UserRow): AdminUser => ({
  id: row.id,
  email: row.email,
  name: row.name,
  lastName: row.last_name,
  avatarUrl: row.avatar_url,
  createdAt: row.created_at,
  lastSignInAt: row.last_sign_in_at,
  tasks: row.tasks,
  tasksDone: row.tasks_done,
  goals: row.goals,
  goalsDone: row.goals_done,
  habits: row.habits,
  checks: row.checks,
  moods: row.moods,
  notes: row.notes,
  rules: row.rules,
  financeItems: row.finance_items,
  lastActivity: row.last_activity,
  onboarded: row.onboarded,
  theme: row.theme,
  accent: row.accent,
})

const toDay = (row: DayRow): AdminDay => ({
  day: row.day,
  tasksCreated: row.tasks_created,
  tasksDone: row.tasks_done,
  checks: row.checks,
  moods: row.moods,
  activeUsers: row.active_users,
})

/**
 * Админка на настоящих данных. Все запросы идут через функции базы (`supabase/schema.sql`):
 * они сами проверяют, что вызывает админ, и отдают только числа.
 */
export const supabaseAdmin: AdminApi = {
  async isAdmin() {
    const { data, error } = await supabase.rpc('is_admin')
    // Функции ещё нет в базе или нет сети: прав админа нет.
    return !error && data === true
  },

  async loadUsers() {
    const { data, error } = await supabase.rpc('admin_users')
    if (error) throw error
    return (data as UserRow[]).map(toUser)
  },

  async loadDaily(days) {
    const { data, error } = await supabase.rpc('admin_daily', { days })
    if (error) throw error
    return (data as DayRow[]).map(toDay)
  },

  async loadTables() {
    const { data, error } = await supabase.rpc('admin_tables')
    if (error) throw error
    return data as AdminTable[]
  },
}
