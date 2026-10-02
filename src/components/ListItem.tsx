import { Trash } from '@phosphor-icons/react'
import { useState } from 'react'
import { cx } from '../lib/cx'
import { Checkbox } from './Checkbox'
import { IconButton } from './IconButton'
import { InlineInput } from './InlineInput'
import styles from './ListItem.module.css'

type Props = {
  title: string
  done: boolean
  onToggle: (done: boolean) => void
  onRename: (title: string) => void
  onDelete: () => void
}

/**
 * Строка задачи или цели. Клик по строке (кроме чекбокса и корзины) включает
 * переименование, корзина появляется при наведении.
 */
export function ListItem({ title, done, onToggle, onRename, onDelete }: Props) {
  const [editing, setEditing] = useState(false)

  const save = (next: string) => {
    if (next && next !== title) onRename(next)
    setEditing(false)
  }

  return (
    <div
      className={cx(styles.item, done && styles.done, editing && styles.editing)}
      onClick={() => setEditing(true)}
    >
      <Checkbox
        checked={done}
        onChange={onToggle}
        aria-label={done ? `Снять отметку: ${title}` : `Отметить: ${title}`}
      />
      {editing ? (
        <InlineInput
          aria-label="Название"
          initialValue={title}
          onEnter={save}
          onBlur={save}
          onEscape={() => setEditing(false)}
        />
      ) : (
        // Кнопка, а не просто текст: так переименование доступно и с клавиатуры.
        <button type="button" className={styles.title} aria-label={`Переименовать: ${title}`}>
          {title}
        </button>
      )}
      {!editing && (
        <div className={styles.actions}>
          <IconButton
            tone="danger"
            variant="ghost"
            size="sm"
            icon={<Trash aria-hidden />}
            aria-label={`Удалить: ${title}`}
            onClick={(event) => {
              event.stopPropagation()
              onDelete()
            }}
          />
        </div>
      )}
    </div>
  )
}
