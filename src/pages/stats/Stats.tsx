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
import { shiftDate } from '../../lib/metrics'
import { averageMood, moodLabel } from '../../lib/moods'
import { habitsKept, recentWeeks, summarizeWeeks, weekSummary, weekVerdict } from '../../lib/stats'
import { NETWORK_ERROR_MESSAGE } from '../../lib/supabase'
import { useToday } from '../../lib/useToday'
import styles from './Stats.module.css'

/** За сколько недель показывается график и за сколько дней считаются привычки. */
const WEEKS = 12
const HABIT_DAYS = 30
const NO_CHECKS: ReadonlySet<string> = new Set()

type History = { tasks: Task[]; goals: Goal[] }

/**
 * Итоги (в коде stats): взгляд назад. Задачи и цели за последние 12 недель и привычки за 30 дней.
 * Данные читаются заново при каждом открытии экрана, в общем хранилище не лежат.
 */
export function Stats() {
  const planner = usePlanner()
  const { loadHistory, loadWeek, notes, moods } = planner
  const habitsStore = useHabits()
  const today = useToday()
  const weeks = recentWeeks(today, WEEKS)
  const from = weeks[0]

  // Заметка прошлой недели лежит вместе с неделей: подгружаем её для итогов.
  const lastWeek = weeks[weeks.length - 2]
  // Текущая неделя тоже открывается: только тогда на её дни встают повторяющиеся задачи,
  // и вердикт считает те же задачи, что видны на Неделе.
  const thisWeekStart = weeks[weeks.length - 1]
  useEffect(() => {
    loadWeek(lastWeek)
    loadWeek(thisWeekStart)
  }, [loadWeek, lastWeek, thisWeekStart])

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
        <PageHeader title="Итоги" help="stats" backTo=".." backAlways />
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
  const weekState = planner.weekStatus[thisWeekStart]
  const weekLoading = weekState === undefined || weekState === 'loading'
  if (history === null || habitsLoading || weekLoading) {
    return (
      <>
        <PageHeader title="Итоги" help="stats" backTo=".." backAlways />
        <PageLoader />
      </>
    )
  }

  // Прошлые недели берутся из истории, текущая из общего хранилища (если она загрузилась):
  // в нём уже стоят повторяющиеся задачи этой недели.
  const live = weekState === 'ready'
  const allTasks = live
    ? [
        ...history.tasks.filter((task) => task.date < thisWeekStart),
        ...planner.tasks.filter((task) => task.date >= thisWeekStart),
      ]
    : history.tasks
  const allGoals = live
    ? [
        ...history.goals.filter((goal) => goal.weekStart < thisWeekStart),
        ...planner.goals.filter((goal) => goal.weekStart >= thisWeekStart),
      ]
    : history.goals
  const summary = summarizeWeeks(allTasks, allGoals, weeks)
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

  return (
    <>
      <PageHeader title="Итоги" help="stats" backTo=".." backAlways />

      <div className={styles.verdict}>
          <Mascot size={72} mood={verdict.mood} />
          <div className={styles.verdictText}>
            <p className="t-heading-4">{verdict.title}</p>
            <p className={styles.hint}>
              {weekSummary(thisWeek.done, thisWeek.total)}
            </p>
          </div>
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
    </>
  )
}
