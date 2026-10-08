/** Этап месяца: деньги приходят дважды, авансом и зарплатой. */
export type FinanceStage = 'advance' | 'salary'

/** income: поступление (бюджет этапа). bill: обязательный платёж. saving: накопление. */
export type FinanceKind = 'income' | 'bill' | 'saving'

/**
 * Строка этапа: поступление, платёж или накопление. Повторяется из месяца в месяц: живёт
 * с месяца `startMonth` по `endMonth`. Правка и удаление в каком-то месяце не трогают
 * прошлые: старая строка заканчивается предыдущим месяцем, а с этого идёт новая.
 */
export type FinanceItem = {
  id: string
  stage: FinanceStage
  kind: FinanceKind
  title: string
  amount: number
  /** Первый месяц, 'yyyy-MM'. */
  startMonth: string
  /** Последний месяц. null: без конца. */
  endMonth: string | null
  createdAt: string
}

/** Отметка «оплачено» или «отложено» за месяц. */
export type FinanceCheck = { itemId: string; month: string }

/**
 * Число месяца, в которое приходит аванс или зарплата. Действует с месяца `month` и дальше,
 * пока в более позднем месяце не записано другое.
 */
export type FinanceDay = { stage: FinanceStage; month: string; day: number }

/**
 * Трата: сумма без названия и категории, записанная на день. Уменьшает свободные деньги этапа,
 * в который попадает её день, и от неё пересчитывается, сколько можно потратить сегодня.
 */
export type FinanceSpend = { id: string; date: string; amount: number; createdAt: string }

export type FinanceItemPatch = { title?: string; amount?: number; endMonth?: string | null }

export type FinanceData = {
  items: FinanceItem[]
  checks: FinanceCheck[]
  days: FinanceDay[]
  /** null: трат в этой базе нет (не применена свежая схема), остальные финансы работают. */
  spends: FinanceSpend[] | null
}

/**
 * Откуда берутся и куда сохраняются финансы. Устроено как `PlannerApi`: настоящая реализация
 * ходит в Supabase, демо работает в памяти. Методы бросают ошибку при сбое.
 */
export type FinanceApi = {
  /** null: финансов в этой базе нет (не применена свежая схема). */
  load: () => Promise<FinanceData | null>
  insertItem: (item: FinanceItem) => Promise<void>
  updateItem: (id: string, patch: FinanceItemPatch) => Promise<void>
  /** Удаляет строку вместе с её отметками. */
  deleteItem: (id: string) => Promise<void>
  /** Поставить или снять отметку за месяц. */
  setCheck: (itemId: string, month: string, done: boolean) => Promise<void>
  saveDay: (day: FinanceDay) => Promise<void>
  insertSpend: (spend: FinanceSpend) => Promise<void>
  deleteSpend: (id: string) => Promise<void>
}
