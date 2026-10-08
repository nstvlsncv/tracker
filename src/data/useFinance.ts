import { createContext, useContext } from 'react'
import type { FinanceDay, FinanceItem, FinanceKind, FinanceSpend, FinanceStage } from './finance'

/** unavailable: финансов в этой базе нет (не применена свежая схема). */
export type FinanceStatus = 'loading' | 'ready' | 'error' | 'unavailable'

export type NewFinanceItem = {
  stage: FinanceStage
  kind: FinanceKind
  title: string
  amount: number
  /** Разовая строка: только в месяце, в котором её добавили, дальше не повторяется. */
  once?: boolean
}

export type FinanceValue = {
  status: FinanceStatus
  /** Все строки за всё время. Экран сам выбирает действующие в месяце (`itemsFor`). */
  items: FinanceItem[]
  /** Отметки «оплачено»: ключи `checkKey(itemId, month)`. */
  checks: ReadonlySet<string>
  /** Числа месяца, в которые приходят аванс и зарплата. */
  days: FinanceDay[]
  /** Траты по дням. null: их в этой базе нет (не применена свежая схема). */
  spends: FinanceSpend[] | null
  /** Повторить загрузку после ошибки. */
  reload: () => void

  /** Добавить строку с месяца `month` и дальше (разовую: только в этом месяце). */
  addItem: (item: NewFinanceItem, month: string) => void
  /** Изменить название и сумму с месяца `month` и дальше. Прошлые месяцы остаются как были. */
  editItem: (id: string, month: string, title: string, amount: number) => void
  /** Убрать строку с месяца `month` и дальше. Показывает тост с «Отменить». */
  deleteItem: (id: string, month: string) => void
  /** Поставить или снять отметку за месяц. */
  toggleCheck: (id: string, month: string, done: boolean) => void
  /** Число месяца этапа с месяца `month` и дальше. */
  setDay: (stage: FinanceStage, month: string, day: number) => void
  /** Записать трату на день. Показывает тост с «Отменить». */
  addSpend: (amount: number, date: string) => void
  /** Убрать трату. Показывает тост с «Отменить». */
  deleteSpend: (id: string) => void
}

export const FinanceContext = createContext<FinanceValue | null>(null)

export function useFinance(): FinanceValue {
  const value = useContext(FinanceContext)
  if (!value) throw new Error('useFinance: нет FinanceProvider выше по дереву')
  return value
}
