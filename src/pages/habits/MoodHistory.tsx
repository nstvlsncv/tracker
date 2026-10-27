import { parseISO } from 'date-fns'
import { useCallback, useState } from 'react'
import { Dropdown } from '../../components/Dropdown'
import { MoodFace } from '../../components/MoodFace'
import { MoodMenu } from '../../components/MoodMenu'
import { YearCalendar } from '../../components/YearCalendar'
import type { Mood } from '../../data/types'
import { cx } from '../../lib/cx'
import { formatDayMonth } from '../../lib/dates'
import { historyYears } from '../../lib/habitHistory'
import { MOODS, moodLabel } from '../../lib/moods'
import { useSessionState } from '../../lib/sessionState'
// Карточка и шапка те же, что у истории привычки.
import grid from './HabitHistory.module.css'
import styles from './MoodHistory.module.css'

type Props = {
  moods: Record<string, Mood>
  today: string
  /** Отметить настроение дня. null снимает отметку. */
  onPick: (date: string, mood: Mood | null) => void
}

/**
 * Настроение по дням: тот же год маленькими календарями, что у истории привычки, только
 * вместо точек лица маскота. День без отметки серый. По умолчанию текущий год, в списке
 * справа прошлые. Нажатие на день открывает то же окошко выбора, что на Неделе: настроение
 * можно поставить или поменять задним числом.
 */
export function MoodHistory({ moods, today, onPick }: Props) {
  // День, для которого сейчас открыт выбор, и его кружок: окошко встаёт под ним.
  const [picking, setPicking] = useState<{ date: string; anchor: Element } | null>(null)
  const closeMenu = useCallback(() => setPicking(null), [])
  const [year, setYear] = useSessionState('mood.year', Number(today.slice(0, 4)))
  const first = Object.keys(moods).sort()[0] ?? today
  const years = historyYears(first, today)

  // Клетка дня: лицо или серая точка.
  const day = (date: string) => {
    const mood = moods[date]
    const label = `${formatDayMonth(parseISO(date))} · ${mood ? moodLabel(mood) : 'без отметки'}`
    return (
      <button
        type="button"
        className={cx(styles.day, date === today && styles.today)}
        aria-label={label}
        onClick={(event) => {
          const anchor = event.currentTarget
          setPicking((current) => (current?.date === date ? null : { date, anchor }))
        }}
      >
        {mood ? <MoodFace mood={mood} size="100cqi" /> : <span className={styles.empty} />}
      </button>
    )
  }

  return (
    <div className={grid.card}>
      <div className={grid.header}>
        <h3 className={`t-body-md ${grid.title}`}>Настроение по дням</h3>
        <Dropdown
          aria-label="Период"
          size="sm"
          value={String(year)}
          onChange={(value) => setYear(Number(value))}
          options={years.map((value) => ({ value: String(value), label: `${value} год` }))}
        />
      </div>
      <YearCalendar year={year} today={today} renderDay={day} />
      {picking && (
        <MoodMenu
          anchor={picking.anchor}
          mood={moods[picking.date] ?? null}
          onPick={(mood) => onPick(picking.date, mood)}
          onClose={closeMenu}
        />
      )}
      {/* Что значит каждое лицо. */}
      <ul className={styles.legend}>
        {MOODS.map((option) => (
          <li key={option.value} className={`t-caption ${styles.legendItem}`}>
            <MoodFace mood={option.value} size={20} />
            {option.label.replace(' день', '')}
          </li>
        ))}
      </ul>
    </div>
  )
}
