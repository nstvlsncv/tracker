import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Modal } from '../../components/Modal'
import type { Habit } from '../../data/types'
import { HABIT_TITLE_MAX_LENGTH } from '../../lib/constants'

type Props = {
  /** Привычка, которую редактируют. Без неё модалка создаёт новую. */
  habit?: Habit
  onClose: () => void
  onSave: (title: string) => void
  /** Убрать в архив (только при редактировании). */
  onArchive?: () => void
}

/** Модалка «Добавить привычку» и «Изменить привычку»: название, а при редактировании ещё архив. */
export function HabitModal({ habit, onClose, onSave, onArchive }: Props) {
  const formId = useId()
  const [title, setTitle] = useState(habit?.title ?? '')
  const [error, setError] = useState<string>()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return setError('Напиши, какую привычку заводим')
    onSave(trimmed)
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
      <form id={formId} onSubmit={submit} noValidate>
        <Input
          label="Название"
          maxLength={HABIT_TITLE_MAX_LENGTH}
          value={title}
          error={error}
          hint="Цель пока одна: отмечать каждый день"
          onChange={(event) => {
            setTitle(event.target.value)
            setError(undefined)
          }}
        />
      </form>
    </Modal>
  )
}
