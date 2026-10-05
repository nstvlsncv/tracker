import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useState } from 'react'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import type { FinanceStage } from '../../data/finance'
import { cx } from '../../lib/cx'
import styles from './Finance.module.css'

type Props = {
  stage: FinanceStage
  /** Число, которое действует сейчас. */
  day: number
  /** Месяц, который открыт на экране: новое число действует с него. */
  month: string
  onClose: () => void
  onSave: (day: number) => void
}

const DAYS = Array.from({ length: 31 }, (_, index) => index + 1)
const TITLES: Record<FinanceStage, string> = {
  advance: 'Когда приходит аванс',
  salary: 'Когда приходит зарплата',
}

/** Модалка с числом месяца, в которое приходят деньги этапа: от него считается период. */
export function DayModal({ stage, day, month, onClose, onSave }: Props) {
  const [selected, setSelected] = useState(day)

  return (
    <Modal
      open
      title={TITLES[stage]}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={() => onSave(selected)}>Сохранить: {selected}-го числа</Button>
        </>
      }
    >
      <div className={styles.days} role="group" aria-label="Число месяца">
        {DAYS.map((number) => (
          <button
            key={number}
            type="button"
            aria-pressed={number === selected}
            className={cx('t-button', styles.dayButton, number === selected && styles.selected)}
            onClick={() => setSelected(number)}
          >
            {number}
          </button>
        ))}
      </div>
      <p className={`t-body-sm ${styles.hint}`}>
        Действует с {format(parseISO(`${month}-01`), 'MMMM', { locale: ru })} и дальше, пока не
        поменяешь. Если в месяце нет такого числа, берётся его последний день
      </p>
    </Modal>
  )
}
