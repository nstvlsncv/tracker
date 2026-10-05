import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useToast } from '../components/useToast'
import { UNDO_TOAST_DURATION_MS } from '../lib/constants'
import { checkKey, shiftMonth } from '../lib/finance'
import { newId } from '../lib/id'
import type { FinanceApi, FinanceDay, FinanceItem } from './finance'
import { FinanceContext } from './useFinance'
import type { FinanceStatus, FinanceValue } from './useFinance'

const SAVE_ERROR_MESSAGE = 'Не удалось сохранить'

type State = { items: FinanceItem[]; checks: ReadonlySet<string>; days: FinanceDay[] }
const EMPTY: State = { items: [], checks: new Set(), days: [] }

/** Месяцы, за которые у строки стоят отметки. */
const checkedMonths = (checks: ReadonlySet<string>, id: string) =>
  [...checks].filter((key) => key.startsWith(`${id}:`)).map((key) => key.slice(id.length + 1))

/**
 * Хранит строки этапов, отметки и даты поступлений на время сеанса и сохраняет изменения
 * через `api`. Как у задач и привычек, обновления оптимистичные: интерфейс меняется сразу,
 * при ошибке сохранения всё возвращается как было и показывается тост.
 */
export function FinanceProvider({ api, children }: { api: FinanceApi; children: ReactNode }) {
  const toast = useToast()
  const [status, setStatus] = useState<FinanceStatus>('loading')
  const [data, setData] = useState<State>(EMPTY)
  // Номер попытки загрузки: «Повторить» увеличивает его и запускает загрузку заново.
  const [attempt, setAttempt] = useState(0)

  const latest = useRef(data)
  useEffect(() => {
    latest.current = data
  })

  useEffect(() => {
    let cancelled = false
    api.load().then(
      (loaded) => {
        if (cancelled) return
        if (loaded) {
          setData({
            items: loaded.items,
            checks: new Set(loaded.checks.map((check) => checkKey(check.itemId, check.month))),
            days: loaded.days,
          })
        }
        setStatus(loaded ? 'ready' : 'unavailable')
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

  /** Показать новое состояние сразу и сохранить. При ошибке вернуть прежнее и показать тост. */
  const commit = useCallback(
    (next: State, request: Promise<unknown>) => {
      const before = latest.current
      latest.current = next
      setData(next)
      request.catch(() => {
        latest.current = before
        setData(before)
        toast({ message: SAVE_ERROR_MESSAGE })
      })
    },
    [toast],
  )

  const value = useMemo<FinanceValue>(() => {
    const find = (id: string) => latest.current.items.find((item) => item.id === id)
    const all = (requests: Array<Promise<unknown>>) => Promise.all(requests)

    return {
      status,
      items: data.items,
      checks: data.checks,
      days: data.days,
      reload,

      addItem: (fields, month) => {
        const item: FinanceItem = {
          ...fields,
          id: newId(),
          startMonth: month,
          endMonth: null,
          createdAt: new Date().toISOString(),
        }
        const state = latest.current
        commit({ ...state, items: [...state.items, item] }, api.insertItem(item))
      },

      editItem: (id, month, title, amount) => {
        const state = latest.current
        const before = find(id)
        if (!before) return
        // Строка началась в этом же месяце: прошлого у неё нет, правим её саму.
        if (before.startMonth >= month) {
          const next = { ...before, title, amount }
          commit(
            { ...state, items: state.items.map((item) => (item.id === id ? next : item)) },
            api.updateItem(id, { title, amount }),
          )
          return
        }
        // Иначе прежняя строка заканчивается прошлым месяцем, а с этого идёт новая:
        // так в прошлых месяцах остаются прежние название и сумма.
        const closed = { ...before, endMonth: shiftMonth(month, -1) }
        const fresh = { ...before, id: newId(), title, amount, startMonth: month }
        // Отметки этого месяца и следующих переезжают на новую строку.
        const moved = checkedMonths(state.checks, id).filter((checked) => checked >= month)
        const checks = new Set(state.checks)
        for (const checked of moved) {
          checks.delete(checkKey(id, checked))
          checks.add(checkKey(fresh.id, checked))
        }
        commit(
          {
            ...state,
            items: [...state.items.map((item) => (item.id === id ? closed : item)), fresh],
            checks,
          },
          api
            .insertItem(fresh)
            .then(() => api.updateItem(id, { endMonth: closed.endMonth }))
            .then(() =>
              all(
                moved.flatMap((checked) => [
                  api.setCheck(fresh.id, checked, true),
                  api.setCheck(id, checked, false),
                ]),
              ),
            ),
        )
      },

      deleteItem: (id, month) => {
        const state = latest.current
        const removed = find(id)
        if (!removed) return
        const months = checkedMonths(state.checks, id)
        let restore: () => void
        if (removed.startMonth >= month) {
          // Строка началась в этом месяце: удаляется целиком, вместе с отметками.
          const checks = new Set(state.checks)
          for (const checked of months) checks.delete(checkKey(id, checked))
          commit(
            { ...state, items: state.items.filter((item) => item.id !== id), checks },
            api.deleteItem(id),
          )
          restore = () => {
            const current = latest.current
            const back = new Set(current.checks)
            for (const checked of months) back.add(checkKey(id, checked))
            commit(
              { ...current, items: [...current.items, removed], checks: back },
              api
                .insertItem(removed)
                .then(() => all(months.map((checked) => api.setCheck(id, checked, true)))),
            )
          }
        } else {
          // Иначе она заканчивается прошлым месяцем: в прошлых месяцах остаётся.
          const endMonth = shiftMonth(month, -1)
          const put = (next: FinanceItem, request: Promise<unknown>) => {
            const current = latest.current
            commit(
              { ...current, items: current.items.map((item) => (item.id === id ? next : item)) },
              request,
            )
          }
          put({ ...removed, endMonth }, api.updateItem(id, { endMonth }))
          restore = () => put(removed, api.updateItem(id, { endMonth: removed.endMonth }))
        }
        toast({
          message: 'Удалено',
          duration: UNDO_TOAST_DURATION_MS,
          action: { label: 'Отменить', onClick: restore },
        })
      },

      toggleCheck: (id, month, done) => {
        const state = latest.current
        const checks = new Set(state.checks)
        if (done) checks.add(checkKey(id, month))
        else checks.delete(checkKey(id, month))
        commit({ ...state, checks }, api.setCheck(id, month, done))
      },

      setDay: (stage, month, day) => {
        const state = latest.current
        const next = { stage, month, day }
        commit(
          {
            ...state,
            days: [...state.days.filter((item) => item.stage !== stage || item.month !== month), next],
          },
          api.saveDay(next),
        )
      },
    }
  }, [api, status, data, reload, commit, toast])

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}
