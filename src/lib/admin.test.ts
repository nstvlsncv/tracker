import { describe, expect, it } from 'vitest'
import type { AdminDay, AdminUser } from '../data/admin'
import { adoption, formatCount, lastSeen, overview, percent, userName, userStatus } from './admin'

const NOW = new Date('2026-10-06T12:00:00Z')
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString()

const user = (extra: Partial<AdminUser> = {}): AdminUser => ({
  id: 'u',
  email: 'u@example.com',
  name: null,
  lastName: null,
  avatarUrl: null,
  createdAt: daysAgo(100),
  lastSignInAt: null,
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
  ...extra,
})

describe('статус пользователя', () => {
  it('без единого действия человек ещё не начал, даже если входил', () => {
    expect(userStatus(user({ lastSignInAt: daysAgo(1) }), NOW)).toBe('fresh')
  })

  it('активен за 7 дней, затих за 30, дальше пропал', () => {
    expect(userStatus(user({ lastActivity: daysAgo(2) }), NOW)).toBe('active')
    expect(userStatus(user({ lastActivity: daysAgo(12) }), NOW)).toBe('idle')
    expect(userStatus(user({ lastActivity: daysAgo(45) }), NOW)).toBe('gone')
  })

  it('недавний вход возвращает в активные того, кто уже что-то делал', () => {
    expect(userStatus(user({ lastActivity: daysAgo(45), lastSignInAt: daysAgo(1) }), NOW)).toBe('active')
  })

  it('последний раз видели: самое свежее из входа и действия', () => {
    expect(lastSeen(user({ lastActivity: daysAgo(5), lastSignInAt: daysAgo(2) }))).toBe(daysAgo(2))
    expect(lastSeen(user())).toBeNull()
  })
})

describe('сводка', () => {
  const users = [
    user({ id: 'a', lastActivity: daysAgo(1), tasks: 10, tasksDone: 5, habits: 2, createdAt: daysAgo(3) }),
    user({ id: 'b', lastActivity: daysAgo(20), tasks: 10, tasksDone: 10, theme: 'dark', accent: 'pink' }),
    user({ id: 'c' }),
  ]
  const daily: AdminDay[] = [
    { day: '2026-10-05', tasksCreated: 3, tasksDone: 2, checks: 1, moods: 0, activeUsers: 1 },
    { day: '2026-10-06', tasksCreated: 4, tasksDone: 1, checks: 2, moods: 1, activeUsers: 2 },
  ]

  it('считает людей по статусам, новых и итоги периода', () => {
    expect(overview(users, daily, NOW)).toEqual({
      users: 3,
      active: 1,
      idle: 1,
      gone: 0,
      fresh: 1,
      newUsers: 1,
      tasksCreated: 7,
      tasksDone: 3,
      checks: 3,
      moods: 1,
      doneRate: 75,
    })
  })

  it('возможности идут от самой популярной, доля считается от всех аккаунтов', () => {
    const rows = adoption(users)
    expect(rows[0]).toEqual({ id: 'tasks', label: 'Задачи', users: 2, share: 67 })
    expect(rows.find((row) => row.id === 'dark')?.users).toBe(1)
    expect(rows.find((row) => row.id === 'accent')?.users).toBe(1)
    expect(rows.find((row) => row.id === 'finance')?.share).toBe(0)
  })
})

describe('подписи', () => {
  it('имя: имя и фамилия, без них логин', () => {
    expect(userName(user({ name: 'Анна', lastName: 'Орлова' }))).toBe('Анна Орлова')
    expect(userName(user())).toBe('u@example.com')
  })

  it('доля: целый процент, без знаменателя её нет', () => {
    expect(percent(1, 3)).toBe(33)
    expect(percent(0, 0)).toBeNull()
  })

  it('числа пишутся с пробелом между тысячами', () => {
    expect(formatCount(2140)).toBe('2 140')
  })
})
