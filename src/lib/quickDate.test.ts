import { describe, expect, it } from 'vitest'
import { parseQuickDate } from './quickDate'

// Понедельник 5 октября 2026.
const TODAY = '2026-10-05'

describe('parseQuickDate', () => {
  it('понимает «завтра», «послезавтра» и «сегодня» в конце', () => {
    expect(parseQuickDate('Позвонить в банк завтра', TODAY)).toEqual({
      title: 'Позвонить в банк',
      date: '2026-10-06',
    })
    expect(parseQuickDate('Сдать отчёт послезавтра', TODAY)?.date).toBe('2026-10-07')
    expect(parseQuickDate('Купить хлеб сегодня', TODAY)?.date).toBe(TODAY)
  })

  it('понимает день недели: коротко и полностью', () => {
    expect(parseQuickDate('Отчёт в пт', TODAY)).toEqual({ title: 'Отчёт', date: '2026-10-09' })
    expect(parseQuickDate('Стоматолог во вторник', TODAY)?.date).toBe('2026-10-06')
    expect(parseQuickDate('Уборка в субботу.', TODAY)?.date).toBe('2026-10-10')
  })

  it('день недели, совпавший с сегодняшним, это следующая неделя', () => {
    expect(parseQuickDate('Планёрка в понедельник', TODAY)?.date).toBe('2026-10-12')
  })

  it('понимает «через N дней»', () => {
    expect(parseQuickDate('Забрать заказ через 3 дня', TODAY)).toEqual({
      title: 'Забрать заказ',
      date: '2026-10-08',
    })
  })

  it('не трогает название без дня в конце', () => {
    expect(parseQuickDate('Завтрак с Машей', TODAY)).toBeNull()
    expect(parseQuickDate('Завтра позвонить', TODAY)).toBeNull()
    expect(parseQuickDate('Пятница', TODAY)).toBeNull()
    // Без предлога это не день, а часть названия.
    expect(parseQuickDate('Купить журнал Пятница', TODAY)).toBeNull()
  })

  it('слово-день само по себе остаётся названием', () => {
    expect(parseQuickDate('Завтра', TODAY)).toBeNull()
    expect(parseQuickDate('в пт', TODAY)).toBeNull()
  })
})
