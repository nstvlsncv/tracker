import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../../components/Button'
import { Dropdown } from '../../components/Dropdown'
import { Input } from '../../components/Input'
import { Modal } from '../../components/Modal'
import type { FinanceItem, FinanceKind, FinanceStage } from '../../data/finance'
import type { NewFinanceItem } from '../../data/useFinance'
import { HABIT_TITLE_MAX_LENGTH } from '../../lib/constants'
import { amountToInput, isOnce, KINDS, parseAmount, STAGES } from '../../lib/finance'
import styles from './Finance.module.css'

type Props = {
  /** Строка, которую редактируют. Без неё модалка создаёт новую. */
  item?: FinanceItem
  /** С чего начать новую строку: что это и в каком этапе. */
  kind: FinanceKind
  stage: FinanceStage
  /** Месяц, который открыт на экране: изменения действуют с него. */
  month: string
  onClose: () => void
  onSave: (item: NewFinanceItem) => void
  /** Удалить строку (только при редактировании). */
  onDelete?: () => void
}

const KIND_OPTIONS = KINDS.map(({ value, one }) => ({ value, label: one }))
const REPEAT_OPTIONS = [
  { value: 'monthly', label: 'Каждый месяц' },
  { value: 'once', label: 'Только в этом месяце' },
]

/**
 * Модалка строки этапа: поступление, платёж или накопление. У новой строки выбирается,
 * что это, в каком этапе и повторяется ли она; у готовой меняются только название и сумма.
 */
export function ItemModal({ item, month, onClose, onSave, onDelete, ...start }: Props) {
  const formId = useId()
  const [kind, setKind] = useState(item?.kind ?? start.kind)
  const [stage, setStage] = useState(item?.stage ?? start.stage)
  const [title, setTitle] = useState(item?.title ?? '')
  const [amount, setAmount] = useState(item ? amountToInput(item.amount) : '')
  const [titleError, setTitleError] = useState<string>()
  const [amountError, setAmountError] = useState<string>()
  const [repeat, setRepeat] = useState(item && isOnce(item) ? 'once' : 'monthly')
  const once = repeat === 'once'
  const one = KINDS.find((option) => option.value === kind)!.one.toLowerCase()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = title.trim()
    const parsed = parseAmount(amount)
    if (!trimmed) setTitleError('Напиши название')
    if (parsed === null) setAmountError('Нужна сумма цифрами, например 15 000')
    if (!trimmed || parsed === null) return
    onSave({ kind, stage, title: trimmed, amount: parsed, once })
  }

  return (
    <Modal
      open
      title={item ? `Изменить ${one}` : 'Добавить'}
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
            {item ? 'Сохранить' : `Добавить ${one}`}
          </Button>
        </>
      }
    >
      <form id={formId} className={styles.form} onSubmit={submit} noValidate>
        {!item && (
          <>
            <Dropdown
              label="Что добавляем"
              aria-label="Что добавляем"
              value={kind}
              onChange={setKind}
              options={KIND_OPTIONS}
            />
            <Dropdown label="Этап" aria-label="Этап" value={stage} onChange={setStage} options={STAGES} />
            <Dropdown
              label="Повтор"
              aria-label="Повтор"
              value={repeat}
              onChange={setRepeat}
              options={REPEAT_OPTIONS}
            />
          </>
        )}
        <Input
          label="Название"
          maxLength={HABIT_TITLE_MAX_LENGTH}
          value={title}
          error={titleError}
          onChange={(event) => {
            setTitle(event.target.value)
            setTitleError(undefined)
          }}
        />
        <Input
          label="Сумма, ₽"
          inputMode="decimal"
          value={amount}
          error={amountError}
          hint={
            once
              ? 'Разовая строка: только в этом месяце, дальше не повторяется'
              : `Действует с ${format(parseISO(`${month}-01`), 'MMMM', { locale: ru })} и дальше, прошлые месяцы не меняются`
          }
          onChange={(event) => {
            setAmount(event.target.value)
            setAmountError(undefined)
          }}
        />
      </form>
    </Modal>
  )
}
