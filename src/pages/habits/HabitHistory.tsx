import { parseISO } from 'date-fns'
import { useEffect, useMemo, useRef } from 'react'
import { cx } from '../../lib/cx'
import { formatDayMonth } from '../../lib/dates'
import { habitHistory } from '../../lib/habitHistory'
import styles from './HabitHistory.module.css'

type Props = {
  checks: ReadonlySet<string>
  today: string
  onToggle: (date: string, done: boolean) => void
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

/**
 * История привычки за последние 12 месяцев: столбцы это недели, строки дни с понедельника.
 * Точка залита, если день выполнен. Нажатие на прошедший день ставит или снимает отметку
 * задним числом. Открывается прокрученной к сегодняшнему дню.
 */
export function HabitHistory({ checks, today, onToggle }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const weeks = useMemo(() => habitHistory(today), [today])

  useEffect(() => {
    const scroll = scrollRef.current
    if (scroll) scroll.scrollLeft = scroll.scrollWidth
  }, [])

  return (
    <div className={styles.card}>
      <h3 className={`t-body-md ${styles.title}`}>История за год</h3>
      <div className={styles.body}>
        <div ref={scrollRef} className={styles.scroll}>
          <div className={styles.grid}>
            {weeks.map((week) => (
              <div key={week.start} className={styles.week}>
                <span className={`t-caption ${styles.month}`}>{week.month}</span>
                {week.days.map((date, index) => {
                  if (!date) return <span key={index} className={styles.blank} />
                  const done = checks.has(date)
                  const label = `${formatDayMonth(parseISO(date))} · ${done ? 'выполнено' : 'не выполнено'}`
                  return (
                    <button
                      key={date}
                      type="button"
                      className={cx(styles.dot, done && styles.done, date === today && styles.today)}
                      aria-label={label}
                      aria-pressed={done}
                      title={label}
                      onClick={() => onToggle(date, !done)}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
        <div className={styles.weekdays} aria-hidden>
          <span className={styles.month} />
          {WEEKDAYS.map((day) => (
            <span key={day} className={`t-caption ${styles.weekday}`}>
              {day}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
