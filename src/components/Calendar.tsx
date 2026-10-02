import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { addDays, addMonths, format, parseISO, startOfMonth } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useState } from 'react'
import { cx } from '../lib/cx'
import { formatDayMonth, formatWeekRange, toISODate, weekStartOf } from '../lib/dates'
import { IconButton } from './IconButton'
import styles from './Calendar.module.css'

type Props = {
  /** day: выбирается один день. week: выбирается неделя целиком, значение её понедельник. */
  mode: 'day' | 'week'
  /** 'yyyy-MM-dd' */
  value: string
  onChange: (value: string) => void
  today: string
  /** Понедельники недель, в которых есть данные: помечаются точкой слева от строки. */
  markedWeeks?: string[]
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const ROWS = 6 // всегда шесть строк, чтобы высота не прыгала при листании месяцев

/** Календарь на месяц, неделя с понедельника. Умеет выбирать день или неделю целиком. */
export function Calendar({ mode, value, onChange, today, markedWeeks }: Props) {
  const [month, setMonth] = useState(() => startOfMonth(parseISO(value)))
  const gridStart = weekStartOf(month)
  const title = format(month, 'LLLL yyyy', { locale: ru })

  const day = (date: Date) => {
    const iso = toISODate(date)
    return {
      iso,
      number: date.getDate(),
      outside: date.getMonth() !== month.getMonth(),
      isToday: iso === today,
    }
  }

  return (
    <div className={styles.calendar}>
      <div className={styles.header}>
        <IconButton
          variant="ghost"
          size="sm"
          icon={<IconChevronLeft aria-hidden />}
          aria-label="Предыдущий месяц"
          onClick={() => setMonth(addMonths(month, -1))}
        />
        <span className={`t-button ${styles.title}`} aria-live="polite">
          {title}
        </span>
        <IconButton
          variant="ghost"
          size="sm"
          icon={<IconChevronRight aria-hidden />}
          aria-label="Следующий месяц"
          onClick={() => setMonth(addMonths(month, 1))}
        />
      </div>

      <div className={`t-caption ${styles.weekdays}`} aria-hidden>
        {WEEKDAYS.map((name) => (
          <span key={name}>{name}</span>
        ))}
      </div>

      <div className={styles.grid}>
        {Array.from({ length: ROWS }, (_, row) => {
          const monday = addDays(gridStart, row * 7)
          const days = Array.from({ length: 7 }, (_, index) => day(addDays(monday, index)))

          if (mode === 'week') {
            const selected = days[0].iso === value
            return (
              <button
                key={days[0].iso}
                type="button"
                className={cx(
                  't-body-md',
                  styles.week,
                  selected && styles.selected,
                  markedWeeks?.includes(days[0].iso) && styles.marked,
                )}
                aria-pressed={selected}
                aria-label={`Неделя ${formatWeekRange(monday)}`}
                onClick={() => onChange(days[0].iso)}
              >
                {days.map((item) => (
                  <span
                    key={item.iso}
                    className={cx(
                      styles.cell,
                      item.outside && styles.outside,
                      item.isToday && styles.today,
                    )}
                  >
                    {item.number}
                  </span>
                ))}
              </button>
            )
          }

          return (
            <div key={days[0].iso} className={styles.row}>
              {days.map((item) => (
                <button
                  key={item.iso}
                  type="button"
                  className={cx(
                    't-body-md',
                    styles.cell,
                    styles.day,
                    item.outside && styles.outside,
                    item.isToday && styles.today,
                    item.iso === value && styles.selected,
                  )}
                  aria-pressed={item.iso === value}
                  aria-label={formatDayMonth(parseISO(item.iso))}
                  onClick={() => onChange(item.iso)}
                >
                  {item.number}
                </button>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
