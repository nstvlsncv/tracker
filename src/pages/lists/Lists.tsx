import { CaretDown, CaretUp, PencilSimple, Plus } from '@phosphor-icons/react'
import { useEffect, useId, useState } from 'react'
import { AddItem } from '../../components/AddItem'
import { Button } from '../../components/Button'
import { Collapse } from '../../components/Collapse'
import { IconButton } from '../../components/IconButton'
import { ItemList } from '../../components/ItemList'
import { Kbd } from '../../components/Kbd'
import { Mascot } from '../../components/Mascot'
import { PageLoader } from '../../components/PageLoader'
import { useToast } from '../../components/useToast'
import type { List, ListEntry } from '../../data/lists'
import { useLists } from '../../data/useLists'
import type { ListsValue } from '../../data/useLists'
import { PageHeader } from '../../layout/PageHeader'
import { onNewItem } from '../../lib/hotkeys'
import { pluralize } from '../../lib/metrics'
import { useSessionState } from '../../lib/sessionState'
// Карточка списка устроена как карточка привычки: шапка, которая раскрывает содержимое.
import card from '../habits/HabitCard.module.css'
import { ListModal } from './ListModal'
import styles from './Lists.module.css'

const NONE_OPEN: ReadonlySet<string> = new Set()

const items = (count: number) => `${count} ${pluralize(count, 'пункт', 'пункта', 'пунктов')}`

/** Что написать под названием списка: сколько осталось и сколько всего. */
function summary(entries: ListEntry[]): string {
  if (entries.length === 0) return 'Пока пусто'
  const left = entries.filter((entry) => !entry.isDone).length
  if (left === 0) return `Всё отмечено · ${items(entries.length)}`
  if (left === entries.length) return items(entries.length)
  return `Осталось ${left} из ${entries.length}`
}

type CardProps = {
  list: List
  entries: ListEntry[]
  store: ListsValue
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: () => void
}

/**
 * Карточка списка. Свёрнутая: название и сколько пунктов осталось. Раскрытая: пункты
 * с чекбоксами, как задачи (отметить, переименовать, удалить, перетащить), добавление
 * и кнопка, которая убирает всё отмеченное разом.
 */
function ListCard({ list, entries, store, open, onOpenChange, onEdit }: CardProps) {
  const detailsId = useId()
  const done = entries.filter((entry) => entry.isDone).length
  const Caret = open ? CaretUp : CaretDown

  return (
    <article className={card.card}>
      <div className={card.head} onClick={() => onOpenChange(!open)}>
        <div className={card.text}>
          {/* Кнопка, а не просто текст: так карточку можно раскрыть и с клавиатуры. */}
          <button
            type="button"
            className={`t-heading-5 ${card.title}`}
            aria-expanded={open}
            aria-controls={detailsId}
          >
            {list.title}
          </button>
          <span className={`t-body-md ${card.streak}`}>{summary(entries)}</span>
        </div>
        {open && (
          <IconButton
            variant="secondary"
            icon={<PencilSimple aria-hidden />}
            aria-label={`Изменить список: ${list.title}`}
            onClick={(event) => {
              event.stopPropagation()
              onEdit()
            }}
          />
        )}
        <Caret className={card.caret} aria-hidden />
      </div>

      <Collapse open={open}>
        <div id={detailsId} className={card.details}>
          {entries.length > 0 ? (
            <ItemList
              items={entries}
              onToggle={store.toggleEntry}
              onRename={store.renameEntry}
              onDelete={store.deleteEntry}
              onArrange={(ids) => store.arrangeEntries(list.id, ids)}
            />
          ) : (
            <p className={styles.placeholder}>Добавь первый пункт</p>
          )}
          <div className={styles.actions}>
            <AddItem label="Добавить пункт" onAdd={(title) => store.addEntry(list.id, title)} />
            {/* Купила всё по списку: отмеченное убирается разом, и список можно начать заново. */}
            {done > 0 && (
              <div>
                <Button variant="ghost" onClick={() => store.clearDone(list.id)}>
                  Убрать отмеченные ({done})
                </Button>
              </div>
            )}
          </div>
        </div>
      </Collapse>
    </article>
  )
}

/**
 * Экран «Списки»: всё, что не привязано к дню. Продукты, фильмы, идеи, сборы в поездку.
 * Каждый список это карточка с пунктами; дат, напоминаний и вложенности здесь нет намеренно.
 */
export function Lists() {
  const store = useLists()
  const toast = useToast()
  // Раскрытых списков может быть несколько. Что раскрыто, запоминается на время сеанса.
  const [open, setOpen] = useSessionState<ReadonlySet<string>>('lists.open', NONE_OPEN)
  // Что открыто в модалке: новый список или правка существующего.
  const [editing, setEditing] = useState<List | 'new'>()
  // N на клавиатуре: новый список.
  useEffect(() => onNewItem(() => setEditing('new')), [])

  const setCardOpen = (id: string, next: boolean) =>
    setOpen((current) => {
      const ids = new Set(current)
      if (next) ids.add(id)
      else ids.delete(id)
      return ids
    })

  const ready = store.status === 'ready'

  return (
    <>
      <PageHeader
        title="Списки"
        help="lists"
        actions={
          ready && (
            <Button
              size="lg"
              icon={<Plus aria-hidden />}
              // На телефоне от кнопки остаётся квадрат с плюсом справа от названия (см. PageHeader).
              data-compact
              aria-label="Добавить список"
              onClick={() => setEditing('new')}
            >
              <span data-label>
                Добавить список
                <Kbd>N</Kbd>
              </span>
            </Button>
          )
        }
      />

      {store.status === 'loading' && <PageLoader />}

      {store.status === 'error' && (
        <div className={styles.error}>
          <p className={styles.placeholder}>Не удалось загрузить списки</p>
          <div>
            <Button variant="secondary" onClick={store.reload}>
              Повторить
            </Button>
          </div>
        </div>
      )}

      {store.status === 'unavailable' && (
        <div className={styles.empty}>
          <Mascot size={64} />
          <p>Списки почти готовы: осталось обновить базу</p>
        </div>
      )}

      {ready && store.lists.length === 0 && (
        <div className={styles.empty}>
          <Mascot size={64} />
          <p>Заведи первый список: продукты, фильмы, идеи</p>
        </div>
      )}

      {ready &&
        store.lists.map((list) => (
          <ListCard
            key={list.id}
            list={list}
            entries={store.entries.filter((entry) => entry.listId === list.id)}
            store={store}
            open={open.has(list.id)}
            onOpenChange={(next) => setCardOpen(list.id, next)}
            onEdit={() => setEditing(list)}
          />
        ))}

      {editing && (
        <ListModal
          list={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(undefined)}
          onSave={(title) => {
            if (editing === 'new') {
              // Новый список сразу раскрыт: следующим делом в него добавляют пункты.
              setCardOpen(store.addList(title), true)
              toast({ message: 'Список добавлен' })
            } else if (title !== editing.title) {
              store.renameList(editing.id, title)
              toast({ message: 'Сохранено' })
            }
            setEditing(undefined)
          }}
          onDelete={
            editing === 'new'
              ? undefined
              : () => {
                  store.deleteList(editing.id)
                  setEditing(undefined)
                }
          }
        />
      )}
    </>
  )
}
