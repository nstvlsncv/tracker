import { describe, expect, it } from 'vitest'
import type { FinanceDay, FinanceItem, FinanceSpend } from '../data/finance'
import {
  checkKey,
  currentPeriod,
  dayBudget,
  dayFor,
  daysLeft,
  formatMoney,
  formatMonth,
  formatPeriod,
  isOnce,
  itemsFor,
  monthOptions,
  padPress,
  parseAmount,
  perDay,
  shiftMonth,
  spentIn,
  stageDate,
  stagePeriods,
  summarize,
} from './finance'

const item = (id: string, kind: FinanceItem['kind'], amount: number, extra: Partial<FinanceItem> = {}): FinanceItem => ({
  id,
  stage: 'salary',
  kind,
  title: id,
  amount,
  startMonth: '2026-01',
  endMonth: null,
  createdAt: `2026-01-01T00:00:0${id.length % 10}Z`,
  ...extra,
})

describe('месяцы', () => {
  it('сдвиг переходит через год', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
  })

  it('название месяца с заглавной буквы', () => {
    expect(formatMonth('2026-10')).toBe('Октябрь 2026')
  })

  it('список: от следующего месяца до года назад или до первого месяца с данными', () => {
    const months = monthOptions('2026-10', '2026-10', [])
    expect(months[0]).toBe('2026-11')
    expect(months.at(-1)).toBe('2025-11')
    expect(monthOptions('2026-10', '2026-10', [item('a', 'bill', 1, { startMonth: '2024-03' })]).at(-1)).toBe(
      '2024-03',
    )
  })
})

describe('суммы', () => {
  it('разряды разделены, копейки только когда они есть', () => {
    expect(formatMoney(253000)).toBe('253 000 ₽')
    expect(formatMoney(1234.5)).toBe('1 234,50 ₽')
    expect(formatMoney(253000, false)).toBe('253 000')
    expect(formatMoney(-1500)).toBe('−1 500 ₽')
  })

  it('читает сумму с пробелами, запятой и точкой', () => {
    expect(parseAmount('1 500')).toBe(1500)
    expect(parseAmount('1500,50')).toBe(1500.5)
    expect(parseAmount('1500.5 ₽')).toBe(1500.5)
  })

  it('не принимает текст, отрицательное, лишние копейки и ноль', () => {
    for (const text of ['кофе', '-5', '1,555', '', '0']) expect(parseAmount(text)).toBeNull()
  })
})

describe('даты этапов', () => {
  const days: FinanceDay[] = [
    { stage: 'salary', month: '2026-08', day: 5 },
    { stage: 'advance', month: '2026-08', day: 20 },
    { stage: 'salary', month: '2026-10', day: 3 },
  ]

  it('число действует с месяца, в котором записано, пока его не сменит следующее', () => {
    expect(dayFor(days, 'salary', '2026-09')).toBe(5)
    expect(dayFor(days, 'salary', '2026-10')).toBe(3)
    expect(dayFor(days, 'salary', '2026-12')).toBe(3)
  })

  it('пока числа не названы, зарплата пятого, аванс двадцатого', () => {
    expect(dayFor([], 'salary', '2026-10')).toBe(5)
    expect(dayFor([], 'advance', '2026-10')).toBe(20)
  })

  it('в коротком месяце 31-е становится последним днём', () => {
    expect(stageDate([{ stage: 'advance', month: '2026-01', day: 31 }], 'advance', '2026-02')).toBe('2026-02-28')
  })

  it('этап длится от своего поступления до кануна следующего', () => {
    const [first, second] = stagePeriods(days, '2026-09')
    expect(first).toMatchObject({ stage: 'salary', start: '2026-09-05', end: '2026-09-19', length: 15, next: 'advance' })
    // Аванс сентября идёт до октябрьской зарплаты, а она в октябре третьего.
    expect(second).toMatchObject({ stage: 'advance', start: '2026-09-20', end: '2026-10-02', length: 13, next: 'salary' })
    expect(formatPeriod(second)).toBe('20 сентября – 2 октября')
  })

  it('аванс раньше зарплаты: порядок этапов меняется', () => {
    const early: FinanceDay[] = [
      { stage: 'advance', month: '2026-01', day: 10 },
      { stage: 'salary', month: '2026-01', day: 25 },
    ]
    expect(stagePeriods(early, '2026-09').map((period) => [period.stage, period.start, period.end])).toEqual([
      ['advance', '2026-09-10', '2026-09-24'],
      ['salary', '2026-09-25', '2026-10-09'],
    ])
  })

  it('в первых числах месяца идёт ещё этап прошлого', () => {
    expect(currentPeriod(days, '2026-10-01')).toMatchObject({ stage: 'advance', month: '2026-09' })
    expect(currentPeriod(days, '2026-10-03')).toMatchObject({ stage: 'salary', month: '2026-10' })
  })

  it('дни до следующего поступления считаются вместе с сегодняшним', () => {
    const period = currentPeriod(days, '2026-10-01')!
    expect(daysLeft(period, '2026-10-01')).toBe(2)
    expect(daysLeft(period, '2026-10-02')).toBe(1)
  })
})

describe('строки и итоги', () => {
  const items = [
    item('pay', 'income', 60000),
    item('rent', 'bill', 45000),
    item('phone', 'bill', 890.5),
    item('pillow', 'saving', 10000),
    item('old', 'bill', 500, { endMonth: '2026-09' }),
    item('future', 'bill', 500, { startMonth: '2026-11' }),
  ]

  it('в месяце действуют строки, которые в нём уже начались и ещё не закончились', () => {
    expect(itemsFor(items, '2026-10').map((row) => row.id)).not.toContain('old')
    expect(itemsFor(items, '2026-10').map((row) => row.id)).not.toContain('future')
    expect(itemsFor(items, '2026-09').map((row) => row.id)).toContain('old')
  })

  it('разовая строка действует один месяц и дальше не повторяется', () => {
    const gift = item('gift', 'bill', 3000, { startMonth: '2026-10', endMonth: '2026-10' })
    expect(isOnce(gift)).toBe(true)
    expect(isOnce(item('rent2', 'bill', 1))).toBe(false)
    expect(itemsFor([gift], '2026-10')).toHaveLength(1)
    expect(itemsFor([gift], '2026-11')).toHaveLength(0)
    expect(itemsFor([gift], '2026-09')).toHaveLength(0)
  })

  it('свободно: поступления минус все платежи и накопления; оплатить: неотмеченные', () => {
    const checks = new Set([checkKey('rent', '2026-10'), checkKey('pillow', '2026-09')])
    const summary = summarize(itemsFor(items, '2026-10'), checks, '2026-10')
    expect(summary).toEqual({ income: 60000, bills: 45890.5, savings: 10000, free: 4109.5, toPay: 10890.5 })
  })

  it('деньги на день: свободное на длину этапа, целыми рублями', () => {
    expect(perDay(4109.5, 15)).toBe(273)
    expect(perDay(0, 15)).toBeNull()
    expect(perDay(-100, 15)).toBeNull()
  })
})

describe('траты по дням', () => {
  // Зарплата 5-го, аванс 20-го: этап зарплаты идёт с 5 по 19 октября, 15 дней.
  const period = stagePeriods([], '2026-10').find((stage) => stage.stage === 'salary')!
  const spend = (date: string, amount: number): FinanceSpend => ({
    id: `${date}-${amount}`,
    date,
    amount,
    createdAt: `${date}T10:00:00Z`,
  })

  it('в этап идут только траты его дней', () => {
    const spends = [spend('2026-10-04', 100), spend('2026-10-05', 200), spend('2026-10-19', 300), spend('2026-10-20', 400)]
    expect(spentIn(spends, period)).toBe(500)
  })

  it('без трат свободное делится на оставшиеся дни', () => {
    expect(dayBudget(15000, [], period, '2026-10-05')).toEqual({
      pool: 15000,
      days: 15,
      budget: 1000,
      spentToday: 0,
      left: 1000,
      tomorrow: 1071,
    })
  })

  it('сегодняшняя трата уменьшает остаток дня', () => {
    const day = dayBudget(15000, [spend('2026-10-05', 400)], period, '2026-10-05')
    expect(day.left).toBe(600)
    expect(day.spentToday).toBe(400)
  })

  it('сэкономленное вчера прибавляется к следующим дням, перерасход вычитается', () => {
    // Вчера не потрачено ничего: 15 000 на 14 дней.
    expect(dayBudget(15000, [], period, '2026-10-06').budget).toBe(1071)
    // Вчера потрачено 2 400: остаётся 12 600 на 14 дней.
    expect(dayBudget(15000, [spend('2026-10-05', 2400)], period, '2026-10-06').budget).toBe(900)
  })

  it('перерасход сегодня: остаток отрицательный, завтра меньше', () => {
    const day = dayBudget(15000, [spend('2026-10-05', 1700)], period, '2026-10-05')
    expect(day.left).toBe(-700)
    expect(day.tomorrow).toBe(950)
  })

  it('в последний день этапа завтра нет, а минус не показывается бюджетом', () => {
    expect(dayBudget(1000, [], period, '2026-10-19').tomorrow).toBeNull()
    expect(dayBudget(1000, [spend('2026-10-05', 5000)], period, '2026-10-10').budget).toBe(0)
  })

  it('клавиатура: цифры, одна запятая, две цифры после неё, стирание', () => {
    const type = (keys: string) =>
      [...keys].reduce((text, key) => padPress(text, key === '<' ? 'back' : (key as '1')), '')
    expect(type('1500')).toBe('1500')
    expect(type('05')).toBe('5')
    expect(type(',5')).toBe('0,5')
    expect(type('12,,345')).toBe('12,34')
    expect(type('12,3<<')).toBe('12')
    expect(type('1234567890')).toBe('123456789')
  })
})
