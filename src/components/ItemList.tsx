import { useEffect, useLayoutEffect, useRef } from 'react'
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
const FADE_DURATION_MS = 180

/**
 * Список задач или целей. Невыполненные сверху. Строки не прыгают: при отметке элемент
 * переезжает на новое место, новая строка проявляется, удалённая растворяется.
 */
export function ItemList({ items, onToggle, onRename, onDelete }: Props) {
  const listRef = useRef<HTMLUListElement>(null)
  // Где стояла каждая строка при прошлой отрисовке: от этого считается сдвиг.
  const tops = useRef<Map<string, number> | null>(null)
  // Положения из отрисовки перед последней: к моменту, когда замечено удаление строки,
  // свежая карта её уже не содержит.
  const olderTops = useRef<Map<string, number> | null>(null)

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const previous = tops.current
    const next = new Map<string, number>()
    for (const row of list.children) {
      if (!(row instanceof HTMLElement) || !row.dataset.id) continue
      const top = row.offsetTop
      const prev = previous?.get(row.dataset.id)
      next.set(row.dataset.id, top)
      if (!animate || !previous) continue
      if (prev === undefined) {
        // Новая строка (не первая отрисовка списка): проявляется и чуть опускается на место.
        row.animate(
          [{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }],
          { duration: FADE_DURATION_MS, easing: 'ease-out' },
        )
      } else if (prev !== top) {
        // FLIP: строка проигрывает путь от старого места к новому.
        row.animate([{ transform: `translateY(${prev - top}px)` }, { transform: 'none' }], {
          duration: MOVE_DURATION_MS,
          easing: 'ease-out',
        })
      }
    }
    olderTops.current = previous
    tops.current = next
  })

  // Удалённую строку React убирает из страницы сразу. Чтобы она не исчезала рывком,
  // её возвращаем на прежнее место поверх списка уже неживой и даём раствориться.
  useEffect(() => {
    const list = listRef.current
    if (!list || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ghosts = new WeakSet<Node>()
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.removedNodes) {
          if (!(node instanceof HTMLElement) || ghosts.has(node) || !node.dataset.id) continue
          // Строка на месте: её не удалили, а переставили (после отметки).
          if (node.isConnected) continue
          const top = tops.current?.get(node.dataset.id) ?? olderTops.current?.get(node.dataset.id)
          if (top === undefined) continue
          ghosts.add(node)
          delete node.dataset.id
          node.inert = true
          node.setAttribute('aria-hidden', 'true')
          Object.assign(node.style, { position: 'absolute', top: `${top}px`, left: '0', right: '0' })
          list.appendChild(node)
          node.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(0.98)' }], {
            duration: FADE_DURATION_MS,
            easing: 'ease-in',
            fill: 'forwards',
          })
          // Таймер, а не ожидание конца анимации: во вкладке в фоне анимация может не дойти до конца.
          setTimeout(() => node.remove(), FADE_DURATION_MS)
        }
      }
    })
    observer.observe(list, { childList: true })
    return () => observer.disconnect()
  }, [])

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
