import { Plus } from '@phosphor-icons/react'
import { parseISO } from 'date-fns'
import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { AddItem } from '../../components/AddItem'
import { Button } from '../../components/Button'
import { CalendarPicker } from '../../components/CalendarPicker'
import { ItemList } from '../../components/ItemList'
import { ListSkeleton } from '../../components/ListSkeleton'
import { Section } from '../../components/Section'
import { Skeleton } from '../../components/Skeleton'
import { StatCard } from '../../components/StatCard'
import { useToast } from '../../components/useToast'
import type { Repeat } from '../../data/types'
import { usePlanner } from '../../data/usePlanner'
import { PageHeader } from '../../layout/PageHeader'
import {
  formatDayMonth,
  formatWeekdayShort,
  formatWeekRange,
  parseWeekParam,
  toWeekParam,
  weekStartISO,
} from '../../lib/dates'
import { shiftDate, weekAnalytics } from '../../lib/metrics'
import { recall, remember } from '../../lib/sessionState'
import { NETWORK_ERROR_MESSAGE } from '../../lib/supabase'
import { useToday } from '../../lib/useToday'
import { AddTaskModal } from './AddTaskModal'
import { DayCard } from './DayCard'
import { WeekNote } from './WeekNote'
import styles from './Week.module.css'

const DAYS = [0, 1, 2, 3, 4, 5, 6]

export function Week() {
  const { isoWeek } = useParams()
  const navigate = useNavigate()
  const planner = usePlanner()
  const { loadWeek } = planner
  const daysRef = useRef<HTMLDivElement>(null)
  const toast = useToast()
  const [addingTask, setAddingTask] = useState(false)

  const today = useToday()
  const currentWeek = weekStartISO(today)
  // Адрес /week открывает текущую неделю, /week/2026-W38 конкретную.
  const weekStart = isoWeek ? parseWeekParam(isoWeek) : currentWeek
  const status = weekStart ? planner.weekStatus[weekStart] : undefined

  useEffect(() => {
    if (weekStart) loadWeek(weekStart)
  }, [weekStart, loadWeek])

  // Ряд дней открывается там, где его оставили. Если неделю ещё не листали,
  // текущая неделя открывается прокрученной к сегодняшнему дню.
  const daysScrollKey = `week.days.${weekStart}`
  useEffect(() => {
    const row = daysRef.current
    if (status !== 'ready' || !row) return
    const saved = recall<number>(daysScrollKey)
    const card = row.querySelector<HTMLElement>('[aria-current="date"]')
    if (saved !== undefined) row.scrollLeft = saved
    else if (weekStart === currentWeek && card) row.scrollLeft = card.offsetLeft - row.offsetLeft
  }, [status, weekStart, currentWeek, daysScrollKey])

  if (!weekStart) return <Navigate to=".." replace relative="path" />

  const tasks = planner.tasks.filter((task) => weekStartISO(task.date) === weekStart)
  const goals = planner.goals.filter((goal) => goal.weekStart === weekStart)

  const weekLabel = formatWeekRange(parseISO(weekStart), {
    year: !weekStart.startsWith(today.slice(0, 4)),
  })

  const goToWeek = (week: string) =>
    navigate(isoWeek ? `../${toWeekParam(week)}` : toWeekParam(week), { relative: 'path' })

  const addTask = (date: string, title: string, repeat?: Repeat) => {
    planner.addTask(date, title, repeat)
    setAddingTask(false)
    const week = weekStartISO(date)
    toast({
      message: `Задача добавлена на ${formatDayMonth(parseISO(date))}`,
      // Если задача попала в другую неделю, из тоста можно сразу перейти к ней.
      action: week === weekStart ? undefined : { label: 'Открыть', onClick: () => goToWeek(week) },
    })
  }

  const stats = weekAnalytics(tasks, goals, weekStart, today)
  const ready = status === 'ready'

  return (
    <>
      <PageHeader
        title="Неделя"
        actions={
          <>
            <Button
              variant="secondary"
              size="lg"
              icon={<Plus aria-hidden />}
              // На телефоне от кнопки остаётся квадрат с плюсом (см. PageHeader), подпись скрыта.
              data-compact
              aria-label="Добавить задачу"
              onClick={() => setAddingTask(true)}
            >
              <span data-label>Добавить задачу</span>
            </Button>
            <CalendarPicker
              aria-label="Неделя"
              mode="week"
              variant="main"
              align="end"
              value={weekStart}
              label={weekLabel}
              today={today}
              markedWeeks={planner.weeksWithData}
              onChange={goToWeek}
              footer={
                weekStart !== currentWeek && (
                  <Button variant="ghost" fullWidth onClick={() => goToWeek(currentWeek)}>
                    Текущая неделя
                  </Button>
                )
              }
            />
          </>
        }
      />

      {addingTask && (
        <AddTaskModal
          today={today}
          canRepeat={planner.canRepeat}
          onClose={() => setAddingTask(false)}
          onAdd={addTask}
        />
      )}

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
                burst
                onToggle={planner.toggleGoal}
                onRename={planner.renameGoal}
                onDelete={planner.deleteGoal}
              />
            ) : (
              <p className={styles.placeholder}>Поставь 1–3 цели на неделю</p>
            )}
            {ready ? (
              <AddItem label="Добавить цель" onAdd={(title) => planner.addGoal(weekStart, title)} />
            ) : (
              <Skeleton width={160} height={40} />
            )}
          </Section>

          <div
            ref={daysRef}
            className={styles.days}
            onScroll={(event) => remember(daysScrollKey, event.currentTarget.scrollLeft)}
          >
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
                  <Skeleton width={180} height={40} />
                </div>
              )
            })}
          </div>

          {/* Заметка появляется, когда неделя загружена и в базе есть место для заметок. */}
          {ready && planner.notes && <WeekNote key={weekStart} weekStart={weekStart} />}

          <div className={styles.stats}>
            <StatCard loading={!ready} value={stats.total} label="всего задач" />
            <StatCard loading={!ready} value={stats.done} label="выполнено" />
            <StatCard loading={!ready} value={stats.remaining} label="осталось" />
            <StatCard
              loading={!ready}
              value={stats.averageProgress !== null ? `${stats.averageProgress}%` : '—'}
              label="ср. прогресс"
            />
            <StatCard
              loading={!ready}
              value={
                stats.productiveDay ? formatWeekdayShort(parseISO(stats.productiveDay)) : '—'
              }
              label="лучший день"
            />
            <StatCard loading={!ready} value={stats.goalsDone} label="вып. целей" />
          </div>
        </>
      )}
    </>
  )
}
