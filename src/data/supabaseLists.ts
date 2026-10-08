import { supabase } from '../lib/supabase'
import type { List, ListEntry, ListsApi } from './lists'

/** Supabase отдаёт не больше 1000 строк за запрос. */
const PAGE_SIZE = 1000
/** 42P01 у базы и PGRST205 у её API: такой таблицы нет. База старше кода. */
const NO_TABLE = ['42P01', 'PGRST205']

async function unwrap<T>(request: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await request
  if (error) throw error
  return data
}

const toRow = (entry: ListEntry) => ({
  id: entry.id,
  list_id: entry.listId,
  title: entry.title,
  is_done: entry.isDone,
  position: entry.position,
  created_at: entry.createdAt,
})

/** Все пункты всех списков. Список фильмов за годы легко перерастает тысячу: читаем страницами. */
async function loadEntries(): Promise<ListEntry[]> {
  const entries: ListEntry[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const page =
      (await unwrap(
        supabase
          .from('list_items')
          .select('id, list_id, title, is_done, position, created_at')
          .order('created_at')
          .order('id')
          .range(from, from + PAGE_SIZE - 1),
      )) ?? []
    for (const row of page) {
      entries.push({
        id: row.id as string,
        listId: row.list_id as string,
        title: row.title as string,
        isDone: row.is_done as boolean,
        position: row.position as number | null,
        createdAt: row.created_at as string,
      })
    }
    if (page.length < PAGE_SIZE) return entries
  }
}

// user_id в строки не передаётся: база сама подставляет текущего пользователя,
// а правила доступа не дают прочитать или изменить чужое.
export const supabaseLists: ListsApi = {
  async load() {
    const lists = await supabase.from('lists').select('id, title, position, created_at').order('created_at')
    // Таблиц списков может ещё не быть: тогда раздел говорит об этом, остальное работает.
    if (lists.error) {
      if (NO_TABLE.includes(lists.error.code)) return null
      throw lists.error
    }
    return {
      lists: (lists.data ?? []).map(
        (row): List => ({
          id: row.id as string,
          title: row.title as string,
          position: row.position as number | null,
          createdAt: row.created_at as string,
        }),
      ),
      entries: await loadEntries(),
    }
  },

  async insertList(list) {
    await unwrap(
      supabase.from('lists').insert({
        id: list.id,
        title: list.title,
        position: list.position,
        created_at: list.createdAt,
      }),
    )
  },

  async renameList(id, title) {
    await unwrap(supabase.from('lists').update({ title }).eq('id', id))
  },

  async deleteList(id) {
    // Пункты списка база удаляет сама.
    await unwrap(supabase.from('lists').delete().eq('id', id))
  },

  async insertEntries(entries) {
    await unwrap(supabase.from('list_items').insert(entries.map(toRow)))
  },

  async updateEntry(id, patch) {
    await unwrap(
      supabase
        .from('list_items')
        .update({
          ...(patch.title !== undefined && { title: patch.title }),
          ...(patch.isDone !== undefined && { is_done: patch.isDone }),
          ...(patch.position !== undefined && { position: patch.position }),
          ...(patch.listId !== undefined && { list_id: patch.listId }),
        })
        .eq('id', id),
    )
  },

  async deleteEntries(ids) {
    await unwrap(supabase.from('list_items').delete().in('id', ids))
  },
}
