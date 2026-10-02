import { useEffect, useState } from 'react'
import { toISODate } from './dates'

const CHECK_INTERVAL_MS = 60_000

/** Сегодняшняя дата 'yyyy-MM-dd' в часовом поясе пользователя. Сама обновляется после полуночи. */
export function useToday(): string {
  const [today, setToday] = useState(() => toISODate(new Date()))

  useEffect(() => {
    const timer = setInterval(() => setToday(toISODate(new Date())), CHECK_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [])

  return today
}
