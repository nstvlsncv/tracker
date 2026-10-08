import { CaretDown, CaretUp } from '@phosphor-icons/react'
import { useEffect, useId, useState } from 'react'
import { Collapse } from '../../components/Collapse'
import { StatCard } from '../../components/StatCard'
import type { Task } from '../../data/types'
import { usePlanner } from '../../data/usePlanner'
import { weekStartISO } from '../../lib/dates'
import { WEEKDAY_LABELS } from '../../lib/habits'
import { currentStreak, formatDays, shiftDate } from '../../lib/metrics'
import { moodInsights, moodLabel } from '../../lib/moods'
import { useSessionState } from '../../lib/sessionState'
import { MoodPicker } from '../week/MoodPicker'
import { MoodHistory } from './MoodHistory'
import card from './HabitCard.module.css'

/** За сколько дней считаются выводы по настроению и сколько отметок для них нужно. */
const MOOD_DAYS = 30
const MOOD_MIN_MARKS = 5
const NO_TASKS: Task[] = []

/**
 * Настроение дня среди привычек: отмечать его каждый день тоже привычка, и карточка устроена
 * так же. Свёрнутая: лицо за сегодня (нажатие открывает выбор) и серия отмеченных дней.
 * Раскрытая: выводы за 30 дней и история по дням, где любой день можно отметить задним числом.
 * Пока настроений нет в базе, карточки нет.
 */
export function MoodCard({ today }: { today: string }) {
  const { moods, setMood, loadHistory } = usePlanner()
  const detailsId = useId()
  const [open, setOpen] = useSessionState('habits.moodOpen', false)

  // Задачи последних 30 дней нужны двум выводам (как настроение связано с делами). Читаются
  // один раз, когда карточку впервые раскрыли; пока их нет, в этих выводах стоит прочерк.
  const [tasks, setTasks] = useState<Task[]>()
  const from = weekStartISO(shiftDate(today, -(MOOD_DAYS - 1)))
  const wanted = open && tasks === undefined
  useEffect(() => {
    if (!wanted) return
    let cancelled = false
    loadHistory(from).then(
      (history) => {
        if (!cancelled) setTasks(history.tasks)
      },
      // Не получилось: выводы о задачах останутся с прочерком, остальное работает.
      () => {
        if (!cancelled) setTasks(NO_TASKS)
      },
    )
    return () => {
      cancelled = true
    }
  }, [wanted, loadHistory, from])

  if (!moods) return null

  const mood = moods[today]
  const streak = currentStreak(Object.keys(moods), today)
  const insights = moodInsights(moods, tasks ?? NO_TASKS, today, MOOD_DAYS)
  const Caret = open ? CaretUp : CaretDown

  return (
    <article className={card.card}>
      <div className={card.head} onClick={() => setOpen(!open)}>
        {/* Нажатие на лицо открывает выбор настроения, а не раскрывает карточку. */}
        <span className={card.mood} onClick={(event) => event.stopPropagation()}>
          <MoodPicker date={today} size={32} />
        </span>
        <div className={card.text}>
          <button
            type="button"
            className={`t-heading-5 ${card.title}`}
            aria-expanded={open}
            aria-controls={detailsId}
          >
            Настроение дня
          </button>
          <span className={`t-body-md ${card.streak}`}>
            <span>{mood ? moodLabel(mood) : 'Сегодня ещё не отмечено'} ·</span>{' '}
            <span>серия {formatDays(streak)}</span>
          </span>
        </div>
        <Caret className={card.caret} aria-hidden />
      </div>

      <Collapse open={open}>
        <div id={detailsId} className={card.details}>
          {insights.marked >= MOOD_MIN_MARKS && (
            <div className={card.stats}>
              <StatCard
                variant="surface"
                value={String(insights.average).replace('.', ',')}
                label={`из 5, среднее за ${MOOD_DAYS} дней`}
              />
              <StatCard
                variant="surface"
                value={insights.bestWeekday ? WEEKDAY_LABELS[insights.bestWeekday - 1] : '—'}
                label="самый приятный день"
              />
              <StatCard
                variant="surface"
                value={insights.doneOnGoodDays === null ? '—' : `${insights.doneOnGoodDays}%`}
                label="задач в хорошие дни"
              />
              <StatCard
                variant="surface"
                value={insights.doneOnBadDays === null ? '—' : `${insights.doneOnBadDays}%`}
                label="задач в плохие дни"
              />
            </div>
          )}
          <MoodHistory moods={moods} today={today} onPick={setMood} />
        </div>
      </Collapse>
    </article>
  )
}
