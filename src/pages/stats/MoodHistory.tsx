import { parseISO } from 'date-fns'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Dropdown } from '../../components/Dropdown'
import { MoodFace } from '../../components/MoodFace'
import { MoodMenu } from '../../components/MoodMenu'
import type { Mood } from '../../data/types'
import { cx } from '../../lib/cx'
import { formatDayMonth } from '../../lib/dates'
import { habitHistory, historyYears } from '../../lib/habitHistory'
import type { HistoryPeriod } from '../../lib/habitHistory'
import { MOODS, moodLabel } from '../../lib/moods'
import { recall, remember, useSessionState } from '../../lib/sessionState'
// Сетка та же, что у истории привычки: столбцы недель, подписи дней недели сбоку.
import grid from '../habits/HabitHistory.module.css'
import styles from './MoodHistory.module.css'

type Props = {
  moods: Record<string, Mood>
  today: string
  /** Отметить настроение дня. null снимает отметку. */
  onPick: (date: string, mood: Mood | null) => void
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const SCROLL_STEP_PX = 4

/**
 * Настроение по дням: та же сетка, что у истории привычки, только вместо точек лица маскота.
 * День без отметки серый. По умолчанию последние 12 месяцев, справа можно выбрать год.
 * Нажатие на день открывает то же окошко выбора, что на Неделе: настроение можно поставить
 * или поменять задним числом.
 */
export function MoodHistory({ moods, today, onPick }: Props) {
  // День, для которого сейчас открыт выбор, и его кружок: окошко встаёт под ним.
  const [picking, setPicking] = useState<{ date: string; anchor: Element } | null>(null)
  const closeMenu = useCallback(() => setPicking(null), [])
  const scrollRef = useRef<HTMLDivElement>(null)
  const [period, setPeriod] = useSessionState<HistoryPeriod>('mood.period', 'recent')
  const scrollKey = `mood.scroll.${period}`
  const weeks = useMemo(() => habitHistory(today, period), [today, period])
  const first = Object.keys(moods).sort()[0] ?? today
  const years = historyYears(first, today)

  // С какой стороны стоят подписи дней недели: с той, куда листали последним.
  const [side, setSide] = useState<'left' | 'right'>('right')
  const lastScroll = useRef(0)

  useEffect(() => {
    const scroll = scrollRef.current
    if (!scroll) return
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
    <div className={cx(grid.weekdays, grid[place], side === place && grid.shown)} aria-hidden>
      <span className={grid.month} />
      {WEEKDAYS.map((day) => (
        <span key={day} className={`t-caption ${grid.weekday}`}>
          {day}
        </span>
      ))}
    </div>
  )

  return (
    <div className={grid.card}>
      <div className={grid.header}>
        <h3 className={`t-body-md ${grid.title}`}>
          {period === 'recent' ? 'Настроение за год' : `Настроение за ${period}`}
        </h3>
        <Dropdown
          aria-label="Период"
          size="sm"
          value={String(period)}
          onChange={(value) => setPeriod(value === 'recent' ? 'recent' : Number(value))}
          options={[
            { value: 'recent', label: '12 месяцев' },
            ...years.map((year) => ({ value: String(year), label: String(year) })),
          ]}
        />
      </div>
      <div className={grid.body}>
        {weekdays('left')}
        <div ref={scrollRef} className={grid.scroll} onScroll={onScroll}>
          <div className={grid.grid}>
            {weeks.map((week) => (
              <div key={week.start} className={grid.week}>
                <span className={`t-caption ${grid.month}`}>{week.month}</span>
                {week.days.map((date, index) => {
                  if (!date) return <span key={index} className={grid.blank} />
                  const mood = moods[date]
                  const label = `${formatDayMonth(parseISO(date))} · ${mood ? moodLabel(mood) : 'без отметки'}`
                  return (
                    <button
                      key={date}
                      type="button"
                      className={cx(styles.day, date === today && styles.today)}
                      aria-label={label}
                      title={label}
                      onClick={(event) => {
                        const anchor = event.currentTarget
                        setPicking((current) => (current?.date === date ? null : { date, anchor }))
                      }}
                    >
                      {mood ? (
                        <MoodFace mood={mood} size="var(--dot)" />
                      ) : (
                        <span className={styles.empty} />
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
        {weekdays('right')}
      </div>
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
