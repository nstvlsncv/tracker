import { useLayoutEffect, useRef } from 'react'
import { sortItems } from '../lib/metrics'
import { ListItem } from './ListItem'
import styles from './ItemList.module.css'

export type Item = {
  id: string
  title: string
  isDone: boolean
  createdAt: string
}

type Props = {
  items: Item[]
  onToggle: (id: string, done: boolean) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
}

const MOVE_DURATION_MS = 200

/** Список задач или целей. Невыполненные сверху, при отметке элемент переезжает с анимацией. */
export function ItemList({ items, onToggle, onRename, onDelete }: Props) {
  const listRef = useRef<HTMLUListElement>(null)
  const tops = useRef(new Map<string, number>())

  // FLIP: сравниваем положение каждой строки с прошлым рендером и проигрываем сдвиг.
  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const next = new Map<string, number>()
    for (const row of list.children) {
      if (!(row instanceof HTMLElement) || !row.dataset.id) continue
      const top = row.offsetTop
      const prev = tops.current.get(row.dataset.id)
      next.set(row.dataset.id, top)
      if (animate && prev !== undefined && prev !== top) {
        row.animate([{ transform: `translateY(${prev - top}px)` }, { transform: 'none' }], {
          duration: MOVE_DURATION_MS,
          easing: 'ease-out',
        })
      }
    }
    tops.current = next
  })

  return (
    <ul ref={listRef} className={styles.list}>
      {sortItems(items).map((item) => (
        <li key={item.id} data-id={item.id}>
          <ListItem
            title={item.title}
            done={item.isDone}
            onToggle={(done) => onToggle(item.id, done)}
            onRename={(title) => onRename(item.id, title)}
            onDelete={() => onDelete(item.id)}
          />
        </li>
      ))}
    </ul>
  )
}
