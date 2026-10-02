import { Plus } from '@phosphor-icons/react'
import { parseISO } from 'date-fns'
import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { AddItemField } from '../../components/AddItem'
import { CalendarPicker } from '../../components/CalendarPicker'
import { Checkbox } from '../../components/Checkbox'
import { IconButton } from '../../components/IconButton'
import { ItemList } from '../../components/ItemList'
import { ListSkeleton } from '../../components/ListSkeleton'
import { Section } from '../../components/Section'
import { StatCard } from '../../components/StatCard'
import { useToast } from '../../components/useToast'
import { useHabits } from '../../data/useHabits'
import { usePlanner } from '../../data/usePlanner'
import { cx } from '../../lib/cx'
import {
  formatDayMonth,
  formatDayShort,
  formatWeekdayAndDay,
  formatWeekRangeShort,
  weekStartISO,
} from '../../lib/dates'
import { countDone, currentStreak, formatDays, greeting, progress } from '../../lib/metrics'
import { useSessionState } from '../../lib/sessionState'
import { useNow } from '../../lib/useNow'
import { useToday } from '../../lib/useToday'
import { HabitModal } from '../habits/HabitModal'
import styles from './Home.module.css'

const NO_CHECKS: ReadonlySet<string> = new Set()

/**
 * Главная: где я сегодня и что осталось сделать. Сверху приветствие и показатели дня,
 * ниже цели недели, задачи и привычки. Данные те же, что на Неделе и в Привычках:
 * отметка здесь сразу видна там, и наоборот.
 */
export function Home() {
  const { profile } = useAuth()
  const planner = usePlanner()
  const habitsStore = useHabits()
  const toast = useToast()
  const now = useNow()
  const today = useToday()
  const currentWeek = weekStartISO(today)
  const { loadWeek } = planner

  // В каждой секции можно посмотреть другую неделю или день. null: «следить за сегодняшним».
  const [pickedWeek, setPickedWeek] = useSessionState<string | null>('home.goalsWeek', null)
  const [pickedTaskDate, setPickedTaskDate] = useSessionState<string | null>('home.tasksDate', null)
  const [pickedHabitDate, setPickedHabitDate] = useSessionState<string | null>('home.habitsDate', null)
  // Что сейчас добавляют: цель и задача вписываются в поле под списком, привычка в модалке.
  const [adding, setAdding] = useState<'goal' | 'task' | 'habit'>()

  const goalsWeek = pickedWeek ?? currentWeek
  const tasksDate = pickedTaskDate ?? today
  const habitsDate = pickedHabitDate ?? today
  const tasksWeek = weekStartISO(tasksDate)

  useEffect(() => {
    loadWeek(currentWeek)
    loadWeek(goalsWeek)
    loadWeek(tasksWeek)
  }, [loadWeek, currentWeek, goalsWeek, tasksWeek])

  const ready = (week: string) => planner.weekStatus[week] === 'ready'
  const habitsReady = habitsStore.status === 'ready'
  const checksOf = (id: string) => habitsStore.checks[id] ?? NO_CHECKS

  // Показатели всегда про сегодня и текущую неделю, что бы ни было выбрано в секциях ниже.
  const todayTasks = planner.tasks.filter((task) => task.date === today)
  const weekGoals = planner.goals.filter((goal) => goal.weekStart === currentWeek)
  const habitsDoneToday = habitsStore.habits.filter((habit) => checksOf(habit.id).has(today)).length

  const goals = planner.goals.filter((goal) => goal.weekStart === goalsWeek)
  const tasks = planner.tasks.filter((task) => task.date === tasksDate)
  // Не выполненные в выбранный день сверху, как в списках задач.
  const habits = [...habitsStore.habits].sort(
    (a, b) => Number(checksOf(a.id).has(habitsDate)) - Number(checksOf(b.id).has(habitsDate)),
  )

  const dayTitle = (date: string, todayTitle: string, otherTitle: string) =>
    date === today ? todayTitle : `${otherTitle} ${formatDayMonth(parseISO(date))}`

  const day = formatWeekdayAndDay(now)
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')

  /** Справа в заголовке секции: выбор недели или дня и кнопка с плюсом, между ними 8px. */
  const sectionActions = (picker: React.ReactNode, label: string, kind: 'goal' | 'task' | 'habit') => (
    <div className={styles.actions}>
      {picker}
      <IconButton
        variant="secondary"
        size="sm"
        icon={<Plus aria-hidden />}
        aria-label={label}
        onClick={() => setAdding(kind)}
      />
    </div>
  )

  return (
    <>
      <header className={styles.header}>
        <p className={`t-heading-1 ${styles.title}`}>
          {greeting(now.getHours())}
          {profile?.name ? `, ${profile.name}` : ''}
        </p>
        <h1 className={`t-heading-1 ${styles.title}`} aria-label={`Сегодня ${day} · ${hours}:${minutes}`}>
          <span aria-hidden>
            Сегодня {day} · {hours}
            {/* Двоеточие мигает раз в секунду, как на настоящих часах. */}
            <span className={styles.colon}>:</span>
            {minutes}
          </span>
        </h1>
      </header>

      <div className={styles.stats}>
        <StatCard
          variant="highlight"
          loading={!ready(currentWeek)}
          // День без задач показывает 0%, как на Неделе.
          value={`${progress(todayTasks) ?? 0}%`}
          label="прогресс дня"
        />
        <StatCard
          loading={!ready(currentWeek)}
          value={`${countDone(weekGoals)}/${weekGoals.length}`}
          label="цели недели"
        />
        <StatCard
          loading={!ready(currentWeek)}
          value={`${countDone(todayTasks)}/${todayTasks.length}`}
          label="задачи сегодня"
        />
        <StatCard
          loading={!habitsReady}
          value={`${habitsDoneToday}/${habitsStore.habits.length}`}
          label="привычки сегодня"
        />
      </div>

      <Section
        title="Цели недели"
        action={sectionActions(
          <CalendarPicker
            aria-label="Неделя целей"
            mode="week"
            size="sm"
            align="end"
            value={goalsWeek}
            label={formatWeekRangeShort(parseISO(goalsWeek))}
            today={today}
            markedWeeks={planner.weeksWithData}
            onChange={(week) => setPickedWeek(week === currentWeek ? null : week)}
          />,
          'Добавить цель',
          'goal',
        )}
      >
        {!ready(goalsWeek) ? (
          <ListSkeleton rows={3} />
        ) : goals.length > 0 ? (
          <ItemList
            items={goals}
            onToggle={planner.toggleGoal}
            onRename={planner.renameGoal}
            onDelete={planner.deleteGoal}
          />
        ) : (
          adding !== 'goal' && <p className={styles.placeholder}>Поставь 1–3 цели на неделю</p>
        )}
        {adding === 'goal' && (
          <AddItemField
            label="Добавить цель"
            onAdd={(title) => planner.addGoal(goalsWeek, title)}
            onClose={() => setAdding(undefined)}
          />
        )}
      </Section>

      <Section
        title={dayTitle(tasksDate, 'Задачи на сегодня', 'Задачи на')}
        action={sectionActions(
          <CalendarPicker
            aria-label="День задач"
            mode="day"
            size="sm"
            align="end"
            value={tasksDate}
            label={formatDayShort(parseISO(tasksDate))}
            today={today}
            onChange={(date) => setPickedTaskDate(date === today ? null : date)}
          />,
          'Добавить задачу',
          'task',
        )}
      >
        {!ready(tasksWeek) ? (
          <ListSkeleton rows={3} />
        ) : tasks.length > 0 ? (
          <ItemList
            items={tasks}
            onToggle={planner.toggleTask}
            onRename={planner.renameTask}
            onDelete={planner.deleteTask}
          />
        ) : (
          adding !== 'task' && <p className={styles.placeholder}>Задач пока нет</p>
        )}
        {adding === 'task' && (
          <AddItemField
            label="Добавить задачу"
            onAdd={(title) => planner.addTask(tasksDate, title)}
            onClose={() => setAdding(undefined)}
          />
        )}
      </Section>

      <Section
        title={dayTitle(habitsDate, 'Привычки сегодня', 'Привычки за')}
        action={sectionActions(
          <CalendarPicker
            aria-label="День привычек"
            mode="day"
            size="sm"
            align="end"
            value={habitsDate}
            label={formatDayShort(parseISO(habitsDate))}
            today={today}
            // Отмечать привычки наперёд нельзя: будущий день возвращает к сегодняшнему.
            onChange={(date) => setPickedHabitDate(date >= today ? null : date)}
          />,
          'Добавить привычку',
          'habit',
        )}
      >
        {!habitsReady ? (
          <ListSkeleton rows={3} />
        ) : habits.length > 0 ? (
          <ul className={styles.habits}>
            {habits.map((habit) => {
              const checks = checksOf(habit.id)
              const done = checks.has(habitsDate)
              return (
                <li key={habit.id} className={styles.habit}>
                  <Checkbox
                    checked={done}
                    onChange={(next) => habitsStore.toggleCheck(habit.id, habitsDate, next)}
                    aria-label={done ? `Снять отметку: ${habit.title}` : `Отметить: ${habit.title}`}
                  />
                  <span className={cx(styles.habitTitle, done && styles.done)}>{habit.title}</span>
                  <span className={`t-body-sm ${styles.streak}`}>
                    {formatDays(currentStreak(checks, today))}
                  </span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className={styles.placeholder}>Привычек пока нет</p>
        )}
      </Section>

      {adding === 'habit' && (
        <HabitModal
          onClose={() => setAdding(undefined)}
          onSave={(title) => {
            habitsStore.addHabit(title)
            toast({ message: 'Привычка добавлена' })
            setAdding(undefined)
          }}
        />
      )}
    </>
  )
}
