import { parseISO } from 'date-fns'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useToast } from '../components/useToast'
import { UNDO_TOAST_DURATION_MS } from '../lib/constants'
import { formatDayMonth, weekStartISO } from '../lib/dates'
import { newId } from '../lib/id'
import { shiftDate } from '../lib/metrics'
import { ruleDatesInWeek } from '../lib/repeat'
import type { Goal, ItemPatch, PlannerApi, Task, TaskRule } from './types'
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
  // undefined: ни одна неделя ещё не сказала, есть ли в базе заметки.
  const [notes, setNotes] = useState<Record<string, string> | undefined>(undefined)
  // undefined: правила ещё грузятся. null: повтора в этой базе нет.
  const [rules, setRules] = useState<TaskRule[] | null | undefined>(undefined)

  // Актуальные значения для обработчиков, которые не должны пересоздаваться на каждое изменение.
  const latest = useRef({ tasks, goals, weekStatus, notes, rules })
  useEffect(() => {
    latest.current = { tasks, goals, weekStatus, notes, rules }
  })

  useEffect(() => {
    let cancelled = false
    api.loadRules().then(
      (loaded) => {
        if (!cancelled) setRules(loaded)
      },
      () => {
        if (!cancelled) setRules(null)
      },
    )
    return () => {
      cancelled = true
    }
  }, [api])

  /**
   * Поставить задачи из правил повтора на дни недели, где их ещё нет. Задачи появляются сразу,
   * в базу уходят фоном: если не сохранились, появятся снова при следующем открытии недели.
   */
  const fillFromRules = useCallback(
    (weekStarts: string[], list: TaskRule[]) => {
      const taken = new Set(
        latest.current.tasks.filter((task) => task.ruleId).map((task) => `${task.ruleId}|${task.date}`),
      )
      const added: Task[] = []
      for (const weekStart of weekStarts) {
        for (const rule of list) {
          for (const date of ruleDatesInWeek(rule, weekStart)) {
            if (taken.has(`${rule.id}|${date}`)) continue
            taken.add(`${rule.id}|${date}`)
            added.push({
              id: newId(),
              date,
              title: rule.title,
              isDone: false,
              doneAt: null,
              // Все задачи правила стоят в списке дня на одном и том же месте.
              createdAt: rule.createdAt,
              ruleId: rule.id,
            })
          }
        }
      }
      if (added.length === 0) return added
      latest.current.tasks = [...latest.current.tasks, ...added]
      setTasks((current) => [...current, ...added])
      return added
    },
    [],
  )

  // Неделя загрузилась (или догрузились правила): на её дни встают задачи из правил.
  const filledWeeks = useRef(new Set<string>())
  useEffect(() => {
    if (!rules) return
    const fresh = Object.keys(weekStatus).filter(
      (weekStart) => weekStatus[weekStart] === 'ready' && !filledWeeks.current.has(weekStart),
    )
    if (fresh.length === 0) return
    for (const weekStart of fresh) filledWeeks.current.add(weekStart)
    const added = fillFromRules(fresh, rules)
    if (added.length > 0) api.insertRuleTasks(added).catch(() => {})
  }, [api, rules, weekStatus, fillFromRules])

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
          const { note } = loaded
          if (note !== undefined) setNotes((current) => ({ ...current, [weekStart]: note }))
          // Неделю перечитали: задачи из правил проверяются заново.
          filledWeeks.current.delete(weekStart)
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
      id: newId(),
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

    /** Запомнить в правилах дни, на которые задачу заново ставить не нужно. */
    const skipRuleDates = (gone: Task[]) => {
      const byRule = new Map<string, string[]>()
      for (const task of gone) {
        if (task.ruleId) byRule.set(task.ruleId, [...(byRule.get(task.ruleId) ?? []), task.date])
      }
      for (const [ruleId, dates] of byRule) {
        const rule = latest.current.rules?.find((item) => item.id === ruleId)
        if (!rule) continue
        const skipped = [...new Set([...rule.skipped, ...dates])]
        setRules((current) =>
          (current ?? []).map((item) => (item.id === ruleId ? { ...item, skipped } : item)),
        )
        // Не сохранилось: в худшем случае задача появится на этом дне ещё раз.
        api.updateRule(ruleId, { skipped }).catch(() => {})
      }
    }

    const insertGoal = (goal: Goal) => {
      setGoals((current) => [...current, goal])
      save(api.insertGoal(goal), () => setGoals((current) => without(current, goal.id)))
    }

    return {
      tasks,
      goals,
      weekStatus,
      weeksWithData: [
        ...new Set([
          ...storedWeeks,
          ...tasks.map((task) => weekStartISO(task.date)),
          ...goals.map((goal) => goal.weekStart),
        ]),
      ],
      loadWeek,

      notes,
      saveNote: (weekStart, text) => {
        const before = latest.current.notes?.[weekStart] ?? ''
        if (text === before) return
        setNotes((current) => ({ ...current, [weekStart]: text }))
        save(api.saveNote(weekStart, text), () =>
          setNotes((current) => ({ ...current, [weekStart]: before })),
        )
      },
      canRepeat: Boolean(rules),

      addTask: (date, title, repeat) => {
        if (!repeat || !latest.current.rules) return insertTask({ ...base(), date, title })
        const rule: TaskRule = {
          id: newId(),
          title,
          repeat,
          startDate: date,
          endDate: null,
          skipped: [],
          createdAt: now(),
        }
        setRules((current) => [...(current ?? []), rule])
        // Задачи нового правила сразу встают на все уже открытые недели.
        const added = fillFromRules([...filledWeeks.current], [rule])
        const ids = new Set(added.map((task) => task.id))
        save(
          api.insertRule(rule).then(() => api.insertRuleTasks(added)),
          () => {
            setRules((current) => (current ?? []).filter((item) => item.id !== rule.id))
            setTasks((current) => current.filter((task) => !ids.has(task.id)))
          },
        )
      },
      toggleTask: (id, isDone) => patchTask(id, { isDone, doneAt: isDone ? now() : null }),
      renameTask: (id, title) => patchTask(id, { title }),
      deleteTask: (id) => {
        const removed = latest.current.tasks.find((task) => task.id === id)
        if (!removed) return
        setTasks((current) => without(current, id))
        save(api.deleteTask(id), () => setTasks((current) => [...current, removed]))
        // Задачу из правила повтора на этот день заново ставить не нужно.
        skipRuleDates([removed])
        toast({
          message: 'Задача удалена',
          duration: UNDO_TOAST_DURATION_MS,
          action: { label: 'Отменить', onClick: () => insertTask(removed) },
        })
      },

      moveTasks: (ids, date) => {
        const moved = latest.current.tasks.filter((task) => ids.includes(task.id))
        if (moved.length === 0) return
        // Перенесённая задача отвязывается от повтора: на новом дне она сама по себе,
        // а на старом по правилу заново не появляется. При отмене привязка возвращается.
        const place = (target: (task: Task) => string, detach: boolean) =>
          setTasks((current) =>
            current.map((task) => {
              const original = moved.find((item) => item.id === task.id)
              if (!original) return task
              return { ...task, date: target(original), ruleId: detach ? null : original.ruleId }
            }),
          )
        const send = (target: (task: Task) => string, detach: boolean) =>
          Promise.all(
            moved.map((task) =>
              api.updateTask(task.id, {
                date: target(task),
                ...(task.ruleId && { ruleId: detach ? null : task.ruleId }),
              }),
            ),
          ).then(() => {})
        place(() => date, true)
        save(send(() => date, true), () => place((task) => task.date, false))
        skipRuleDates(moved)
        toast({
          message:
            moved.length === 1
              ? `Задача перенесена на ${formatDayMonth(parseISO(date))}`
              : `Перенесено задач: ${moved.length}`,
          duration: UNDO_TOAST_DURATION_MS,
          action: {
            label: 'Отменить',
            onClick: () => {
              place((task) => task.date, false)
              save(send((task) => task.date, false), () => place(() => date, true))
            },
          },
        })
      },

      endRepeat: (taskId) => {
        const task = latest.current.tasks.find((item) => item.id === taskId)
        const rule = latest.current.rules?.find((item) => item.id === task?.ruleId)
        if (!task || !rule) return
        const removed = latest.current.tasks.filter(
          (item) => item.ruleId === rule.id && item.date >= task.date,
        )
        const ids = new Set(removed.map((item) => item.id))
        const endDate = shiftDate(task.date, -1)
        setRules((current) =>
          (current ?? []).map((item) => (item.id === rule.id ? { ...item, endDate } : item)),
        )
        setTasks((current) => current.filter((item) => !ids.has(item.id)))
        save(
          api.updateRule(rule.id, { endDate }).then(() => api.deleteRuleTasksFrom(rule.id, task.date)),
          () => {
            setRules((current) => (current ?? []).map((item) => (item.id === rule.id ? rule : item)))
            setTasks((current) => [...current, ...removed])
          },
        )
        toast({ message: 'Задача больше не повторяется' })
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
  }, [api, tasks, goals, weekStatus, storedWeeks, notes, rules, loadWeek, fillFromRules, save, toast])

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>
}
