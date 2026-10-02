import { IconPlus } from '@tabler/icons-react'
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
    return (
      <div className={styles.field}>
        <IconPlus aria-hidden />
        <InlineInput
          aria-label={label}
          placeholder={label}
          onEnter={(title) => {
            onAdd(title)
            return true
          }}
          onBlur={(title) => {
            if (title) onAdd(title)
            setEditing(false)
          }}
          onEscape={() => setEditing(false)}
        />
      </div>
    )
  }

  return (
    <div>
      <Button
        variant="secondary"
        icon={<IconPlus aria-hidden />}
        onClick={onAdd ? () => setEditing(true) : onClick}
      >
        {label}
      </Button>
    </div>
  )
}
