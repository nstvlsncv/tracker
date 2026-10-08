import { createContext, useContext } from 'react'
import type { List, ListEntry } from './lists'

/** unavailable: списков в этой базе нет (не применена свежая схема). */
export type ListsStatus = 'loading' | 'ready' | 'error' | 'unavailable'

export type ListsValue = {
  status: ListsStatus
  /** Списки по порядку создания. */
  lists: List[]
  /** Пункты всех списков. Экран сам выбирает пункты нужного. */
  entries: ListEntry[]
  /** Повторить загрузку после ошибки. */
  reload: () => void

  /** Завести список. Возвращает его id: экран сразу раскрывает новый список. */
  addList: (title: string) => string
  renameList: (id: string, title: string) => void
  /** Убрать список со всеми пунктами. Показывает тост с «Отменить». */
  deleteList: (id: string) => void

  addEntry: (listId: string, title: string) => void
  toggleEntry: (id: string, done: boolean) => void
  renameEntry: (id: string, title: string) => void
  /** Убрать пункт. Показывает тост с «Отменить». */
  deleteEntry: (id: string) => void
  /** Убрать все отмеченные пункты списка. Показывает тост с «Отменить». */
  clearDone: (listId: string) => void
  /**
   * Новый порядок неотмеченных пунктов списка сверху вниз. Среди них может быть пункт
   * из другого списка: его перетащили сюда.
   */
  arrangeEntries: (listId: string, ids: string[]) => void
}

export const ListsContext = createContext<ListsValue | null>(null)

export function useLists(): ListsValue {
  const value = useContext(ListsContext)
  if (!value) throw new Error('useLists: нет ListsProvider выше по дереву')
  return value
}
