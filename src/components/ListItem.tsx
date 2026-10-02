import { IconPencil, IconTrash } from '@tabler/icons-react'
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

/** Строка задачи или цели: чекбокс, текст, на hover иконки «редактировать» и «удалить». */
export function ListItem({ title, done, onToggle, onRename, onDelete }: Props) {
  const [editing, setEditing] = useState(false)

  const save = (next: string) => {
    if (next && next !== title) onRename(next)
    setEditing(false)
  }

  return (
    <div className={cx(styles.item, done && styles.done)}>
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
      ) : done ? (
        <span className={styles.title}>{title}</span>
      ) : (
        <button type="button" className={styles.title} onClick={() => setEditing(true)}>
          {title}
        </button>
      )}
      {!editing && (
        <div className={styles.actions}>
          <IconButton
            variant="ghost"
            size="sm"
            icon={<IconPencil aria-hidden />}
            aria-label={`Редактировать: ${title}`}
            onClick={() => setEditing(true)}
          />
          <IconButton
            tone="danger"
            variant="ghost"
            size="sm"
            icon={<IconTrash aria-hidden />}
            aria-label={`Удалить: ${title}`}
            onClick={onDelete}
          />
        </div>
      )}
    </div>
  )
}
