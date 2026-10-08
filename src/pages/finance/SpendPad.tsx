import { Backspace } from '@phosphor-icons/react'
import { useState } from 'react'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { cx } from '../../lib/cx'
import { PAD_KEYS, padPress, parseAmount } from '../../lib/finance'
import type { PadKey } from '../../lib/finance'
import styles from './Finance.module.css'

type Props = {
  onClose: () => void
  onSave: (amount: number) => void
}

/** «1500,5» → «1 500,5»: тысячи разделены, как в остальных суммах. */
const pretty = (text: string) => {
  const [whole, cents] = text.split(',')
  const spaced = whole.replace(/\B(?=(\d{3})+$)/g, '\u00a0')
  return cents === undefined ? spaced : `${spaced},${cents}`
}

/**
 * Клавиатура-калькулятор для траты на телефоне: крупная сумма и кнопки с цифрами.
 * Системная клавиатура не выезжает: сумма набирается большими кнопками одним пальцем.
 */
export function SpendPad({ onClose, onSave }: Props) {
  const [text, setText] = useState('')
  const [error, setError] = useState(false)

  const press = (key: PadKey) => {
    setText((current) => padPress(current, key))
    setError(false)
  }

  const save = () => {
    const amount = parseAmount(text.replace(/,$/, ''))
    if (amount === null) setError(true)
    else onSave(amount)
  }

  return (
    <Modal
      open
      title="Трата"
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
      <p className={cx('t-heading-1', styles.padSum, !text && styles.padEmpty)} aria-live="polite">
        {pretty(text || '0')} ₽
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
