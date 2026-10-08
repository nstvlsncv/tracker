import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Modal } from '../../components/Modal'
import type { List } from '../../data/lists'
import { HABIT_TITLE_MAX_LENGTH } from '../../lib/constants'

type Props = {
  /** Список, который переименовывают. Без него модалка создаёт новый. */
  list?: List
  onClose: () => void
  onSave: (title: string) => void
  /** Удалить список (только при редактировании). */
  onDelete?: () => void
}

/** Модалка «Добавить список» и «Изменить список»: одно поле с названием. */
export function ListModal({ list, onClose, onSave, onDelete }: Props) {
  const formId = useId()
  const [title, setTitle] = useState(list?.title ?? '')
  const [error, setError] = useState<string>()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) {
      setError('Напиши название')
      return
    }
    onSave(trimmed)
  }

  return (
    <Modal
      open
      title={list ? 'Изменить список' : 'Добавить список'}
      onClose={onClose}
      footerStart={
        onDelete && (
          <Button tone="danger" variant="ghost" onClick={onDelete}>
            Удалить список
          </Button>
        )
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" form={formId}>
            {list ? 'Сохранить' : 'Добавить список'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate>
        <Input
          label="Название"
          maxLength={HABIT_TITLE_MAX_LENGTH}
          value={title}
          error={error}
          hint={list ? undefined : 'Например: продукты, посмотреть, в поездку'}
          onChange={(event) => {
            setTitle(event.target.value)
            setError(undefined)
          }}
        />
      </form>
    </Modal>
  )
}
