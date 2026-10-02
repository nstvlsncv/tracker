import { Plus } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { AddItemField } from '../../components/AddItem'
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
import { formatWeekdayAndDay, weekStartISO } from '../../lib/dates'
import { countDone, currentStreak, formatDays, greeting, progress } from '../../lib/metrics'
import { useNow } from '../../lib/useNow'
import { useToday } from '../../lib/useToday'
import { HabitModal } from '../habits/HabitModal'
import styles from './Home.module.css'

const NO_CHECKS: ReadonlySet<string> = new Set()

/**
 * Главная: где я сегодня и что осталось сделать. Сверху приветствие и показатели дня,
 * ниже цели недели, задачи и привычки. На телефоне и на компьютере экран один и тот же:
 * тот же состав и порядок, меняются только размеры. Данные те же, что на Неделе и в Привычках:
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

  // Что сейчас добавляют: цель и задача вписываются в поле под списком, привычка в модалке.
  const [adding, setAdding] = useState<'goal' | 'task' | 'habit'>()

  useEffect(() => {
    loadWeek(currentWeek)
  }, [loadWeek, currentWeek])

  const ready = planner.weekStatus[currentWeek] === 'ready'
  const habitsReady = habitsStore.status === 'ready'
  const checksOf = (id: string) => habitsStore.checks[id] ?? NO_CHECKS

  const tasks = planner.tasks.filter((task) => task.date === today)
  const goals = planner.goals.filter((goal) => goal.weekStart === currentWeek)
  const habitsDoneToday = habitsStore.habits.filter((habit) => checksOf(habit.id).has(today)).length
  // Не выполненные сегодня сверху, как в списках задач.
  const habits = [...habitsStore.habits].sort(
    (a, b) => Number(checksOf(a.id).has(today)) - Number(checksOf(b.id).has(today)),
  )

  const day = formatWeekdayAndDay(now)
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')

  /** Справа в заголовке секции: маленькая кнопка с плюсом. */
  const addButton = (label: string, kind: 'goal' | 'task' | 'habit') => (
    <IconButton
      variant="secondary"
      size="sm"
      icon={<Plus aria-hidden />}
      aria-label={label}
      onClick={() => setAdding(kind)}
    />
  )

  return (
    <>
      <header className={styles.header}>
        <h1 className={`t-heading-1 ${styles.title}`}>
          {greeting(now.getHours())}
          {profile?.name ? `, ${profile.name}` : ''}!
        </h1>
        <p className={`t-body-lg ${styles.date}`} aria-label={`${day} · ${hours}:${minutes}`}>
          <span aria-hidden>
            {day} · {hours}
            {/* Двоеточие мигает раз в секунду, как на настоящих часах. */}
            <span className={styles.colon}>:</span>
            {minutes}
          </span>
        </p>
      </header>

      <div className={styles.stats}>
        <StatCard
          variant="highlight"
          loading={!ready}
          // День без задач показывает 0%, как на Неделе.
          value={`${progress(tasks) ?? 0}%`}
          label="прогресс"
        />
        <StatCard
          loading={!ready}
          value={`${countDone(goals)}/${goals.length}`}
          label="цели"
        />
        <StatCard
          loading={!ready}
          value={`${countDone(tasks)}/${tasks.length}`}
          label="задачи"
        />
        <StatCard
          loading={!habitsReady}
          value={`${habitsDoneToday}/${habitsStore.habits.length}`}
          label="привычки"
        />
      </div>

      <Section
        title="Цели недели"
        action={addButton('Добавить цель', 'goal')}
      >
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
          adding !== 'goal' && <p className={styles.placeholder}>Поставь 1–3 цели на неделю</p>
        )}
        {adding === 'goal' && (
          <AddItemField
            label="Добавить цель"
            onAdd={(title) => planner.addGoal(currentWeek, title)}
            onClose={() => setAdding(undefined)}
          />
        )}
      </Section>

      <Section
        title="Задачи на сегодня"
        action={addButton('Добавить задачу', 'task')}
      >
        {!ready ? (
          <ListSkeleton rows={3} />
        ) : tasks.length > 0 ? (
          <ItemList
            items={tasks}
            onToggle={planner.toggleTask}
            onRename={planner.renameTask}
            onDelete={planner.deleteTask}
          />
        ) : (
          adding !== 'task' && <p className={styles.placeholder}>На сегодня пока свободно</p>
        )}
        {adding === 'task' && (
          <AddItemField
            label="Добавить задачу"
            onAdd={(title) => planner.addTask(today, title)}
            onClose={() => setAdding(undefined)}
          />
        )}
      </Section>

      <Section
        title="Привычки сегодня"
        action={addButton('Добавить привычку', 'habit')}
      >
        {!habitsReady ? (
          <ListSkeleton rows={3} />
        ) : habits.length > 0 ? (
          <ul className={styles.habits}>
            {habits.map((habit) => {
              const checks = checksOf(habit.id)
              const done = checks.has(today)
              return (
                <li key={habit.id} className={styles.habit}>
                  <Checkbox
                    checked={done}
                    onChange={(next) => habitsStore.toggleCheck(habit.id, today, next)}
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
          <p className={styles.placeholder}>Начни с одной привычки, остальные подтянутся</p>
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
