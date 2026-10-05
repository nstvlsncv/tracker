import { getISODay, parseISO } from 'date-fns'
import { shiftDate } from './metrics'

// День, названный словами в конце названия задачи: «Позвонить в банк завтра», «Отчёт в пт».
// Слово должно стоять последним и не быть всем названием: «Завтра» само по себе остаётся задачей.

const WEEKDAYS: Array<[RegExp, number]> = [
  [/^(пн|понедельник)$/, 1],
  [/^(вт|вторник)$/, 2],
  [/^(ср|среду|среда)$/, 3],
  [/^(чт|четверг)$/, 4],
  [/^(пт|пятницу|пятница)$/, 5],
  [/^(сб|субботу|суббота)$/, 6],
  [/^(вс|воскресенье)$/, 7],
]

const RELATIVE: Record<string, number> = { сегодня: 0, завтра: 1, послезавтра: 2 }

export type QuickDate = { title: string; date: string }

/**
 * Разобрать название задачи с днём в конце. Понимает «сегодня», «завтра», «послезавтра»,
 * день недели («в пт», «в пятницу», «во вторник») и «через N дней». День недели означает
 * ближайший такой день после сегодняшнего. Возвращает null, если дня в конце нет.
 */
export function parseQuickDate(text: string, today: string): QuickDate | null {
  const words = text.trim().split(/\s+/)
  const lower = words.map((word) => word.toLowerCase().replace(/[.,!]+$/, ''))
  const last = lower[lower.length - 1]
  // Сколько слов в конце занимает день и на сколько дней он отстоит от сегодня.
  let taken = 0
  let offset: number | null = null

  if (last in RELATIVE) {
    taken = 1
    offset = RELATIVE[last]
  } else {
    const weekday = WEEKDAYS.find(([pattern]) => pattern.test(last))?.[1]
    const before = lower[lower.length - 2]
    if (weekday && (before === 'в' || before === 'во')) {
      taken = 2
      // Ближайший такой день строго после сегодняшнего: «в пт», сказанное в пятницу, это следующая.
      offset = ((weekday - getISODay(parseISO(today)) + 6) % 7) + 1
    } else if (
      /^(день|дня|дней)$/.test(last) &&
      /^\d{1,2}$/.test(before ?? '') &&
      lower[lower.length - 3] === 'через'
    ) {
      taken = 3
      offset = Number(before)
    }
  }

  if (offset === null || taken >= words.length) return null
  return { title: words.slice(0, -taken).join(' '), date: shiftDate(today, offset) }
}
