import { parseISO } from 'date-fns'
import { Dropdown } from '../../components/Dropdown'
import { YearCalendar } from '../../components/YearCalendar'
import { fireBurst } from '../../components/fireBurst'
import { cx } from '../../lib/cx'
import { formatDayMonth } from '../../lib/dates'
import type { HabitSchedule } from '../../data/types'
import { checkBlock } from '../../lib/habits'
import styles from './HabitHistory.module.css'
import { useHistoryPeriod } from './useHistoryPeriod'

type Props = {
  /** id привычки: по нему запоминается выбранный период. */
  habitId: string
  checks: ReadonlySet<string>
  /** Расписание: дни, которые по нему отметить нельзя, нарисованы бледнее. */
  schedule: HabitSchedule
  today: string
  /** Самый ранний день, с которого у привычки может быть история: создание или первая отметка. */
  since: string
  onToggle: (date: string, done: boolean) => void
}

/**
 * История привычки: год двенадцатью маленькими календарями, дни точками. Точка залита, если
 * день выполнен. Нажатие на прошедший день ставит или снимает отметку задним числом.
 * По умолчанию текущий год, в списке справа прошлые. На телефоне вместо года месяц.
 */
export function HabitHistory({ habitId, checks, schedule, today, since, onToggle }: Props) {
  const period = useHistoryPeriod(`habit.${habitId}`, since, today)

  const day = (date: string) => {
    const done = checks.has(date)
    // Не день расписания или норма той недели уже набрана: отметить нельзя.
    const blocked = !done && checkBlock(schedule, checks, date) !== null
    const label = `${formatDayMonth(parseISO(date))} · ${done ? 'выполнено' : 'не выполнено'}`
    return (
      <button
        type="button"
        className={cx(styles.dot, done && styles.done, date === today && styles.today, blocked && styles.off)}
        aria-label={label}
        aria-pressed={done}
        onClick={(event) => {
          // Отметили день: маленький салют из точки.
          if (!done && !blocked) fireBurst(event.currentTarget, 10, 24)
          onToggle(date, !done)
        }}
      />
    )
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={`t-body-md ${styles.title}`}>История</h3>
        <Dropdown
          aria-label="Период истории"
          size="sm"
          value={period.value}
          onChange={period.onChange}
          options={period.options}
        />
      </div>
      <YearCalendar months={period.months} today={today} renderDay={day} />
    </div>
  )
}
