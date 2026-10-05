import { createContext, useContext } from 'react'
import type { FinanceDay, FinanceItem, FinanceKind, FinanceStage } from './finance'

/** unavailable: финансов в этой базе нет (не применена свежая схема). */
export type FinanceStatus = 'loading' | 'ready' | 'error' | 'unavailable'

export type NewFinanceItem = { stage: FinanceStage; kind: FinanceKind; title: string; amount: number }

export type FinanceValue = {
  status: FinanceStatus
  /** Все строки за всё время. Экран сам выбирает действующие в месяце (`itemsFor`). */
  items: FinanceItem[]
  /** Отметки «оплачено»: ключи `checkKey(itemId, month)`. */
  checks: ReadonlySet<string>
  /** Числа месяца, в которые приходят аванс и зарплата. */
  days: FinanceDay[]
  /** Повторить загрузку после ошибки. */
  reload: () => void

  /** Добавить строку с месяца `month` и дальше. */
  addItem: (item: NewFinanceItem, month: string) => void
  /** Изменить название и сумму с месяца `month` и дальше. Прошлые месяцы остаются как были. */
  editItem: (id: string, month: string, title: string, amount: number) => void
  /** Убрать строку с месяца `month` и дальше. Показывает тост с «Отменить». */
  deleteItem: (id: string, month: string) => void
  /** Поставить или снять отметку за месяц. */
  toggleCheck: (id: string, month: string, done: boolean) => void
  /** Число месяца этапа с месяца `month` и дальше. */
  setDay: (stage: FinanceStage, month: string, day: number) => void
}

export const FinanceContext = createContext<FinanceValue | null>(null)

export function useFinance(): FinanceValue {
  const value = useContext(FinanceContext)
  if (!value) throw new Error('useFinance: нет FinanceProvider выше по дереву')
  return value
}
