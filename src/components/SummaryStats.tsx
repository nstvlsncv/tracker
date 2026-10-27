import { StatCard } from './StatCard'
import styles from './SummaryStats.module.css'

type Count = { done: number; total: number }

type Props = {
  /** Доля выполненных задач, 0–100. День или неделя без задач показывают 0%. */
  progress: number
  goals: Count
  tasks: Count
  habits: Count
}

/**
 * Четыре показателя в ряд: прогресс (акцентная карточка), цели, задачи, привычки.
 * Один и тот же ряд на Главной (про сегодня) и на Неделе (про неделю): одинаковые карточки
 * с одинаковыми подписями, меняется только период. Когда прогресс доходит до 100% на глазах,
 * карточка празднует.
 */
export function SummaryStats({ progress, goals, tasks, habits }: Props) {
  const count = ({ done, total }: Count) => `${done}/${total}`
  return (
    <div className={styles.stats}>
      <StatCard variant="highlight" value={`${progress}%`} label="прогресс" celebrate={progress === 100} />
      <StatCard value={count(goals)} label="цели" />
      <StatCard value={count(tasks)} label="задачи" />
      <StatCard value={count(habits)} label="привычки" />
    </div>
  )
}
