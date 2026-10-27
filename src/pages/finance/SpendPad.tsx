import { Backspace } from '@phosphor-icons/react'
import { useState } from 'react'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Modal } from '../../components/Modal'
import { HABIT_TITLE_MAX_LENGTH } from '../../lib/constants'
import { cx } from '../../lib/cx'
import { PAD_KEYS, padPress, parseAmount, spaceAmount } from '../../lib/finance'
import type { PadKey } from '../../lib/finance'
import styles from './Finance.module.css'

type Props = {
  /** Можно ли назвать трату: в старой базе у трат нет колонки с названием. */
  titles: boolean
  onClose: () => void
  onSave: (amount: number, title: string | null) => void
}

/**
 * Клавиатура-калькулятор для траты на телефоне: крупная сумма и кнопки с цифрами.
 * Для суммы системная клавиатура не выезжает: она набирается большими кнопками одним пальцем.
 * Название необязательное, обычным полем над суммой.
 */
export function SpendPad({ titles, onClose, onSave }: Props) {
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [error, setError] = useState(false)

  const press = (key: PadKey) => {
    setText((current) => padPress(current, key))
    setError(false)
  }

  const save = () => {
    const amount = parseAmount(text.replace(/,$/, ''))
    if (amount === null) setError(true)
    else onSave(amount, title.trim() || null)
  }

  return (
    <Modal
      open
      title="Новая трата"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={save}>Записать</Button>
        </>
      }
    >
      {titles && (
        <Input
          label="Название"
          placeholder="Например, кофе"
          maxLength={HABIT_TITLE_MAX_LENGTH}
          autoComplete="off"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      )}
      <p className={cx('t-heading-1', styles.padSum, !text && styles.padEmpty)} aria-live="polite">
        {spaceAmount(text || '0')} ₽
      </p>
      <p className={cx('t-body-sm', styles.padError)} role="alert">
        {error ? 'Набери сумму' : '\u00a0'}
      </p>
      <div className={styles.pad} role="group" aria-label="Сумма">
        {PAD_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className={`t-heading-4 ${styles.padKey}`}
            aria-label={key === 'back' ? 'Стереть' : key === ',' ? 'Запятая' : key}
            onClick={() => press(key)}
          >
            {key === 'back' ? <Backspace aria-hidden /> : key}
          </button>
        ))}
      </div>
    </Modal>
  )
}
