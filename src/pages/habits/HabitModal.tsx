import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../../components/Button'
import { Dropdown } from '../../components/Dropdown'
import { Input } from '../../components/Input'
import { Modal } from '../../components/Modal'
import type { Habit, HabitFrequency, HabitSchedule } from '../../data/types'
import { HABIT_TITLE_MAX_LENGTH } from '../../lib/constants'
import { cx } from '../../lib/cx'
import { WEEKDAY_LABELS } from '../../lib/habits'
import { pluralize } from '../../lib/metrics'
import styles from './HabitModal.module.css'

type Props = {
  /** Привычка, которую редактируют. Без неё модалка создаёт новую. */
  habit?: Habit
  onClose: () => void
  onSave: (title: string, schedule: HabitSchedule) => void
  /** Убрать в архив (только при редактировании). */
  onArchive?: () => void
  /** Поставить на паузу или снять с неё (только при редактировании). */
  onPause?: () => void
  /** Привычка сейчас на паузе: кнопка предлагает её снять. */
  paused?: boolean
}

const FREQUENCIES: Array<{ value: HabitFrequency; label: string }> = [
  { value: 'daily', label: 'Каждый день' },
  { value: 'days', label: 'По дням недели' },
  { value: 'weekly', label: 'Несколько раз в неделю' },
]

const TIMES = [1, 2, 3, 4, 5, 6].map((count) => ({
  value: String(count),
  label: `${count} ${pluralize(count, 'раз', 'раза', 'раз')}`,
}))

/**
 * Модалка «Добавить привычку» и «Изменить привычку»: название и как часто её отмечать.
 * При редактировании слева ещё «Архивировать» и «На паузу».
 */
export function HabitModal({ habit, onClose, onSave, onArchive, onPause, paused }: Props) {
  const formId = useId()
  const [title, setTitle] = useState(habit?.title ?? '')
  const [frequency, setFrequency] = useState<HabitFrequency>(habit?.frequency ?? 'daily')
  const [days, setDays] = useState<number[]>(habit?.days ?? [])
  const [times, setTimes] = useState(habit?.timesPerWeek ?? 3)
  const [error, setError] = useState<string>()
  const [daysError, setDaysError] = useState(false)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return setError('Напиши, какую привычку заводим')
    if (frequency === 'days' && days.length === 0) return setDaysError(true)
    onSave(trimmed, {
      frequency,
      days: frequency === 'days' ? [...days].sort() : [],
      timesPerWeek: frequency === 'weekly' ? times : null,
    })
  }

  const toggleDay = (day: number) => {
    setDaysError(false)
    setDays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day],
    )
  }

  return (
    <Modal
      open
      title={habit ? 'Изменить привычку' : 'Добавить привычку'}
      onClose={onClose}
      footerStart={
        (onArchive || onPause) && (
          <>
            {onArchive && (
              <Button variant="ghost" onClick={onArchive}>
                Архивировать
              </Button>
            )}
            {/* Пауза: отпуск или болезнь. Дни паузы не ждут отметки и не рвут серию. */}
            {onPause && (
              <Button variant="ghost" onClick={onPause}>
                {paused ? 'Снять с паузы' : 'На паузу'}
              </Button>
            )}
          </>
        )
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" form={formId}>
            {habit ? 'Сохранить' : 'Добавить'}
          </Button>
        </>
      }
    >
      <form id={formId} className={styles.form} onSubmit={submit} noValidate>
        <Input
          label="Название"
          maxLength={HABIT_TITLE_MAX_LENGTH}
          value={title}
          error={error}
          onChange={(event) => {
            setTitle(event.target.value)
            setError(undefined)
          }}
        />
        <Dropdown
          label="Как часто"
          aria-label="Как часто"
          value={frequency}
          onChange={setFrequency}
          options={FREQUENCIES}
        />

        {frequency === 'days' && (
          <div className={styles.block}>
            <span className={`t-caption ${styles.label}`} aria-hidden>
              Дни недели
            </span>
            <div className={styles.days} role="group" aria-label="Дни недели">
              {WEEKDAY_LABELS.map((label, index) => {
                const day = index + 1
                const selected = days.includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={selected}
                    className={cx('t-button', styles.day, selected && styles.selected)}
                    onClick={() => toggleDay(day)}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            {daysError && (
              <p className={`t-body-sm ${styles.problem}`} role="alert">
                Выбери хотя бы один день
              </p>
            )}
          </div>
        )}

        {frequency === 'weekly' && (
          <Dropdown
            label="Сколько раз в неделю"
            aria-label="Сколько раз в неделю"
            value={String(times)}
            onChange={(value) => setTimes(Number(value))}
            options={TIMES}
          />
        )}
      </form>
    </Modal>
  )
}
