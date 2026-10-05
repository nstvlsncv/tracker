import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { parseISO } from 'date-fns'
import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { IconButton } from '../../components/IconButton'
import { MoodFace } from '../../components/MoodFace'
import type { Mood, Task } from '../../data/types'
import { cx } from '../../lib/cx'
import { formatDayMonth, toWeekParam, weekStartISO } from '../../lib/dates'
import { WEEKDAY_LABELS } from '../../lib/habits'
import { progress } from '../../lib/metrics'
import { moodLabel } from '../../lib/moods'
import { monthDays, shiftMonth } from '../../lib/stats'
import { useSessionState } from '../../lib/sessionState'
import styles from './MonthView.module.css'

type Props = {
  tasks: Task[]
  /** Настроение по дням. null: настроений в базе нет, лиц в календаре не будет. */
  moods: Record<string, Mood> | null
  today: string
  /** С какого дня есть задачи (начало истории «Итогов»): раньше этого месяца листать некуда. */
  since: string
}

const MONTHS = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
]

/**
 * Месяц одним экраном: календарь, где у каждого дня кольцо с долей выполненных задач
 * (как кольцо дня на Неделе, только маленькое) и лицо настроения под ним. Нажатие на день
 * открывает его неделю. Листается назад в пределах истории «Итогов» и не дальше текущего месяца.
 */
export function MonthView({ tasks, moods, today, since }: Props) {
  const current = today.slice(0, 7)
  const [month, setMonth] = useSessionState('stats.month', current)
  const first = since.slice(0, 7)
  const days = monthDays(month)

  return (
    <div className={styles.month}>
      <div className={styles.head}>
        <h3 className={`t-body-md ${styles.title}`}>
          {MONTHS[Number(month.slice(5)) - 1]} {month.slice(0, 4)}
        </h3>
        {/* Стрелки есть только там, куда можно листать. */}
        <div className={styles.arrows}>
          {month > first && (
            <IconButton
              variant="ghost"
              size="sm"
              icon={<CaretLeft aria-hidden />}
              aria-label="Предыдущий месяц"
              onClick={() => setMonth(shiftMonth(month, -1))}
            />
          )}
          {month < current && (
            <IconButton
              variant="ghost"
              size="sm"
              icon={<CaretRight aria-hidden />}
              aria-label="Следующий месяц"
              onClick={() => setMonth(shiftMonth(month, 1))}
            />
          )}
        </div>
      </div>

      <div className={styles.grid}>
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className={`t-caption ${styles.weekday}`} aria-hidden>
            {label}
          </span>
        ))}
        {days.map((date, index) => {
          if (!date) return <span key={`blank-${index}`} />
          const dayTasks = tasks.filter((task) => task.date === date)
          const percent = progress(dayTasks)
          const mood = moods?.[date]
          const number = Number(date.slice(8))
          const label = [
            formatDayMonth(parseISO(date)),
            percent === null ? 'задач нет' : `выполнено ${percent}%`,
            mood ? moodLabel(mood).toLowerCase() : null,
          ]
            .filter(Boolean)
            .join(' · ')

          // Будущие дни: только число, ни кольца, ни ссылки.
          if (date > today) {
            return (
              <span key={date} className={cx(styles.day, styles.future)}>
                <span className={`t-body-sm ${styles.ring}`}>{number}</span>
                {/* Место под лицо: строки с будущими днями той же высоты, что остальные. */}
                {moods && <span className={styles.noMood} />}
              </span>
            )
          }
          return (
            <Link
              key={date}
              to={`../week/${toWeekParam(weekStartISO(date))}`}
              relative="path"
              className={cx(styles.day, date === today && styles.today)}
              aria-label={label}
              title={label}
            >
              <span
                className={cx('t-body-sm', styles.ring, percent !== null && styles.filled)}
                style={{ '--percent': `${percent ?? 0}%` } as CSSProperties}
              >
                {number}
              </span>
              {moods && (mood ? <MoodFace mood={mood} size={16} /> : <span className={styles.noMood} />)}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
