import { ArrowDown, ArrowUp, CaretDown, CaretUp, PencilSimple } from '@phosphor-icons/react'
import { parseISO } from 'date-fns'
import { useId } from 'react'
import { Button } from '../../components/Button'
import { Checkbox } from '../../components/Checkbox'
import { Collapse } from '../../components/Collapse'
import { IconButton } from '../../components/IconButton'
import { StatCard } from '../../components/StatCard'
import type { Habit } from '../../data/types'
import { cx } from '../../lib/cx'
import { formatDayMonth, toISODate } from '../../lib/dates'
import {
  checkBlock,
  currentPause,
  formatStreak,
  habitStreaks,
  scheduleLabel,
  scheduleOf,
} from '../../lib/habits'
import { totalChecks } from '../../lib/metrics'
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
  /** Этой отметкой закрыты все привычки дня: чекбокс празднует. */
  celebrate?: boolean
  /** Поднять или опустить привычку в списке. Нет функции: двигать в эту сторону некуда. */
  onMoveUp?: () => void
  onMoveDown?: () => void
}

/**
 * Карточка привычки. Свёрнутая: отметка за сегодня, название и серии. Нажатие на карточку
 * (кроме чекбокса) раскрывает её на месте: показатели и история за год.
 */
export function HabitCard({
  habit,
  checks,
  today,
  open,
  onOpenChange,
  onToggle,
  onEdit,
  celebrate,
  onMoveUp,
  onMoveDown,
}: Props) {
  const detailsId = useId()
  const doneToday = checks.has(today)
  const schedule = scheduleOf(habit)
  const { current, best } = habitStreaks(schedule, checks, today)
  const pause = currentPause(schedule, today)
  // У привычек «N раз в неделю» серия считается в неделях: подпись говорит об этом прямо.
  const weeks = current.unit === 'weeks'
  const Caret = open ? CaretUp : CaretDown
  // С какого дня может быть история: создание привычки или более ранняя отметка задним числом.
  const since = [...checks, toISODate(parseISO(habit.createdAt))].sort()[0]

  return (
    <article className={styles.card}>
      <div className={styles.head} onClick={() => onOpenChange(!open)}>
        <Checkbox
          checked={doneToday}
          // Не свой день или норма недели набрана: отметить нельзя, нажатие объяснит почему.
          locked={checkBlock(schedule, checks, today) !== null}
          burst
          celebrate={celebrate}
          onChange={(done) => onToggle(today, done)}
          aria-label={doneToday ? `Снять отметку за сегодня: ${habit.title}` : `Отметить за сегодня: ${habit.title}`}
        />
        <div className={styles.text}>
          {/* Кнопка, а не просто текст: так карточку можно раскрыть и с клавиатуры. */}
          <button
            type="button"
            className={cx('t-heading-5', styles.title, doneToday && styles.done)}
            aria-expanded={open}
            aria-controls={detailsId}
          >
            {habit.title}
          </button>
          <span className={`t-body-md ${styles.streak}`}>
            {/* Неразрывные части: на компьютере строка переносится только между ними. */}
            {/* На паузе вместо расписания стоит, с какого дня она идёт. */}
            <span>
              {pause
                ? `На паузе с ${formatDayMonth(parseISO(pause.from))}`
                : scheduleLabel(schedule)}{' '}
              ·
            </span>{' '}
            <span>текущая серия {formatStreak(current)} ·</span>{' '}
            <span>лучшая {formatStreak(best)}</span>
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

      <Collapse open={open}>
        <div id={detailsId} className={styles.details}>
          <div className={styles.stats}>
            <StatCard
              variant="surface"
              value={current.value}
              label={weeks ? 'серия, недель' : 'текущая серия'}
            />
            <StatCard
              variant="surface"
              value={best.value}
              label={weeks ? 'лучшая, недель' : 'лучшая серия'}
            />
            <StatCard variant="surface" value={totalChecks(checks)} label="всего выполнено" />
            <StatCard variant="surface" value={scheduleLabel(schedule)} label="цель" />
          </div>
          <HabitHistory
            habitId={habit.id}
            checks={checks}
            schedule={schedule}
            today={today}
            since={since}
            onToggle={onToggle}
          />
          {(onMoveUp || onMoveDown) && (
            <div className={styles.order}>
              <span className={styles.orderLabel}>Место в списке</span>
              {onMoveUp && (
                <Button variant="ghost" size="sm" icon={<ArrowUp aria-hidden />} onClick={onMoveUp}>
                  Выше
                </Button>
              )}
              {onMoveDown && (
                <Button variant="ghost" size="sm" icon={<ArrowDown aria-hidden />} onClick={onMoveDown}>
                  Ниже
                </Button>
              )}
            </div>
          )}
        </div>
      </Collapse>
    </article>
  )
}
