import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Modal } from '../../components/Modal'
import type { FinanceSpend } from '../../data/finance'
import { HABIT_TITLE_MAX_LENGTH } from '../../lib/constants'
import { amountToInput, parseAmount } from '../../lib/finance'
import { AmountInput } from './AmountInput'
import styles from './Finance.module.css'

type Props = {
  /** Трата, которую правят. Без неё окно записывает новую. */
  spend?: FinanceSpend
  /** Можно ли назвать трату: в старой базе у трат нет колонки с названием. */
  titles: boolean
  onClose: () => void
  onSave: (title: string | null, amount: number) => void
  /** Удалить трату (только при правке). */
  onDelete?: () => void
}

/**
 * Окно траты из «Прочих расходов»: название и сумма. Новая трата записывается на сегодня;
 * у готовой слева «Удалить», как у строк этапа.
 */
export function SpendModal({ spend, titles, onClose, onSave, onDelete }: Props) {
  const formId = useId()
  const [title, setTitle] = useState(spend?.title ?? '')
  const [amount, setAmount] = useState(spend ? amountToInput(spend.amount) : '')
  const [error, setError] = useState<string>()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const parsed = parseAmount(amount)
    if (parsed === null) {
      setError('Нужна сумма цифрами, например 350')
      return
    }
    onSave(title.trim() || null, parsed)
  }

  return (
    <Modal
      open
      title={spend ? 'Изменить трату' : 'Новая трата'}
      onClose={onClose}
      footerStart={
        onDelete && (
          <Button tone="danger" variant="ghost" onClick={onDelete}>
            Удалить
          </Button>
        )
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" form={formId}>
            {spend ? 'Сохранить' : 'Записать'}
          </Button>
        </>
      }
    >
      <form id={formId} className={styles.form} onSubmit={submit} noValidate>
        {titles && (
          <Input
            label="Название"
            placeholder="Например, кофе"
            maxLength={HABIT_TITLE_MAX_LENGTH}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        )}
        <AmountInput
          label="Сумма, ₽"
          value={amount}
          error={error}
          onChange={(next) => {
            setAmount(next)
            setError(undefined)
          }}
        />
      </form>
    </Modal>
  )
}
