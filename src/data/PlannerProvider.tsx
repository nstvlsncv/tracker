import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useToast } from '../components/useToast'
import { UNDO_TOAST_DURATION_MS } from '../lib/constants'
import { weekStartISO } from '../lib/dates'
import type { Goal, ItemPatch, PlannerApi, Task } from './types'
import { PlannerContext } from './usePlanner'
import type { PlannerValue, WeekStatus } from './usePlanner'

const SAVE_ERROR_MESSAGE = 'Не удалось сохранить'

type Entity = { id: string; title: string; isDone: boolean; doneAt: string | null }

const replace = <T extends Entity>(items: T[], next: T) =>
  items.map((item) => (item.id === next.id ? next : item))
const without = <T extends Entity>(items: T[], id: string) => items.filter((item) => item.id !== id)

/**
 * Хранит задачи и цели на время сеанса и сохраняет изменения через `api`.
 * Обновления оптимистичные: интерфейс меняется сразу, а при ошибке сохранения
 * изменение откатывается и показывается тост.
 */
export function PlannerProvider({ api, children }: { api: PlannerApi; children: ReactNode }) {
  const toast = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [weekStatus, setWeekStatus] = useState<Record<string, WeekStatus | undefined>>({})
  const [storedWeeks, setStoredWeeks] = useState<string[]>([])
  // TODO(open): отдельной записи о неделе в базе нет, поэтому добавленная пустая неделя
  // помнится только до перезагрузки. Как только в ней появится задача или цель, она останется.
  const [addedWeeks, setAddedWeeks] = useState<string[]>([])

  // Актуальные значения для обработчиков, которые не должны пересоздаваться на каждое изменение.
  const latest = useRef({ tasks, goals, weekStatus })
  useEffect(() => {
    latest.current = { tasks, goals, weekStatus }
  })

  useEffect(() => {
    let cancelled = false
    api.loadWeeksWithData().then(
      (weeks) => {
        if (!cancelled) setStoredWeeks(weeks)
      },
      // Список недель нужен только выпадающему списку: без него экран работает.
      () => {},
    )
    return () => {
      cancelled = true
    }
  }, [api])

  const loadWeek = useCallback(
    (weekStart: string, force = false) => {
      const status = latest.current.weekStatus[weekStart]
      if (status === 'loading' || (status && !force)) return
      const setStatus = (next: WeekStatus) =>
        setWeekStatus((current) => ({ ...current, [weekStart]: next }))
      // Статус записывается и в ref: повторный вызов до перерисовки не должен дублировать запрос.
      latest.current.weekStatus = { ...latest.current.weekStatus, [weekStart]: 'loading' }
      setStatus('loading')
      api.loadWeek(weekStart).then(
        (loaded) => {
          const taskIds = new Set(loaded.tasks.map((task) => task.id))
          const goalIds = new Set(loaded.goals.map((goal) => goal.id))
          setTasks((current) => [
            ...current.filter(
              (task) => weekStartISO(task.date) !== weekStart && !taskIds.has(task.id),
            ),
            ...loaded.tasks,
          ])
          setGoals((current) => [
            ...current.filter((goal) => goal.weekStart !== weekStart && !goalIds.has(goal.id)),
            ...loaded.goals,
          ])
          setStatus('ready')
        },
        () => setStatus('error'),
      )
    },
    [api],
  )

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

  const value = useMemo<PlannerValue>(() => {
    const now = () => new Date().toISOString()
    const base = () => ({
      id: crypto.randomUUID(),
      isDone: false,
      doneAt: null,
      createdAt: now(),
    })

    const patchTask = (id: string, patch: ItemPatch) => {
      const before = latest.current.tasks.find((task) => task.id === id)
      if (!before) return
      setTasks((current) => replace(current, { ...before, ...patch }))
      save(api.updateTask(id, patch), () => setTasks((current) => replace(current, before)))
    }

    const patchGoal = (id: string, patch: ItemPatch) => {
      const before = latest.current.goals.find((goal) => goal.id === id)
      if (!before) return
      setGoals((current) => replace(current, { ...before, ...patch }))
      save(api.updateGoal(id, patch), () => setGoals((current) => replace(current, before)))
    }

    const insertTask = (task: Task) => {
      setTasks((current) => [...current, task])
      save(api.insertTask(task), () => setTasks((current) => without(current, task.id)))
    }

    const insertGoal = (goal: Goal) => {
      setGoals((current) => [...current, goal])
      save(api.insertGoal(goal), () => setGoals((current) => without(current, goal.id)))
    }

    return {
      tasks,
      goals,
      weekStatus,
      knownWeeks: [
        ...new Set([
          ...storedWeeks,
          ...addedWeeks,
          ...tasks.map((task) => weekStartISO(task.date)),
          ...goals.map((goal) => goal.weekStart),
        ]),
      ],
      loadWeek,
      addWeek: (weekStart) => setAddedWeeks((current) => [...current, weekStart]),

      addTask: (date, title) => insertTask({ ...base(), date, title }),
      toggleTask: (id, isDone) => patchTask(id, { isDone, doneAt: isDone ? now() : null }),
      renameTask: (id, title) => patchTask(id, { title }),
      deleteTask: (id) => {
        const removed = latest.current.tasks.find((task) => task.id === id)
        if (!removed) return
        setTasks((current) => without(current, id))
        save(api.deleteTask(id), () => setTasks((current) => [...current, removed]))
        toast({
          message: 'Задача удалена',
          duration: UNDO_TOAST_DURATION_MS,
          action: { label: 'Отменить', onClick: () => insertTask(removed) },
        })
      },

      addGoal: (weekStart, title) => insertGoal({ ...base(), weekStart, title }),
      toggleGoal: (id, isDone) => patchGoal(id, { isDone, doneAt: isDone ? now() : null }),
      renameGoal: (id, title) => patchGoal(id, { title }),
      deleteGoal: (id) => {
        const removed = latest.current.goals.find((goal) => goal.id === id)
        if (!removed) return
        setGoals((current) => without(current, id))
        save(api.deleteGoal(id), () => setGoals((current) => [...current, removed]))
        toast({
          message: 'Цель удалена',
          duration: UNDO_TOAST_DURATION_MS,
          action: { label: 'Отменить', onClick: () => insertGoal(removed) },
        })
      },
    }
  }, [api, tasks, goals, weekStatus, storedWeeks, addedWeeks, loadWeek, save, toast])

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>
}
