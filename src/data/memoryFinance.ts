import { toISODate } from '../lib/dates'
import { currentPeriod, monthOf, shiftMonth } from '../lib/finance'
import { newId } from '../lib/id'
import type {
  FinanceApi,
  FinanceCheck,
  FinanceDay,
  FinanceItem,
  FinanceKind,
  FinanceSpend,
  FinanceStage,
} from './finance'
import { shiftDate } from '../lib/metrics'

/**
 * Финансы в памяти с демо-данными: для демо гостей (/demo) и экранов разработки (/dev/app).
 * Демо видят посторонние: суммы и названия выдуманные, ничего личного.
 */
export function createMemoryFinance(): FinanceApi {
  const today = toISODate(new Date())
  const month = monthOf(today)
  const startMonth = shiftMonth(month, -3)
  let stamp = 0

  const SETUP: Array<[FinanceStage, FinanceKind, string, number]> = [
    ['salary', 'income', 'Зарплата', 70000],
    ['salary', 'bill', 'Аренда квартиры', 40000],
    ['salary', 'bill', 'Интернет', 700],
    ['salary', 'bill', 'Мобильная связь', 650],
    ['salary', 'saving', 'Финансовая подушка', 7000],
    ['advance', 'income', 'Аванс', 50000],
    ['advance', 'income', 'Подработка', 12000],
    ['advance', 'bill', 'Коммунальные платежи', 5600],
    ['advance', 'bill', 'Спортзал', 3200],
    ['advance', 'bill', 'Подписки', 1490],
    ['advance', 'saving', 'Отпуск', 10000],
  ]
  let items: FinanceItem[] = SETUP.map(([stage, kind, title, amount]) => ({
    id: newId(),
    stage,
    kind,
    title,
    amount,
    startMonth,
    endMonth: null,
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, stamp++)).toISOString(),
  }))
  let days: FinanceDay[] = []

  // Прошлые этапы оплачены целиком, в текущем отмечена часть, будущие пустые.
  const now = currentPeriod(days, today)
  const paid = (item: FinanceItem, target: string) => {
    if (!now || item.kind === 'income') return false
    if (target < now.month) return true
    if (target > now.month) return false
    if (item.stage === now.stage) return item.title.length % 2 === 0
    // Другой этап того же месяца: оплачен, если он шёл раньше текущего.
    return now.stage === 'advance'
  }
  let checks: FinanceCheck[] = [startMonth, shiftMonth(month, -2), shiftMonth(month, -1), month].flatMap(
    (target) =>
      items.filter((item) => paid(item, target)).map((item) => ({ itemId: item.id, month: target })),
  )

  // Траты текущего этапа: понемногу в каждый прошедший день и одна сегодня.
  const SPENT = [640, 1150, 380, 920, 1480, 270, 760]
  let spends: FinanceSpend[] = []
  if (now) {
    for (let date = now.start, index = 0; date <= today; date = shiftDate(date, 1), index++) {
      spends.push({
        id: newId(),
        date,
        amount: date === today ? 350 : SPENT[index % SPENT.length],
        createdAt: `${date}T00:00:00.000Z`,
      })
    }
  }

  // Небольшая задержка, чтобы было видно состояние загрузки.
  const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 300))

  return {
    async load() {
      await wait()
      return { items, checks, days, spends }
    },
    async insertItem(item) {
      items = [...items, item]
    },
    async updateItem(id, patch) {
      items = items.map((item) => (item.id === id ? { ...item, ...patch } : item))
    },
    async deleteItem(id) {
      items = items.filter((item) => item.id !== id)
      checks = checks.filter((check) => check.itemId !== id)
    },
    async setCheck(itemId, target, done) {
      checks = checks.filter((check) => check.itemId !== itemId || check.month !== target)
      if (done) checks = [...checks, { itemId, month: target }]
    },
    async saveDay(day) {
      days = [...days.filter((item) => item.stage !== day.stage || item.month !== day.month), day]
    },
    async insertSpend(spend) {
      spends = [...spends, spend]
    },
    async deleteSpend(id) {
      spends = spends.filter((spend) => spend.id !== id)
    },
  }
}
