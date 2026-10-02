import { parseISO } from 'date-fns'
import { AddItem } from '../../components/AddItem'
import { Donut } from '../../components/Donut'
import { ItemList } from '../../components/ItemList'
import type { Task } from '../../data/types'
import { usePlanner } from '../../data/usePlanner'
import { cx } from '../../lib/cx'
import { formatDayMonth, formatWeekdayShort } from '../../lib/dates'
import { progress } from '../../lib/metrics'
import styles from './DayCard.module.css'

type Props = {
  /** 'yyyy-MM-dd' */
  date: string
  tasks: Task[]
  isToday: boolean
}

/** Карточка дня на экране Недели: донат с процентом и список задач. */
export function DayCard({ date, tasks, isToday }: Props) {
  const { addTask, toggleTask, renameTask, deleteTask } = usePlanner()
  const day = parseISO(date)

  return (
    <article
      className={cx(styles.card, isToday && styles.today)}
      aria-label={formatDayMonth(day)}
      aria-current={isToday ? 'date' : undefined}
      data-date={date}
    >
      <header className={`t-heading-5 ${styles.header}`}>
        <span>{formatWeekdayShort(day)}</span>
        <span className={styles.number}>{day.getDate()}</span>
      </header>
      <div className={styles.donut}>
        {/* У дня без задач стоит 0%, а не прочерк. */}
        <Donut value={progress(tasks) ?? 0} size="xl" />
      </div>
      {tasks.length > 0 ? (
        <ItemList items={tasks} onToggle={toggleTask} onRename={renameTask} onDelete={deleteTask} />
      ) : (
        <p className={styles.empty}>Задач пока нет</p>
      )}
      <div>
        <AddItem label="Добавить задачу" onAdd={(title) => addTask(date, title)} />
      </div>
    </article>
  )
}
