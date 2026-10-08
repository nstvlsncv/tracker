import { newId } from '../lib/id'
import type { List, ListEntry, ListsApi } from './lists'

/** Демо-списки: [название, пункты]. Пункт с «+» в начале уже отмечен. */
const SETUP: Array<[string, string[]]> = [
  ['Продукты', ['Молоко', 'Яйца', 'Помидоры', 'Сыр', '+Хлеб', '+Кофе']],
  ['Посмотреть', ['Дюна: часть вторая', 'Разделение', 'Медведь', '+Анатомия падения', '+Субстанция', '+Одни из нас']],
  ['В поездку', ['Паспорт', 'Зарядка', 'Наушники', 'Аптечка']],
]

/**
 * Списки в памяти с демо-данными: для демо гостей (/demo) и экранов разработки (/dev/app).
 * Демо видят посторонние: в нём ничего личного.
 */
export function createMemoryLists(): ListsApi {
  let stamp = 0
  const at = () => new Date(Date.UTC(2026, 0, 1, 0, 0, stamp++)).toISOString()

  let lists: List[] = []
  let entries: ListEntry[] = []
  for (const [title, items] of SETUP) {
    const list: List = { id: newId(), title, position: null, createdAt: at() }
    lists.push(list)
    for (const item of items) {
      entries.push({
        id: newId(),
        listId: list.id,
        title: item.replace(/^\+/, ''),
        isDone: item.startsWith('+'),
        position: null,
        createdAt: at(),
      })
    }
  }

  // Небольшая задержка, чтобы было видно состояние загрузки.
  const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 300))

  return {
    async load() {
      await wait()
      return { lists, entries }
    },
    async insertList(list) {
      lists = [...lists, list]
    },
    async renameList(id, title) {
      lists = lists.map((list) => (list.id === id ? { ...list, title } : list))
    },
    async deleteList(id) {
      lists = lists.filter((list) => list.id !== id)
      entries = entries.filter((entry) => entry.listId !== id)
    },
    async insertEntries(added) {
      entries = [...entries, ...added]
    },
    async updateEntry(id, patch) {
      entries = entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry))
    },
    async deleteEntries(ids) {
      entries = entries.filter((entry) => !ids.includes(entry.id))
    },
  }
}
