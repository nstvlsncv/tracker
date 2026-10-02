import { parseISO } from 'date-fns'
import { useState } from 'react'
import { Button } from '../../components/Button'
import { Calendar } from '../../components/Calendar'
import { Modal } from '../../components/Modal'
import { formatWeekRange } from '../../lib/dates'
import styles from './modals.module.css'

type Props = {
  /** Неделя, выбранная при открытии. */
  initialWeek: string
  today: string
  onClose: () => void
  onAdd: (weekStart: string) => void
}

/** Модалка «Добавить неделю»: в календаре выбирается неделя целиком. */
export function AddWeekModal({ initialWeek, today, onClose, onAdd }: Props) {
  const [week, setWeek] = useState(initialWeek)

  return (
    <Modal
      open
      title="Добавить неделю"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={() => onAdd(week)}>Добавить</Button>
        </>
      }
    >
      <p>Выбери неделю в календаре</p>
      <Calendar mode="week" value={week} onChange={setWeek} today={today} />
      <p className={`t-button ${styles.summary}`}>{formatWeekRange(parseISO(week))}</p>
    </Modal>
  )
}
