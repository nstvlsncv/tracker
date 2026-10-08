/** Список: продукты, фильмы, идеи. Без дат, в отличие от задач. */
export type List = {
  id: string
  title: string
  /** Место среди списков, если их двигали. */
  position: number | null
  createdAt: string
}

/** Пункт списка. Отмеченный уходит вниз и гаснет, как выполненная задача. */
export type ListEntry = {
  id: string
  listId: string
  title: string
  isDone: boolean
  /** Место в списке, если пункты двигали вручную. */
  position: number | null
  createdAt: string
}

export type ListEntryPatch = {
  title?: string
  isDone?: boolean
  position?: number | null
  listId?: string
}

export type ListsData = { lists: List[]; entries: ListEntry[] }

/**
 * Откуда берутся и куда сохраняются списки. Устроено как `FinanceApi`: настоящая реализация
 * ходит в Supabase, демо работает в памяти. Методы бросают ошибку при сбое.
 */
export type ListsApi = {
  /** null: списков в этой базе нет (не применена свежая схема). */
  load: () => Promise<ListsData | null>
  insertList: (list: List) => Promise<void>
  renameList: (id: string, title: string) => Promise<void>
  /** Удаляет список вместе с его пунктами. */
  deleteList: (id: string) => Promise<void>
  /** Несколько пунктов сразу: так возвращается удалённое. */
  insertEntries: (entries: ListEntry[]) => Promise<void>
  updateEntry: (id: string, patch: ListEntryPatch) => Promise<void>
  deleteEntries: (ids: string[]) => Promise<void>
}
