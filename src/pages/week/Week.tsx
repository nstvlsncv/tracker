import { Plus } from '@phosphor-icons/react'
import { parseISO } from 'date-fns'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { AddItem } from '../../components/AddItem'
import { Button } from '../../components/Button'
import { CalendarPicker } from '../../components/CalendarPicker'
import { ItemList } from '../../components/ItemList'
import { PageLoader } from '../../components/PageLoader'
import { Section } from '../../components/Section'
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

// Телефон: дни листаются лентой, а заметка стоит под ней. На экранах шире дни стоят сеткой,
// и заметка занимает в ней свободное место после воскресенья.
const PHONE = '(max-width: 640px)'
function subscribePhone(onChange: () => void) {
  const query = window.matchMedia(PHONE)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}
const isPhone = () => window.matchMedia(PHONE).matches

export function Week() {
  const { isoWeek } = useParams()
  const navigate = useNavigate()
  const planner = usePlanner()
  const { loadWeek } = planner
  const daysRef = useRef<HTMLDivElement>(null)
  const toast = useToast()
  const [addingTask, setAddingTask] = useState(false)
  const phone = useSyncExternalStore(subscribePhone, isPhone)

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
  // Заметка появляется, когда неделя загружена и в базе есть место для заметок.
  const note = planner.notes && <WeekNote key={weekStart} weekStart={weekStart} />
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
      ) : !ready ? (
        <PageLoader />
      ) : (
        <>
          <Section title="Цели недели">
            {goals.length > 0 ? (
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
            <AddItem label="Добавить цель" onAdd={(title) => planner.addGoal(weekStart, title)} />
          </Section>

          {/* Обёртка нужна сетке: число столбцов зависит от её ширины, а не от ширины окна. */}
          <div className={styles.board}>
            <div
              ref={daysRef}
              className={styles.days}
              onScroll={(event) => remember(daysScrollKey, event.currentTarget.scrollLeft)}
            >
              {DAYS.map((offset) => {
                const date = shiftDate(weekStart, offset)
                return (
                  <DayCard
                    key={date}
                    date={date}
                    isToday={date === today}
                    tasks={tasks.filter((task) => task.date === date)}
                  />
                )
              })}
              {!phone && note && <div className={styles.noteCell}>{note}</div>}
            </div>
          </div>

          {phone && note}

          <div className={styles.stats}>
            <StatCard value={stats.total} label="всего задач" />
            <StatCard value={stats.done} label="выполнено" />
            <StatCard value={stats.remaining} label="осталось" />
            <StatCard
             
              value={stats.averageProgress !== null ? `${stats.averageProgress}%` : '—'}
              label="ср. прогресс"
            />
            <StatCard
             
              value={
                stats.productiveDay ? formatWeekdayShort(parseISO(stats.productiveDay)) : '—'
              }
              label="лучший день"
            />
            <StatCard value={stats.goalsDone} label="вып. целей" />
          </div>
        </>
      )}
    </>
  )
}
