import { parseISO } from 'date-fns'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '../../components/Button'
import { buttonClassName } from '../../components/buttonStyles'
import { Mascot } from '../../components/Mascot'
import { MoodFace } from '../../components/MoodFace'
import { PageLoader } from '../../components/PageLoader'
import { Section } from '../../components/Section'
import { StatCard } from '../../components/StatCard'
import type { Goal, Mood, Task } from '../../data/types'
import { useHabits } from '../../data/useHabits'
import { usePlanner } from '../../data/usePlanner'
import { PageHeader } from '../../layout/PageHeader'
import { cx } from '../../lib/cx'
import {
  formatDateNumeric,
  formatDayMonth,
  formatWeekRangeShort,
  toWeekParam,
} from '../../lib/dates'
import {
  completionRate,
  formatStreak,
  habitStreaks,
  scheduleLabel,
  scheduleOf,
} from '../../lib/habits'
import { WEEKDAY_LABELS } from '../../lib/habits'
import { pluralize, shiftDate } from '../../lib/metrics'
import { averageMood, moodInsights, moodLabel } from '../../lib/moods'
import { habitsKept, recentWeeks, summarizeWeeks, weekSummary, weekVerdict } from '../../lib/stats'
import { NETWORK_ERROR_MESSAGE } from '../../lib/supabase'
import { useToday } from '../../lib/useToday'
import { MoodHistory } from './MoodHistory'
import styles from './Stats.module.css'

/** За сколько недель показывается график и за сколько дней считаются привычки. */
const WEEKS = 12
const HABIT_DAYS = 30
/** За сколько дней считаются выводы по настроению и сколько отметок для них нужно. */
const MOOD_DAYS = 30
const MOOD_MIN_MARKS = 5
const NO_CHECKS: ReadonlySet<string> = new Set()

type History = { tasks: Task[]; goals: Goal[] }

/**
 * Итоги (в коде stats): взгляд назад. Задачи и цели за последние 12 недель и привычки за 30 дней.
 * Данные читаются заново при каждом открытии экрана, в общем хранилище не лежат.
 */
export function Stats() {
  const { loadHistory, loadWeek, notes, moods, setMood } = usePlanner()
  const habitsStore = useHabits()
  const today = useToday()
  const weeks = recentWeeks(today, WEEKS)
  const from = weeks[0]

  // Заметка прошлой недели лежит вместе с неделей: подгружаем её для итогов.
  const lastWeek = weeks[weeks.length - 2]
  useEffect(() => {
    loadWeek(lastWeek)
  }, [loadWeek, lastWeek])

  const [history, setHistory] = useState<History | 'error' | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let cancelled = false
    loadHistory(from).then(
      (loaded) => {
        if (!cancelled) setHistory(loaded)
      },
      () => {
        if (!cancelled) setHistory('error')
      },
    )
    return () => {
      cancelled = true
    }
  }, [loadHistory, from, attempt])

  if (history === 'error') {
    return (
      <>
        <PageHeader title="Итоги" backTo=".." backAlways />
        <Section title="Не получилось загрузить итоги">
          <p className={styles.hint}>{NETWORK_ERROR_MESSAGE}</p>
          <div>
            <Button
              variant="secondary"
              onClick={() => {
                setHistory(null)
                setAttempt((count) => count + 1)
              }}
            >
              Повторить
            </Button>
          </div>
        </Section>
      </>
    )
  }

  const habitsLoading = habitsStore.status === 'loading'
  // Экран появляется целиком, когда готово всё: по частям он дёргался бы.
  if (history === null || habitsLoading) {
    return (
      <>
        <PageHeader title="Итоги" backTo=".." backAlways />
        <PageLoader />
      </>
    )
  }

  const summary = summarizeWeeks(history.tasks, history.goals, weeks)
  const tasksDone = summary.reduce((sum, week) => sum + week.done, 0)
  const goalsDone = summary.reduce((sum, week) => sum + week.goalsDone, 0)
  const bestWeek = Math.max(0, ...summary.map((week) => week.percent ?? 0))
  const hasTasks = summary.some((week) => week.total > 0)

  // Настроение недели: по доле выполненных задач текущей недели.
  const thisWeek = summary[summary.length - 1]
  const verdict = weekVerdict(thisWeek.percent)

  const habits = habitsStore.habits.map((habit) => {
    const checks = habitsStore.checks[habit.id] ?? NO_CHECKS
    const schedule = scheduleOf(habit)
    return {
      habit,
      schedule,
      rate: completionRate(schedule, checks, today, HABIT_DAYS),
      ...habitStreaks(schedule, checks, today),
    }
  })
  // Итоги прошлой недели одним блоком: задачи, цели, привычки, настроение и заметка.
  const recap = summary[summary.length - 2]
  const kept = habitsKept(
    habits.map(({ habit, schedule }) => ({
      schedule,
      checks: habitsStore.checks[habit.id] ?? NO_CHECKS,
    })),
    lastWeek,
  )
  const recapMoods = moods
    ? [0, 1, 2, 3, 4, 5, 6].flatMap((offset) => moods[shiftDate(lastWeek, offset)] ?? [])
    : []
  const recapMood = averageMood(recapMoods)
  const recapNote = notes?.[lastWeek]
  const hasRecap = recap.total > 0 || recap.goalsTotal > 0 || recapMoods.length > 0 || Boolean(recapNote)

  // Что видно по настроению за последние 30 дней. Пока отметок мало, выводов нет.
  const insights = moods ? moodInsights(moods, history.tasks, today, MOOD_DAYS) : null

  // Рекорд среди серий в днях: недельные серии с ними не сравниваются.
  const bestStreak = Math.max(
    0,
    ...habits.filter((item) => item.best.unit === 'days').map((item) => item.best.value),
  )

  return (
    <>
      <PageHeader title="Итоги" backTo=".." backAlways />

      <div className={styles.verdict}>
          <Mascot size={72} mood={verdict.mood} />
          <div className={styles.verdictText}>
            <p className="t-heading-4">{verdict.title}</p>
            <p className={styles.hint}>
              {weekSummary(thisWeek.done, thisWeek.total)}
            </p>
          </div>
      </div>

      <div className={styles.stats}>
        <StatCard variant="highlight" value={tasksDone} label="задач выполнено" />
        <StatCard value={goalsDone} label="целей выполнено" />
        <StatCard value={`${bestWeek}%`} label="лучшая неделя" />
        <StatCard
          value={bestStreak}
          label={`${pluralize(bestStreak, 'день', 'дня', 'дней')}, лучшая серия`}
        />
      </div>

      {hasRecap && (
        <Section
          title="Прошлая неделя"
          action={
            <Link
              className={buttonClassName({ variant: 'secondary', size: 'sm' })}
              to={`../week/${toWeekParam(lastWeek)}`}
              relative="path"
            >
              Открыть неделю
            </Link>
          }
        >
          <div className={styles.recap}>
            <StatCard
              variant="surface"
              value={recap.total > 0 ? `${recap.done} из ${recap.total}` : '—'}
              label="задач выполнено"
            />
            <StatCard
              variant="surface"
              value={recap.goalsTotal > 0 ? `${recap.goalsDone} из ${recap.goalsTotal}` : '—'}
              label="целей выполнено"
            />
            <StatCard
              variant="surface"
              value={habits.length > 0 ? `${kept} из ${habits.length}` : '—'}
              label="привычек в норме"
            />
            <StatCard
              variant="surface"
              value={
                recapMood === null ? (
                  '—'
                ) : (
                  <span className={styles.recapMood}>
                    <MoodFace mood={Math.round(recapMood) as Mood} size={24} />
                    {moodLabel(Math.round(recapMood) as Mood).replace(' день', '')}
                  </span>
                )
              }
              label="настроение недели"
            />
          </div>
          {recapNote && <p className={styles.recapNote}>{recapNote}</p>}
        </Section>
      )}

      <Section title={`Задачи за ${WEEKS} недель`}>
        {!hasTasks ? (
          <p className={styles.hint}>Здесь появится график, когда на неделях будут задачи</p>
        ) : (
          <>
            <p className={styles.hint}>
              Какая доля задач недели выполнена. Нажми на столбик, чтобы открыть неделю
            </p>
            {/* Столбик устроен как кольцо дня: серая дорожка во всю высоту и лаймовое заполнение. */}
            <ol className={styles.chart}>
              {summary.map((week, index) => {
                const range = formatWeekRangeShort(parseISO(week.weekStart))
                const current = index === summary.length - 1
                const text =
                  week.percent === null
                    ? `${range}: задач не было`
                    : `${range}: ${week.done} из ${week.total}, ${week.percent}%`
                return (
                  <li key={week.weekStart} className={styles.column}>
                    <Link
                      to={`../week/${toWeekParam(week.weekStart)}`}
                      relative="path"
                      className={styles.bar}
                      aria-label={text}
                    >
                      {/* Подписан только столбик текущей недели, остальные значения в подсказке. */}
                      <span className={cx('t-caption', styles.value, current && styles.shown)}>
                        {week.percent === null ? '—' : `${week.percent}%`}
                      </span>
                      <span className={styles.track}>
                        <span className={styles.fill} style={{ height: `${week.percent ?? 0}%` }} />
                      </span>
                      <span className={`t-body-sm ${styles.tip}`} role="tooltip">
                        {text}
                      </span>
                    </Link>
                    <span className={`t-caption ${styles.tick}`}>
                      {formatDateNumeric(parseISO(week.weekStart)).slice(0, 5)}
                    </span>
                  </li>
                )
              })}
            </ol>
            {/* Телефон: под каждым столбиком дата не помещается, вместо этого подписаны края. */}
            <div className={`t-caption ${styles.range}`} aria-hidden>
              <span>с {formatDayMonth(parseISO(summary[0].weekStart))}</span>
              <span>эта неделя</span>
            </div>
          </>
        )}
      </Section>

      {/* Настроений может не быть в базе: тогда секции нет. */}
      {moods && (
        <Section title="Настроение по дням">
          {Object.keys(moods).length === 0 && (
            <p className={styles.hint}>Отмечай настроение дня, и здесь соберётся картина. Нажми на любой день</p>
          )}
          {insights && insights.marked >= MOOD_MIN_MARKS && (
            <div className={styles.recap}>
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
        </Section>
      )}

      <Section title={`Привычки за ${HABIT_DAYS} дней`}>
        {habits.length === 0 ? (
          <p className={styles.hint}>Здесь появятся привычки, когда заведёшь первую</p>
        ) : (
          <ul className={styles.habits}>
            {habits.map(({ habit, schedule, rate, current, best }) => (
              <li key={habit.id} className={styles.habit}>
                <div className={styles.habitHead}>
                  <span className={styles.habitTitle}>{habit.title}</span>
                  <span className="t-number-sm">{rate}%</span>
                </div>
                <div
                  className={styles.meter}
                  role="img"
                  aria-label={`Выполнено ${rate}% за ${HABIT_DAYS} дней`}
                >
                  <span className={styles.meterFill} style={{ width: `${rate}%` }} />
                </div>
                <span className={`t-body-sm ${styles.habitNote}`}>
                  {scheduleLabel(schedule)} · серия {formatStreak(current)} · лучшая{' '}
                  {formatStreak(best)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  )
}
