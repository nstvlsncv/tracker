import { CaretDown, CaretUp, Fire, PencilSimple } from '@phosphor-icons/react'
import { parseISO } from 'date-fns'
import { useId } from 'react'
import { Checkbox } from '../../components/Checkbox'
import { IconButton } from '../../components/IconButton'
import { StatCard } from '../../components/StatCard'
import type { Habit } from '../../data/types'
import { cx } from '../../lib/cx'
import { toISODate } from '../../lib/dates'
import { bestStreak, currentStreak, formatDays, totalChecks } from '../../lib/metrics'
import { HabitHistory } from './HabitHistory'
import styles from './HabitCard.module.css'

type Props = {
  habit: Habit
  checks: ReadonlySet<string>
  today: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onToggle: (date: string, done: boolean) => void
  onEdit: () => void
}

/**
 * Карточка привычки. Свёрнутая: отметка за сегодня, название и серии. Нажатие на карточку
 * (кроме чекбокса) раскрывает её на месте: показатели и история за год.
 */
export function HabitCard({ habit, checks, today, open, onOpenChange, onToggle, onEdit }: Props) {
  const detailsId = useId()
  const doneToday = checks.has(today)
  const current = currentStreak(checks, today)
  const best = bestStreak(checks)
  const Caret = open ? CaretUp : CaretDown
  // С какого дня может быть история: создание привычки или более ранняя отметка задним числом.
  const since = [...checks, toISODate(parseISO(habit.createdAt))].sort()[0]

  return (
    <article className={styles.card}>
      <div className={styles.head} onClick={() => onOpenChange(!open)}>
        <Checkbox
          checked={doneToday}
          onChange={(done) => onToggle(today, done)}
          aria-label={doneToday ? `Снять отметку за сегодня: ${habit.title}` : `Отметить за сегодня: ${habit.title}`}
        />
        <div className={styles.text}>
          <div className={styles.titleRow}>
            {/* Сегодня выполнено: огонёк залит лаймом. Иначе контурный, серый. */}
            <Fire
              className={cx(styles.fire, doneToday && styles.lit)}
              weight={doneToday ? 'fill' : 'bold'}
              aria-hidden
            />
            {/* Кнопка, а не просто текст: так карточку можно раскрыть и с клавиатуры. */}
            <button
              type="button"
              className={cx('t-heading-5', styles.title, doneToday && styles.done)}
              aria-expanded={open}
              aria-controls={detailsId}
            >
              {habit.title}
            </button>
          </div>
          <span className={`t-body-md ${styles.streak}`}>
            {/* Две неразрывные части: на компьютере строка переносится только между ними. */}
            <span>текущая серия {formatDays(current)} ·</span> <span>лучшая {formatDays(best)}</span>
          </span>
        </div>
        {open && (
          <IconButton
            variant="secondary"
            icon={<PencilSimple aria-hidden />}
            aria-label={`Редактировать: ${habit.title}`}
            onClick={(event) => {
              event.stopPropagation()
              onEdit()
            }}
          />
        )}
        <Caret className={styles.caret} aria-hidden />
      </div>

      {open && (
        <div id={detailsId} className={styles.details}>
          <div className={styles.stats}>
            <StatCard variant="surface" value={current} label="текущая серия" />
            <StatCard variant="surface" value={best} label="лучшая серия" />
            <StatCard variant="surface" value={totalChecks(checks)} label="всего выполнено" />
            <StatCard variant="surface" value="Каждый день" label="цель" />
          </div>
          <HabitHistory checks={checks} today={today} since={since} onToggle={onToggle} />
        </div>
      )}
    </article>
  )
}
