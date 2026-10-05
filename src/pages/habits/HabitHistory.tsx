import { parseISO } from 'date-fns'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Dropdown } from '../../components/Dropdown'
import { fireBurst } from '../../components/fireBurst'
import { cx } from '../../lib/cx'
import { formatDayMonth } from '../../lib/dates'
import type { HabitSchedule } from '../../data/types'
import { habitHistory, historyYears } from '../../lib/habitHistory'
import { checkBlock } from '../../lib/habits'
import type { HistoryPeriod } from '../../lib/habitHistory'
import { recall, remember, useSessionState } from '../../lib/sessionState'
import styles from './HabitHistory.module.css'

type Props = {
  /** id привычки: по нему запоминаются выбранный период и прокрутка истории. */
  habitId: string
  checks: ReadonlySet<string>
  /** Расписание: дни, которые по нему отметить нельзя, нарисованы бледнее. */
  schedule: HabitSchedule
  today: string
  /** Самый ранний день, с которого у привычки может быть история: создание или первая отметка. */
  since: string
  onToggle: (date: string, done: boolean) => void
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
/** Сдвиг, с которого прокрутка считается намеренной, а не дрожанием. */
const SCROLL_STEP_PX = 4

/**
 * История привычки: столбцы это недели, строки дни с понедельника. Точка залита, если день
 * выполнен. Нажатие на прошедший день ставит или снимает отметку задним числом.
 * По умолчанию последние 12 месяцев, в списке справа можно выбрать календарный год.
 * Сетка открывается прокрученной к концу периода. Подписи дней недели стоят с одной стороны:
 * справа, а когда сетку листают влево, переезжают налево.
 */
export function HabitHistory({ habitId, checks, schedule, today, since, onToggle }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [period, setPeriod] = useSessionState<HistoryPeriod>(`habit.period.${habitId}`, 'recent')
  const scrollKey = `habit.scroll.${habitId}.${period}`
  const weeks = useMemo(() => habitHistory(today, period), [today, period])
  const years = historyYears(since, today)

  // С какой стороны стоят подписи дней недели: с той, куда листали последним.
  const [side, setSide] = useState<'left' | 'right'>('right')
  const lastScroll = useRef(0)

  useEffect(() => {
    const scroll = scrollRef.current
    if (!scroll) return
    // Если историю уже листали, она открывается на том же месте. Иначе на конце периода.
    scroll.scrollLeft = recall<number>(scrollKey) ?? scroll.scrollWidth
    lastScroll.current = scroll.scrollLeft
    setSide('right')
  }, [scrollKey])

  const onScroll = () => {
    const scroll = scrollRef.current
    if (!scroll) return
    remember(scrollKey, scroll.scrollLeft)
    const delta = scroll.scrollLeft - lastScroll.current
    if (Math.abs(delta) < SCROLL_STEP_PX) return
    lastScroll.current = scroll.scrollLeft
    setSide(delta < 0 ? 'left' : 'right')
  }

  const weekdays = (place: 'left' | 'right') => (
    <div className={cx(styles.weekdays, styles[place], side === place && styles.shown)} aria-hidden>
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
      </div>
      <div className={styles.body}>
        {weekdays('left')}
        <div ref={scrollRef} className={styles.scroll} onScroll={onScroll}>
          <div className={styles.grid}>
            {weeks.map((week) => (
              <div key={week.start} className={styles.week}>
                <span className={`t-caption ${styles.month}`}>{week.month}</span>
                {week.days.map((date, index) => {
                  if (!date) return <span key={index} className={styles.blank} />
                  const done = checks.has(date)
                  // Не день расписания или норма той недели уже набрана: отметить нельзя.
                  const blocked = !done && checkBlock(schedule, checks, date) !== null
                  const label = `${formatDayMonth(parseISO(date))} · ${done ? 'выполнено' : 'не выполнено'}`
                  return (
                    <button
                      key={date}
                      type="button"
                      className={cx(
                        styles.dot,
                        done && styles.done,
                        date === today && styles.today,
                        blocked && styles.off,
                      )}
                      aria-label={label}
                      aria-pressed={done}
                      title={label}
                      onClick={(event) => {
                        // Отметили день: маленький салют из точки.
                        if (!done && !blocked) fireBurst(event.currentTarget, 10, 24)
                        onToggle(date, !done)
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
        {weekdays('right')}
      </div>
    </div>
  )
}
