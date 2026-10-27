import { formatMonth, historyMonths, historyYears, monthOf, yearMonths } from '../../lib/habitHistory'
import { useSessionState } from '../../lib/sessionState'
import { PHONE_QUERY, useMediaQuery } from '../../lib/useMediaQuery'

/**
 * Период истории (привычки, настроения, фото дня). На компьютере и планшете это год
 * двенадцатью календарями, в списке годы. На телефоне один месяц во всю ширину, в списке
 * месяцы: год там выходил мелким. Выбор запоминается на время сеанса под ключом `key`.
 */
export function useHistoryPeriod(key: string, since: string, today: string) {
  const phone = useMediaQuery(PHONE_QUERY)
  const [year, setYear] = useSessionState(`${key}.year`, Number(today.slice(0, 4)))
  const [month, setMonth] = useSessionState(`${key}.month`, monthOf(today))

  if (phone) {
    return {
      phone,
      /** Месяцы, которые рисует календарь. */
      months: [month],
      value: month,
      onChange: setMonth,
      options: historyMonths(since, today).map((value) => ({ value, label: formatMonth(value) })),
    }
  }
  return {
    phone,
    months: yearMonths(year),
    value: String(year),
    onChange: (value: string) => setYear(Number(value)),
    options: historyYears(since, today).map((value) => ({ value: String(value), label: `${value} год` })),
  }
}
