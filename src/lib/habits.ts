import { getISODay, parseISO } from 'date-fns'
import type { Habit, HabitSchedule } from '../data/types'
import { weekStartISO } from './dates'
import { pluralize, shiftDate } from './metrics'

// Расписание привычки и всё, что от него зависит: нужна ли отметка сегодня и как считать серию.
// daily: каждый день. days: по выбранным дням недели. weekly: N раз в неделю в любые дни.

export const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
export const EVERY_DAY: HabitSchedule = { frequency: 'daily', days: [], timesPerWeek: null }

/** Серия: у «N раз в неделю» она считается в неделях, у остальных в днях. */
export type Streak = { value: number; unit: 'days' | 'weeks' }

export function scheduleOf(habit: Habit): HabitSchedule {
  return { frequency: habit.frequency, days: habit.days, timesPerWeek: habit.timesPerWeek }
}

const weekday = (date: string) => getISODay(parseISO(date))

/** Стоит ли день в расписании. У «N раз в неделю» подходит любой день. */
export function isScheduled(schedule: HabitSchedule, date: string): boolean {
  return schedule.frequency !== 'days' || schedule.days.includes(weekday(date))
}

/** Сколько отметок в неделе с этим понедельником. */
export function weekCount(checks: ReadonlySet<string>, weekStart: string): number {
  let count = 0
  for (let offset = 0; offset < 7; offset++) if (checks.has(shiftDate(weekStart, offset))) count++
  return count
}

/**
 * Ждёт ли привычка отметки сегодня. По дням недели: только в свои дни. N раз в неделю:
 * пока норма недели не набрана (а если сегодня уже отмечено, она остаётся в списке отмеченной).
 */
export function isDueOn(schedule: HabitSchedule, checks: ReadonlySet<string>, date: string): boolean {
  if (schedule.frequency === 'days') return isScheduled(schedule, date) || checks.has(date)
  if (schedule.frequency === 'weekly') {
    return checks.has(date) || weekCount(checks, weekStartISO(date)) < (schedule.timesPerWeek ?? 1)
  }
  return true
}

const earliest = (checks: ReadonlySet<string>) => [...checks].sort()[0] as string | undefined

/** Недельные серии: недели подряд, в которых норма выполнена. */
function weeklyRuns(schedule: HabitSchedule, checks: ReadonlySet<string>, today: string) {
  const first = earliest(checks)
  const goal = schedule.timesPerWeek ?? 1
  const thisWeek = weekStartISO(today)
  let best = 0
  let run = 0
  let current = 0
  if (first) {
    for (let week = weekStartISO(first); week <= thisWeek; week = shiftDate(week, 7)) {
      const met = weekCount(checks, week) >= goal
      // Текущая неделя ещё идёт: пока норма не набрана, серию она не рвёт.
      if (week === thisWeek && !met) break
      run = met ? run + 1 : 0
      best = Math.max(best, run)
    }
    current = run
  }
  return { current, best }
}

/** Серии по дням: идут подряд дни расписания, отмеченные без пропуска. */
function dailyRuns(schedule: HabitSchedule, checks: ReadonlySet<string>, today: string) {
  const first = earliest(checks)
  let best = 0
  let run = 0
  if (first) {
    for (let day = first; day <= today; day = shiftDate(day, 1)) {
      if (!isScheduled(schedule, day)) continue
      // Сегодняшний день ещё идёт: пока не отмечен, серию он не рвёт.
      if (day === today && !checks.has(day)) break
      run = checks.has(day) ? run + 1 : 0
      best = Math.max(best, run)
    }
  }
  return { current: run, best }
}

export function habitStreaks(
  schedule: HabitSchedule,
  checks: ReadonlySet<string>,
  today: string,
): { current: Streak; best: Streak } {
  const weekly = schedule.frequency === 'weekly'
  const runs = weekly ? weeklyRuns(schedule, checks, today) : dailyRuns(schedule, checks, today)
  const unit = weekly ? 'weeks' : 'days'
  return { current: { value: runs.current, unit }, best: { value: runs.best, unit } }
}

export function formatStreak({ value, unit }: Streak): string {
  return unit === 'weeks'
    ? `${value} ${pluralize(value, 'неделя', 'недели', 'недель')}`
    : `${value} ${pluralize(value, 'день', 'дня', 'дней')}`
}

/** Подпись единицы серии для карточки с числом: «дней» или «недель». */
export function streakUnit({ value, unit }: Streak): string {
  return unit === 'weeks'
    ? pluralize(value, 'неделя', 'недели', 'недель')
    : pluralize(value, 'день', 'дня', 'дней')
}

/** Расписание словами: «Каждый день», «Пн, ср, пт», «3 раза в неделю». */
export function scheduleLabel(schedule: HabitSchedule): string {
  if (schedule.frequency === 'days') {
    const names = [...schedule.days].sort().map((day) => WEEKDAY_LABELS[day - 1])
    if (names.length === 7) return 'Каждый день'
    return names.map((name, index) => (index === 0 ? name : name.toLowerCase())).join(', ')
  }
  if (schedule.frequency === 'weekly') {
    const times = schedule.timesPerWeek ?? 1
    return `${times} ${pluralize(times, 'раз', 'раза', 'раз')} в неделю`
  }
  return 'Каждый день'
}

/**
 * Доля выполненного за последние `days` дней, 0–100. По дням недели считаются только дни
 * расписания, у «N раз в неделю» норма пересчитывается на длину периода.
 */
export function completionRate(
  schedule: HabitSchedule,
  checks: ReadonlySet<string>,
  today: string,
  days: number,
): number {
  let done = 0
  let due = 0
  for (let offset = 0; offset < days; offset++) {
    const day = shiftDate(today, -offset)
    if (checks.has(day)) done++
    if (isScheduled(schedule, day)) due++
  }
  if (schedule.frequency === 'weekly') due = Math.round(((schedule.timesPerWeek ?? 1) * days) / 7)
  return due === 0 ? 0 : Math.min(100, Math.round((done / due) * 100))
}
