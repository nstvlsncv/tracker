import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useToast } from '../components/useToast'
import { UNDO_TOAST_DURATION_MS } from '../lib/constants'
import { newId } from '../lib/id'
import { pluralize } from '../lib/metrics'
import type { List, ListEntry, ListsApi, ListsData } from './lists'
import { ListsContext } from './useLists'
import type { ListsStatus, ListsValue } from './useLists'

const SAVE_ERROR_MESSAGE = 'Не удалось сохранить'
const EMPTY: ListsData = { lists: [], entries: [] }

/**
 * Хранит списки и их пункты на время сеанса и сохраняет изменения через `api`. Как у задач,
 * привычек и финансов, обновления оптимистичные: интерфейс меняется сразу, при ошибке
 * сохранения всё возвращается как было и показывается тост.
 */
export function ListsProvider({ api, children }: { api: ListsApi; children: ReactNode }) {
  const toast = useToast()
  const [status, setStatus] = useState<ListsStatus>('loading')
  const [data, setData] = useState<ListsData>(EMPTY)
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
        if (loaded) setData(loaded)
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
    (next: ListsData, request: Promise<unknown>) => {
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

  const value = useMemo<ListsValue>(() => {
    const undo = (message: string, onClick: () => void) =>
      toast({ message, duration: UNDO_TOAST_DURATION_MS, action: { label: 'Отменить', onClick } })

    /** Поменять один пункт на экране и в базе. */
    const patchEntry = (id: string, patch: Partial<ListEntry>) => {
      const state = latest.current
      if (!state.entries.some((entry) => entry.id === id)) return
      commit(
        { ...state, entries: state.entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)) },
        api.updateEntry(id, patch),
      )
    }

    /** Убрать пункты и предложить вернуть их. */
    const removeEntries = (removed: ListEntry[], message: string) => {
      if (removed.length === 0) return
      const ids = new Set(removed.map((entry) => entry.id))
      const state = latest.current
      commit(
        { ...state, entries: state.entries.filter((entry) => !ids.has(entry.id)) },
        api.deleteEntries([...ids]),
      )
      undo(message, () => {
        const current = latest.current
        // Список за это время могли удалить: возвращать пункты некуда.
        const alive = removed.filter((entry) => current.lists.some((list) => list.id === entry.listId))
        if (alive.length === 0) return
        commit({ ...current, entries: [...current.entries, ...alive] }, api.insertEntries(alive))
      })
    }

    return {
      status,
      lists: data.lists,
      entries: data.entries,
      reload,

      addList: (title) => {
        const list: List = { id: newId(), title, position: null, createdAt: new Date().toISOString() }
        const state = latest.current
        commit({ ...state, lists: [...state.lists, list] }, api.insertList(list))
        return list.id
      },

      renameList: (id, title) => {
        const state = latest.current
        commit(
          { ...state, lists: state.lists.map((list) => (list.id === id ? { ...list, title } : list)) },
          api.renameList(id, title),
        )
      },

      deleteList: (id) => {
        const state = latest.current
        const removed = state.lists.find((list) => list.id === id)
        if (!removed) return
        const own = state.entries.filter((entry) => entry.listId === id)
        commit(
          {
            lists: state.lists.filter((list) => list.id !== id),
            entries: state.entries.filter((entry) => entry.listId !== id),
          },
          api.deleteList(id),
        )
        undo('Список удалён', () => {
          const current = latest.current
          commit(
            { lists: [...current.lists, removed], entries: [...current.entries, ...own] },
            api.insertList(removed).then(() => (own.length > 0 ? api.insertEntries(own) : undefined)),
          )
        })
      },

      addEntry: (listId, title) => {
        const entry: ListEntry = {
          id: newId(),
          listId,
          title,
          isDone: false,
          position: null,
          createdAt: new Date().toISOString(),
        }
        const state = latest.current
        commit({ ...state, entries: [...state.entries, entry] }, api.insertEntries([entry]))
      },

      toggleEntry: (id, done) => patchEntry(id, { isDone: done }),
      renameEntry: (id, title) => patchEntry(id, { title }),

      deleteEntry: (id) =>
        removeEntries(
          latest.current.entries.filter((entry) => entry.id === id),
          'Пункт удалён',
        ),

      clearDone: (listId) => {
        const done = latest.current.entries.filter((entry) => entry.listId === listId && entry.isDone)
        removeEntries(
          done,
          `${pluralize(done.length, 'Убран', 'Убраны', 'Убрано')} ${done.length} ${pluralize(done.length, 'пункт', 'пункта', 'пунктов')}`,
        )
      },

      arrangeEntries: (listId, ids) => {
        const state = latest.current
        const changed = ids
          .map((id, index) => ({ id, position: index + 1 }))
          .filter(({ id, position }) => {
            const entry = state.entries.find((item) => item.id === id)
            return entry && (entry.position !== position || entry.listId !== listId)
          })
        if (changed.length === 0) return
        const placeOf = new Map(changed.map(({ id, position }) => [id, position]))
        commit(
          {
            ...state,
            entries: state.entries.map((entry) =>
              placeOf.has(entry.id) ? { ...entry, listId, position: placeOf.get(entry.id)! } : entry,
            ),
          },
          Promise.all(changed.map(({ id, position }) => api.updateEntry(id, { position, listId }))),
        )
      },
    }
  }, [api, status, data, reload, commit, toast])

  return <ListsContext.Provider value={value}>{children}</ListsContext.Provider>
}
