import { Plus } from '@phosphor-icons/react'
import { useState } from 'react'
import { Button } from './Button'
import { InlineInput } from './InlineInput'
import styles from './AddItem.module.css'

type Props = {
  /** «Добавить цель», «Добавить задачу», «Добавить привычку» */
  label: string
  /** Без onAdd это просто кнопка: клик уходит в onClick (привычки открывают модалку). */
  onAdd?: (title: string) => void
  onClick?: () => void
}

/** Кнопка «+ Добавить …» внизу списка. По клику превращается в инлайн-поле. */
export function AddItem({ label, onAdd, onClick }: Props) {
  const [editing, setEditing] = useState(false)

  if (editing && onAdd) {
    return <AddItemField label={label} onAdd={onAdd} onClose={() => setEditing(false)} />
  }

  return (
    <div>
      <Button
        variant="secondary"
        icon={<Plus aria-hidden />}
        onClick={onAdd ? () => setEditing(true) : onClick}
      >
        {label}
      </Button>
    </div>
  )
}

type FieldProps = {
  /** Подпись и плейсхолдер поля: «Добавить цель». */
  label: string
  /** Свой плейсхолдер, если он должен подсказывать больше, чем подпись. */
  placeholder?: string
  onAdd: (title: string) => void
  /** Поле пора убрать: ввод закончен или отменён. */
  onClose: () => void
}

/**
 * Само инлайн-поле добавления, без кнопки. Enter добавляет элемент и оставляет поле открытым
 * для следующего, уход из поля сохраняет набранное и закрывает его, Escape отменяет.
 * Отдельно используется там, где добавление запускает кнопка в заголовке секции (Главная).
 */
export function AddItemField({ label, placeholder, onAdd, onClose }: FieldProps) {
  return (
    <div className={styles.field}>
      <Plus aria-hidden />
      <InlineInput
        aria-label={label}
        placeholder={placeholder ?? label}
        onEnter={(title) => {
          onAdd(title)
          return true
        }}
        onBlur={(title) => {
          if (title) onAdd(title)
          onClose()
        }}
        onEscape={onClose}
      />
    </div>
  )
}
