import { parseISO } from 'date-fns'
import { useState } from 'react'
import { Button } from '../../components/Button'
import { Calendar } from '../../components/Calendar'
import { Dropdown } from '../../components/Dropdown'
import { Input } from '../../components/Input'
import { Modal } from '../../components/Modal'
import { ITEM_TITLE_MAX_LENGTH } from '../../lib/constants'
import type { Repeat } from '../../data/types'
import { formatDayMonth } from '../../lib/dates'
import { REPEAT_OPTIONS } from '../../lib/repeat'

type Props = {
  today: string
  onClose: () => void
  /** Можно ли поставить задаче повтор. */
  canRepeat: boolean
  onAdd: (date: string, title: string, repeat?: Repeat) => void
}

/** Модалка «Добавить задачу»: задача на любой день, неделю для этого создавать не нужно. */
export function AddTaskModal({ today, canRepeat, onClose, onAdd }: Props) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(today)
  const [error, setError] = useState<string>()
  const [repeat, setRepeat] = useState<Repeat | 'none'>('none')

  const submit = () => {
    const trimmed = title.trim()
    if (!trimmed) {
      setError('Напиши, что нужно сделать')
      return
    }
    onAdd(date, trimmed, repeat === 'none' ? undefined : repeat)
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
          <Button onClick={submit}>
            {/* У повторяющейся задачи выбранный день: это день, с которого она начинается. */}
            Добавить {repeat === 'none' ? 'на' : 'с'} {formatDayMonth(parseISO(date))}
          </Button>
        </>
      }
    >
      <Input
        label="Что нужно сделать"
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
      {canRepeat && (
        <Dropdown
          label="Повтор"
          aria-label="Повтор"
          value={repeat}
          onChange={setRepeat}
          options={REPEAT_OPTIONS}
        />
      )}
      <Calendar mode="day" value={date} onChange={setDate} today={today} />
    </Modal>
  )
}
