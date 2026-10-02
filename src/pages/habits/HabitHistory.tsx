import { parseISO } from 'date-fns'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Dropdown } from '../../components/Dropdown'
import { cx } from '../../lib/cx'
import { formatDayMonth } from '../../lib/dates'
import { habitHistory, historyYears } from '../../lib/habitHistory'
import type { HistoryPeriod } from '../../lib/habitHistory'
import styles from './HabitHistory.module.css'

type Props = {
  checks: ReadonlySet<string>
  today: string
  /** Самый ранний день, с которого у привычки может быть история: создание или первая отметка. */
  since: string
  onToggle: (date: string, done: boolean) => void
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

/**
 * История привычки: столбцы это недели, строки дни с понедельника. Точка залита, если день
 * выполнен. Нажатие на прошедший день ставит или снимает отметку задним числом.
 * По умолчанию последние 12 месяцев; если привычке больше года, можно выбрать календарный год.
 * Сетка открывается прокрученной к концу периода, подписи дней стоят по обе стороны и не уезжают.
 */
export function HabitHistory({ checks, today, since, onToggle }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [period, setPeriod] = useState<HistoryPeriod>('recent')
  const weeks = useMemo(() => habitHistory(today, period), [today, period])
  const years = historyYears(since, today)

  useEffect(() => {
    const scroll = scrollRef.current
    if (scroll) scroll.scrollLeft = scroll.scrollWidth
  }, [period])

  const weekdays = (
    <div className={styles.weekdays} aria-hidden>
      <span className={styles.month} />
      {WEEKDAYS.map((day) => (
        <span key={day} className={`t-caption ${styles.weekday}`}>
          {day}
        </span>
      ))}
    </div>
  )

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={`t-body-md ${styles.title}`}>
          {period === 'recent' ? 'История за год' : `История за ${period}`}
        </h3>
        {/* Выбор года нужен, только когда история не умещается в последние 12 месяцев. */}
        {years.length > 1 && (
          <Dropdown
            aria-label="Период истории"
            size="sm"
            value={String(period)}
            onChange={(value) => setPeriod(value === 'recent' ? 'recent' : Number(value))}
            options={[
              { value: 'recent', label: '12 месяцев' },
              ...years.map((year) => ({ value: String(year), label: String(year) })),
            ]}
          />
        )}
      </div>
      <div className={styles.body}>
        {weekdays}
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
        {weekdays}
      </div>
    </div>
  )
}
