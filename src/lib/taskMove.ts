import { shiftDate } from './metrics'

/**
 * Куда переносится невыполненная задача: с прошедшего дня на сегодня, с сегодняшнего
 * или будущего на следующий день. Подпись нужна кнопке и скринридеру.
 */
export function moveTarget(taskDate: string, today: string): { date: string; label: string } {
  if (taskDate < today) return { date: today, label: 'Перенести на сегодня' }
  return {
    date: shiftDate(taskDate, 1),
    label: taskDate === today ? 'Перенести на завтра' : 'Перенести на следующий день',
  }
}
