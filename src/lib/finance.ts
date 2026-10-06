import { addMonths, differenceInCalendarDays, format, getDaysInMonth, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { FinanceDay, FinanceItem, FinanceKind, FinanceStage } from '../data/finance'
import { shiftDate } from './metrics'

// Расчёты раздела «Финансы». Месяц везде строка 'yyyy-MM', день 'yyyy-MM-dd'.

export const STAGES: Array<{ value: FinanceStage; label: string }> = [
  { value: 'advance', label: 'Аванс' },
  { value: 'salary', label: 'Зарплата' },
]

/** Списки внутри этапа в том порядке, в каком они стоят на экране. */
export const KINDS: Array<{ value: FinanceKind; label: string; one: string }> = [
  { value: 'income', label: 'Поступления', one: 'Поступление' },
  { value: 'bill', label: 'Платежи', one: 'Платёж' },
  { value: 'saving', label: 'Накопления', one: 'Накопление' },
]

export const stageLabel = (stage: FinanceStage) =>
  STAGES.find((item) => item.value === stage)?.label ?? ''

/** Числа месяца, пока свои не названы: зарплата пятого, аванс двадцатого. */
export const DEFAULT_DAYS: Record<FinanceStage, number> = { advance: 20, salary: 5 }

/** Месяц дня: '2026-10-05' → '2026-10'. */
export const monthOf = (date: string) => date.slice(0, 7)

/** Месяц через `step` месяцев: ('2026-12', 1) → '2027-01'. */
export function shiftMonth(month: string, step: number): string {
  return format(addMonths(parseISO(`${month}-01`), step), 'yyyy-MM')
}

/** «Октябрь 2026» */
export function formatMonth(month: string): string {
  const text = format(parseISO(`${month}-01`), 'LLLL yyyy', { locale: ru })
  return text[0].toUpperCase() + text.slice(1)
}

/**
 * Месяцы для списка выбора, от свежих к старым: от следующего за текущим до самого раннего
 * месяца с данными, но не меньше года назад. Открытый месяц есть в списке всегда.
 */
export function monthOptions(selected: string, current: string, items: FinanceItem[]): string[] {
  let first = shiftMonth(current, -11)
  for (const item of items) if (item.startMonth < first) first = item.startMonth
  if (selected < first) first = selected
  let last = shiftMonth(current, 1)
  if (selected > last) last = selected
  const months: string[] = []
  for (let month = last; month >= first; month = shiftMonth(month, -1)) months.push(month)
  return months
}

const NBSP = ' '

/**
 * «253 000 ₽», «1 234,50 ₽». Копейки показываются, только когда они есть.
 * С `sign: false` без знака рубля: «253 000».
 */
export function formatMoney(amount: number, sign = true): string {
  const cents = Math.round(Math.abs(amount) * 100)
  const whole = String(Math.floor(cents / 100)).replace(/\B(?=(\d{3})+$)/g, NBSP)
  const rest = cents % 100
  const minus = amount < 0 && cents > 0 ? '−' : ''
  return `${minus}${whole}${rest ? `,${String(rest).padStart(2, '0')}` : ''}${sign ? `${NBSP}₽` : ''}`
}

/** Самая большая сумма, которую принимает поле: то же ограничение стоит в базе. */
export const MAX_AMOUNT = 999_999_999

/** Сумма из того, что напечатали: «1 500», «1500,50», «1500.5». null, если это не сумма. */
export function parseAmount(text: string): number | null {
  const clean = text.replace(/[\s ₽]/g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null
  const amount = Number(clean)
  return amount > 0 && amount <= MAX_AMOUNT ? amount : null
}

/** Сумма для поля ввода: без пробелов и знака рубля. */
export const amountToInput = (amount: number) => String(amount).replace('.', ',')

/** Копейки складываются в целых числах: иначе 0,1 + 0,2 дало бы 0,30000000000000004. */
const add = (a: number, b: number) => Math.round((a + b) * 100) / 100

// --- Даты этапов ---

/** Число месяца этапа: последнее записанное не позже этого месяца, иначе число по умолчанию. */
export function dayFor(days: FinanceDay[], stage: FinanceStage, month: string): number {
  let latest: FinanceDay | undefined
  for (const day of days) {
    if (day.stage !== stage || day.month > month) continue
    if (!latest || day.month > latest.month) latest = day
  }
  return latest?.day ?? DEFAULT_DAYS[stage]
}

/** День, в который приходят деньги этапа. В коротком месяце 31-е число становится последним днём. */
export function stageDate(days: FinanceDay[], stage: FinanceStage, month: string): string {
  const day = Math.min(dayFor(days, stage, month), getDaysInMonth(parseISO(`${month}-01`)))
  return `${month}-${String(day).padStart(2, '0')}`
}

export type StagePeriod = {
  stage: FinanceStage
  month: string
  /** День поступления: с него этап начинается. */
  start: string
  /** Последний день этапа: накануне следующего поступления. */
  end: string
  /** Сколько дней длится этап. */
  length: number
  /** Какое поступление будет следующим. */
  next: FinanceStage
}

/** Этапы месяца по порядку дат. Этап длится от своего поступления до кануна следующего. */
export function stagePeriods(days: FinanceDay[], month: string): StagePeriod[] {
  const dated = (target: string) =>
    STAGES.map(({ value }) => ({ stage: value, start: stageDate(days, value, target) })).sort((a, b) =>
      a.start.localeCompare(b.start),
    )
  const here = dated(month)
  const later = dated(shiftMonth(month, 1))[0]
  return here.map((current, index) => {
    // Следующее поступление: второй этап этого месяца, а после него первый этап следующего.
    const following = here[index + 1]?.start > current.start ? here[index + 1] : later
    const end = shiftDate(following.start, -1)
    return {
      stage: current.stage,
      month,
      start: current.start,
      end,
      length: differenceInCalendarDays(parseISO(end), parseISO(current.start)) + 1,
      next: following.stage,
    }
  })
}

/** Этап, который идёт сегодня. В первых числах месяца это ещё этап прошлого месяца. */
export function currentPeriod(days: FinanceDay[], today: string): StagePeriod | null {
  for (const month of [monthOf(today), shiftMonth(monthOf(today), -1)]) {
    const found = stagePeriods(days, month).find((period) => period.start <= today && today <= period.end)
    if (found) return found
  }
  return null
}

/** Сколько дней до следующего поступления, считая сегодняшний. */
export function daysLeft(period: StagePeriod, today: string): number {
  return differenceInCalendarDays(parseISO(period.end), parseISO(today)) + 1
}

/** «20 октября – 4 ноября» */
export function formatPeriod(period: StagePeriod): string {
  const text = (date: string) => format(parseISO(date), 'd MMMM', { locale: ru })
  return `${text(period.start)} – ${text(period.end)}`
}

// --- Суммы этапа ---

/** Строки, которые действуют в этом месяце, по порядку создания. */
export function itemsFor(items: FinanceItem[], month: string): FinanceItem[] {
  return items
    .filter((item) => item.startMonth <= month && (item.endMonth === null || item.endMonth >= month))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

/** Разовая строка: живёт один месяц и дальше не повторяется. */
export const isOnce = (item: FinanceItem) => item.endMonth === item.startMonth

/** Ключ отметки в наборе: строка и месяц. */
export const checkKey = (itemId: string, month: string) => `${itemId}:${month}`

export type StageSummary = {
  /** Бюджет этапа: все поступления. */
  income: number
  bills: number
  savings: number
  /** Свободно: поступления минус все платежи и накопления, отмеченные и нет. */
  free: number
  /** Осталось оплатить и отложить: сумма ещё не отмеченных платежей и накоплений. */
  toPay: number
}

/** Итоги по строкам: годится и для одного этапа, и для всего месяца. */
export function summarize(items: FinanceItem[], checks: ReadonlySet<string>, month: string): StageSummary {
  const summary: StageSummary = { income: 0, bills: 0, savings: 0, free: 0, toPay: 0 }
  for (const item of items) {
    if (item.kind === 'income') {
      summary.income = add(summary.income, item.amount)
      continue
    }
    if (item.kind === 'bill') summary.bills = add(summary.bills, item.amount)
    else summary.savings = add(summary.savings, item.amount)
    if (!checks.has(checkKey(item.id, month))) summary.toPay = add(summary.toPay, item.amount)
  }
  summary.free = add(summary.income, -add(summary.bills, summary.savings))
  return summary
}

/** Сколько свободных денег приходится на день этапа, в целых рублях. null: свободного нет. */
export function perDay(free: number, length: number): number | null {
  return free > 0 && length > 0 ? Math.floor(free / length) : null
}
