import { withoutPause, withPause } from '../lib/habits'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useToast } from '../components/useToast'
import { UNDO_TOAST_DURATION_MS } from '../lib/constants'
import { newId } from '../lib/id'
import type { Habit, HabitPatch, PlannerApi } from './types'
import { HabitsContext } from './useHabits'
import type { HabitsStatus, HabitsValue } from './useHabits'

const SAVE_ERROR_MESSAGE = 'Не удалось сохранить'

type Checks = Record<string, ReadonlySet<string> | undefined>

/** Набор отметок привычки с добавленным или убранным днём. Исходный набор не меняется. */
function withCheck(checks: Checks, id: string, date: string, done: boolean): Checks {
  const days = new Set(checks[id])
  if (done) days.add(date)
  else days.delete(date)
  return { ...checks, [id]: days }
}

/**
 * Хранит привычки и их отметки на время сеанса и сохраняет изменения через `api`.
 * Как и у задач, обновления оптимистичные: интерфейс меняется сразу, при ошибке
 * сохранения изменение откатывается и показывается тост.
 */
export function HabitsProvider({ api, children }: { api: PlannerApi; children: ReactNode }) {
  const toast = useToast()
  const [status, setStatus] = useState<HabitsStatus>('loading')
  const [all, setAll] = useState<Habit[]>([])
  const [checks, setChecks] = useState<Checks>({})
  // Номер попытки загрузки: «Повторить» увеличивает его и запускает загрузку заново.
  const [attempt, setAttempt] = useState(0)

  const latest = useRef({ all, checks })
  useEffect(() => {
    latest.current = { all, checks }
  })

  useEffect(() => {
    let cancelled = false
    api.loadHabits().then(
      (loaded) => {
        if (cancelled) return
        const byHabit: Record<string, Set<string>> = {}
        for (const check of loaded.checks) (byHabit[check.habitId] ??= new Set()).add(check.date)
        setAll(loaded.habits)
        setChecks(byHabit)
        setStatus('ready')
      },
      () => {
        if (!cancelled) setStatus('error')
      },
    )
    return () => {
      cancelled = true
    }
  }, [api, attempt])

  const reload = useCallback(() => {
    setStatus('loading')
    setAttempt((current) => current + 1)
  }, [])

  /** Сохранить изменение. При ошибке вызвать откат и показать тост. */
  const save = useCallback(
    (request: Promise<void>, rollback: () => void) => {
      request.catch(() => {
        rollback()
        toast({ message: SAVE_ERROR_MESSAGE })
      })
    },
    [toast],
  )

  const value = useMemo<HabitsValue>(() => {
    const patchHabit = (id: string, patch: HabitPatch) => {
      const before = latest.current.all.find((habit) => habit.id === id)
      if (!before) return
      const put = (next: Habit) =>
        setAll((current) => current.map((habit) => (habit.id === id ? next : habit)))
      put({ ...before, ...patch })
      save(api.updateHabit(id, patch), () => put(before))
    }

    // Сначала по заданному порядку, привычки без места идут следом по времени создания.
    const byOrder = (a: Habit, b: Habit) =>
      (a.position ?? Infinity) - (b.position ?? Infinity) || a.createdAt.localeCompare(b.createdAt)

    return {
      status,
      habits: all.filter((habit) => !habit.archivedAt).sort(byOrder),
      archived: all.filter((habit) => habit.archivedAt).sort(byOrder),
      checks,
      reload,

      addHabit: (title, schedule) => {
        const habit: Habit = {
          id: newId(),
          title,
          ...schedule,
          archivedAt: null,
          position: null,
          createdAt: new Date().toISOString(),
        }
        setAll((current) => [...current, habit])
        save(api.insertHabit(habit), () =>
          setAll((current) => current.filter((item) => item.id !== habit.id)),
        )
      },

      editHabit: (id, title, schedule) => patchHabit(id, { title, ...schedule }),

      toggleCheck: (id, date, done) => {
        setChecks((current) => withCheck(current, id, date, done))
        save(api.setHabitCheck(id, date, done), () =>
          setChecks((current) => withCheck(current, id, date, !done)),
        )
      },

      reorderHabits: (ids) => {
        const before = latest.current.all
        const place = new Map(ids.map((id, index) => [id, index]))
        const changed = before.filter((habit) => place.has(habit.id) && place.get(habit.id) !== habit.position)
        if (changed.length === 0) return
        setAll(before.map((habit) => (place.has(habit.id) ? { ...habit, position: place.get(habit.id)! } : habit)))
        save(
          Promise.all(
            changed.map((habit) => api.updateHabit(habit.id, { position: place.get(habit.id)! })),
          ).then(() => {}),
          () => setAll(before),
        )
      },

      pauseHabit: (id, today) => {
        const habit = latest.current.all.find((item) => item.id === id)
        if (habit) patchHabit(id, { pauses: withPause(habit.pauses, today) })
      },
      resumeHabit: (id, today) => {
        const habit = latest.current.all.find((item) => item.id === id)
        if (habit) patchHabit(id, { pauses: withoutPause(habit.pauses, today) })
      },
      archiveHabit: (id) => {
        patchHabit(id, { archivedAt: new Date().toISOString() })
        toast({
          message: 'Привычка в архиве',
          duration: UNDO_TOAST_DURATION_MS,
          action: { label: 'Отменить', onClick: () => patchHabit(id, { archivedAt: null }) },
        })
      },

      restoreHabit: (id) => patchHabit(id, { archivedAt: null }),

      deleteHabit: (id) => {
        const removed = latest.current.all.find((habit) => habit.id === id)
        if (!removed) return
        setAll((current) => current.filter((habit) => habit.id !== id))
        // Отметки из памяти не убираются: при неудаче привычка вернётся со своей историей.
        save(api.deleteHabit(id), () => setAll((current) => [...current, removed]))
      },
    }
  }, [api, status, all, checks, reload, save, toast])

  return <HabitsContext.Provider value={value}>{children}</HabitsContext.Provider>
}
