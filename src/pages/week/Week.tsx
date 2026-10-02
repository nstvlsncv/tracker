import { IconPlus } from '@tabler/icons-react'
import { parseISO } from 'date-fns'
import { useEffect, useRef } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { AddItem } from '../../components/AddItem'
import { Button } from '../../components/Button'
import { Dropdown } from '../../components/Dropdown'
import { ItemList } from '../../components/ItemList'
import { Section } from '../../components/Section'
import { Skeleton } from '../../components/Skeleton'
import { StatCard } from '../../components/StatCard'
import { usePlanner } from '../../data/usePlanner'
import {
  formatWeekdayShort,
  formatWeekRange,
  parseWeekParam,
  toWeekParam,
  weekStartISO,
} from '../../lib/dates'
import { shiftDate, weekAnalytics } from '../../lib/metrics'
import { NETWORK_ERROR_MESSAGE } from '../../lib/supabase'
import { useToday } from '../../lib/useToday'
import { DayCard } from './DayCard'
import styles from './Week.module.css'

const DAYS = [0, 1, 2, 3, 4, 5, 6]

export function Week() {
  const { isoWeek } = useParams()
  const navigate = useNavigate()
  const planner = usePlanner()
  const { loadWeek } = planner
  const daysRef = useRef<HTMLDivElement>(null)

  const today = useToday()
  const currentWeek = weekStartISO(today)
  // Адрес /week открывает текущую неделю, /week/2026-W38 конкретную.
  const weekStart = isoWeek ? parseWeekParam(isoWeek) : currentWeek
  const status = weekStart ? planner.weekStatus[weekStart] : undefined

  useEffect(() => {
    if (weekStart) loadWeek(weekStart)
  }, [weekStart, loadWeek])

  // Текущая неделя открывается прокрученной к сегодняшнему дню.
  useEffect(() => {
    if (status !== 'ready' || weekStart !== currentWeek) return
    const row = daysRef.current
    const card = row?.querySelector<HTMLElement>('[aria-current="date"]')
    if (row && card) row.scrollLeft = card.offsetLeft - row.offsetLeft
  }, [status, weekStart, currentWeek])

  if (!weekStart) return <Navigate to=".." replace relative="path" />

  const tasks = planner.tasks.filter((task) => weekStartISO(task.date) === weekStart)
  const goals = planner.goals.filter((goal) => goal.weekStart === weekStart)

  // В списке: недели с данными, текущая и та, что открыта сейчас.
  const weeks = [...new Set([...planner.weeksWithData, currentWeek, weekStart])].sort()
  const thisYear = today.slice(0, 4)
  const options = weeks.map((week) => ({
    value: week,
    label: formatWeekRange(parseISO(week), { year: !week.startsWith(thisYear) }),
  }))

  const goToWeek = (week: string) =>
    navigate(isoWeek ? `../${toWeekParam(week)}` : toWeekParam(week), { relative: 'path' })

  // TODO(open): «Добавить неделю» открывает неделю, следующую за последней в списке.
  // Отдельной записи о неделе в базе нет: пустая неделя пропадёт из списка, если уйти с неё.
  const addWeek = () => goToWeek(shiftDate(weeks[weeks.length - 1], 7))

  const stats = weekAnalytics(tasks, goals, weekStart, today)
  const ready = status === 'ready'

  return (
    <>
      <header className={styles.header}>
        <h1 className="t-heading-1">Неделя</h1>
        <div className={styles.controls}>
          <Dropdown aria-label="Неделя" options={options} value={weekStart} onChange={goToWeek} />
          <Button size="lg" icon={<IconPlus aria-hidden />} onClick={addWeek}>
            Добавить неделю
          </Button>
        </div>
      </header>

      {status === 'error' ? (
        <Section title="Не получилось загрузить неделю">
          <p className={styles.hint}>{NETWORK_ERROR_MESSAGE}</p>
          <div>
            <Button variant="secondary" onClick={() => loadWeek(weekStart, true)}>
              Повторить
            </Button>
          </div>
        </Section>
      ) : (
        <>
          <Section title="Цели недели">
            {!ready ? (
              <ListSkeleton rows={3} />
            ) : goals.length > 0 ? (
              <ItemList
                items={goals}
                onToggle={planner.toggleGoal}
                onRename={planner.renameGoal}
                onDelete={planner.deleteGoal}
              />
            ) : (
              <p className={styles.hint}>Поставь 1–3 цели на неделю</p>
            )}
            {ready && (
              <AddItem label="Добавить цель" onAdd={(title) => planner.addGoal(weekStart, title)} />
            )}
          </Section>

          <div className={styles.stats}>
            <StatCard value={ready ? stats.total : '—'} label="всего задач" />
            <StatCard value={ready ? stats.done : '—'} label="выполнено" />
            <StatCard value={ready ? stats.remaining : '—'} label="осталось" />
            <StatCard
              value={ready && stats.averageProgress !== null ? `${stats.averageProgress}%` : '—'}
              label="ср. прогресс"
            />
            <StatCard
              value={
                ready && stats.productiveDay
                  ? formatWeekdayShort(parseISO(stats.productiveDay))
                  : '—'
              }
              label="лучший день"
            />
            <StatCard value={ready ? stats.goalsDone : '—'} label="вып. целей" />
          </div>

          <div ref={daysRef} className={styles.days}>
            {DAYS.map((offset) => {
              const date = shiftDate(weekStart, offset)
              return ready ? (
                <DayCard
                  key={date}
                  date={date}
                  isToday={date === today}
                  tasks={tasks.filter((task) => task.date === date)}
                />
              ) : (
                <div key={date} className={styles.daySkeleton}>
                  <Skeleton width={40} />
                  <div className={styles.donutSkeleton}>
                    <Skeleton width={150} height={150} round />
                  </div>
                  <ListSkeleton rows={2} />
                </div>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className={styles.listSkeleton}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={styles.rowSkeleton}>
          <Skeleton width={32} height={32} round />
          <Skeleton width={`${60 - index * 12}%`} />
        </div>
      ))}
    </div>
  )
}
