import { useEffect, useState } from 'react'

const TICK_MS = 15_000

/** Текущее время. Обновляется несколько раз в минуту, чтобы часы на экране не отставали. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), TICK_MS)
    return () => clearInterval(timer)
  }, [])

  return now
}
