import { Minus, Plus } from '@phosphor-icons/react'
import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../../components/Button'
import { Dropdown } from '../../components/Dropdown'
import { IconButton } from '../../components/IconButton'
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
}

const FREQUENCIES: Array<{ value: HabitFrequency; label: string }> = [
  { value: 'daily', label: 'Каждый день' },
  { value: 'days', label: 'По дням недели' },
  { value: 'weekly', label: 'Несколько раз в неделю' },
]

/**
 * Модалка «Добавить привычку» и «Изменить привычку»: название и как часто её отмечать.
 * При редактировании слева ещё «Архивировать».
 */
export function HabitModal({ habit, onClose, onSave, onArchive }: Props) {
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
        onArchive && (
          <Button variant="ghost" onClick={onArchive}>
            Архивировать
          </Button>
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
        <div className={styles.row}>
          <span>Как часто</span>
          <Dropdown
            aria-label="Как часто"
            size="md"
            value={frequency}
            onChange={setFrequency}
            options={FREQUENCIES}
          />
        </div>

        {frequency === 'days' && (
          <div className={styles.block}>
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
          <div className={styles.row}>
            <span>Сколько раз в неделю</span>
            <div className={styles.stepper}>
              <IconButton
                variant="secondary"
                icon={<Minus aria-hidden />}
                aria-label="Меньше"
                onClick={() => setTimes((current) => Math.max(1, current - 1))}
              />
              <span className={`t-heading-5 ${styles.times}`} aria-live="polite">
                {times}
                <span className="visually-hidden"> {pluralize(times, 'раз', 'раза', 'раз')}</span>
              </span>
              <IconButton
                variant="secondary"
                icon={<Plus aria-hidden />}
                aria-label="Больше"
                onClick={() => setTimes((current) => Math.min(6, current + 1))}
              />
            </div>
          </div>
        )}
      </form>
    </Modal>
  )
}
