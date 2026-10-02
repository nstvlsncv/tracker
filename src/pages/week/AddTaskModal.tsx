import { parseISO } from 'date-fns'
import { useState } from 'react'
import { Button } from '../../components/Button'
import { Calendar } from '../../components/Calendar'
import { Input } from '../../components/Input'
import { Modal } from '../../components/Modal'
import { ITEM_TITLE_MAX_LENGTH } from '../../lib/constants'
import { formatDayMonth } from '../../lib/dates'

type Props = {
  today: string
  onClose: () => void
  onAdd: (date: string, title: string) => void
}

/** Модалка «Добавить задачу»: задача на любой день, неделю для этого создавать не нужно. */
export function AddTaskModal({ today, onClose, onAdd }: Props) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(today)
  const [error, setError] = useState<string>()

  const submit = () => {
    const trimmed = title.trim()
    if (!trimmed) {
      setError('Напиши, что нужно сделать')
      return
    }
    onAdd(date, trimmed)
  }

  return (
    <Modal
      open
      title="Добавить задачу"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={submit}>Добавить на {formatDayMonth(parseISO(date))}</Button>
        </>
      }
    >
      <Input
        label="Что нужно сделать"
        hideLabel
        maxLength={ITEM_TITLE_MAX_LENGTH}
        value={title}
        error={error}
        onChange={(event) => {
          setTitle(event.target.value)
          setError(undefined)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') submit()
        }}
      />
      <Calendar mode="day" value={date} onChange={setDate} today={today} />
    </Modal>
  )
}
