import { supabase } from '../lib/supabase'
import type {
  FinanceApi,
  FinanceCheck,
  FinanceItem,
  FinanceKind,
  FinanceSpend,
  FinanceStage,
} from './finance'

type ItemRow = {
  id: string
  stage: FinanceStage
  kind: FinanceKind
  title: string
  amount: number | string
  start_month: string
  end_month: string | null
  created_at: string
}

/** Supabase отдаёт не больше 1000 строк за запрос. */
const PAGE_SIZE = 1000
/** 42P01 у базы и PGRST205 у её API: такой таблицы нет. База старше кода. */
const NO_TABLE = ['42P01', 'PGRST205']

async function unwrap<T>(request: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await request
  if (error) throw error
  return data
}

const toItem = (row: ItemRow): FinanceItem => ({
  id: row.id,
  stage: row.stage,
  kind: row.kind,
  title: row.title,
  // Суммы в базе точные десятичные и приходят то числом, то строкой.
  amount: Number(row.amount),
  startMonth: row.start_month,
  endMonth: row.end_month,
  createdAt: row.created_at,
})

/** Все отметки. По строке на платёж в месяц: читаем страницами, за годы их больше тысячи. */
async function loadChecks(): Promise<FinanceCheck[]> {
  const checks: FinanceCheck[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const page =
      (await unwrap(
        supabase
          .from('finance_checks')
          .select('item_id, month')
          .order('month')
          .order('item_id')
          .range(from, from + PAGE_SIZE - 1),
      )) ?? []
    for (const row of page) checks.push({ itemId: row.item_id as string, month: row.month as string })
    if (page.length < PAGE_SIZE) return checks
  }
}

/**
 * Все траты. Их несколько в день, за год набирается больше тысячи: читаем страницами.
 * null: таблицы трат ещё нет в базе, остальные финансы работают без неё.
 */
async function loadSpends(): Promise<FinanceSpend[] | null> {
  const spends: FinanceSpend[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('finance_spends')
      .select('id, date, amount, created_at')
      .order('date')
      .order('id')
      .range(from, from + PAGE_SIZE - 1)
    if (error) {
      if (NO_TABLE.includes(error.code)) return null
      throw error
    }
    const page = data ?? []
    for (const row of page) {
      spends.push({
        id: row.id as string,
        date: row.date as string,
        amount: Number(row.amount),
        createdAt: row.created_at as string,
      })
    }
    if (page.length < PAGE_SIZE) return spends
  }
}

// user_id в строки не передаётся: база сама подставляет текущего пользователя,
// а правила доступа не дают прочитать или изменить чужое.
export const supabaseFinance: FinanceApi = {
  async load() {
    const items = await supabase
      .from('finance_items')
      .select('id, stage, kind, title, amount, start_month, end_month, created_at')
    // Таблиц финансов может ещё не быть: тогда раздел говорит об этом, остальное работает.
    if (items.error) {
      if (NO_TABLE.includes(items.error.code)) return null
      throw items.error
    }
    const [checks, spends, days] = await Promise.all([
      loadChecks(),
      loadSpends(),
      unwrap(supabase.from('finance_days').select('stage, month, day')),
    ])
    return {
      items: (items.data ?? []).map((row) => toItem(row as ItemRow)),
      checks,
      spends,
      days: (days ?? []).map((row) => ({
        stage: row.stage as FinanceStage,
        month: row.month as string,
        day: row.day as number,
      })),
    }
  },

  async insertItem(item) {
    await unwrap(
      supabase.from('finance_items').insert({
        id: item.id,
        stage: item.stage,
        kind: item.kind,
        title: item.title,
        amount: item.amount,
        start_month: item.startMonth,
        end_month: item.endMonth,
        created_at: item.createdAt,
      }),
    )
  },

  async updateItem(id, patch) {
    await unwrap(
      supabase
        .from('finance_items')
        .update({
          ...(patch.title !== undefined && { title: patch.title }),
          ...(patch.amount !== undefined && { amount: patch.amount }),
          ...(patch.endMonth !== undefined && { end_month: patch.endMonth }),
        })
        .eq('id', id),
    )
  },

  async deleteItem(id) {
    // Отметки строки база удаляет сама.
    await unwrap(supabase.from('finance_items').delete().eq('id', id))
  },

  async setCheck(itemId, month, done) {
    await unwrap(
      done
        ? supabase.from('finance_checks').upsert({ item_id: itemId, month })
        : supabase.from('finance_checks').delete().eq('item_id', itemId).eq('month', month),
    )
  },

  async saveDay(day) {
    await unwrap(supabase.from('finance_days').upsert(day, { onConflict: 'user_id,stage,month' }))
  },

  async insertSpend(spend) {
    await unwrap(
      supabase.from('finance_spends').insert({
        id: spend.id,
        date: spend.date,
        amount: spend.amount,
        created_at: spend.createdAt,
      }),
    )
  },

  async deleteSpend(id) {
    await unwrap(supabase.from('finance_spends').delete().eq('id', id))
  },
}
