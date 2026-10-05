import { useEffect, useLayoutEffect, useRef } from 'react'
import { sortItems } from '../lib/metrics'
import { dissolve } from '../lib/dissolve'
import { canDragTasks, registerList, watchDrag } from '../lib/dragTasks'
import { ListItem } from './ListItem'
import type { MoveAction } from './ListItem'
import styles from './ItemList.module.css'

export type Item = {
  id: string
  title: string
  isDone: boolean
  createdAt: string
  /** Задача из правила повтора: у строки значок «повторяется». */
  ruleId?: string | null
  /** Место в списке, если строки двигали вручную. */
  position?: number | null
}

type Props = {
  items: Item[]
  onToggle: (id: string, done: boolean) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  /** Перенос на другой день для задачи с этим id. undefined: переносить нельзя или некуда. */
  moveOf?: (id: string) => MoveAction | undefined
  /** Салют на каждой отметке (цели). У задач его нет: там празднует прогресс дня. */
  burst?: boolean
  /**
   * Спросить перед удалением (повторяющиеся задачи). Строка рассыплется и удалится,
   * только когда вызовут `proceed`.
   */
  confirmDelete?: (id: string, proceed: () => void) => void
  /**
   * Строки можно перетаскивать. Приходит новый порядок невыполненных строк сверху вниз;
   * среди них может быть строка из другого списка (задачу перетащили из другого дня).
   */
  onArrange?: (ids: string[]) => void
}

const MOVE_DURATION_MS = 200
const FADE_DURATION_MS = 180

/**
 * Список задач или целей. Невыполненные сверху. Строки не прыгают: при отметке элемент
 * переезжает на новое место, новая строка проявляется, удалённая рассыпается в пыль.
 */
export function ItemList({
  items,
  onToggle,
  onRename,
  onDelete,
  moveOf,
  burst,
  confirmDelete,
  onArrange,
}: Props) {
  const listRef = useRef<HTMLUListElement>(null)

  // Перетаскивание: список сообщает о себе, порядок и обработчик берутся свежие.
  const arrangeRef = useRef({ items, onArrange })
  useEffect(() => {
    arrangeRef.current = { items, onArrange }
  })
  const arrangeable = Boolean(onArrange)
  useEffect(() => {
    const list = listRef.current
    if (!list || !arrangeable) return
    return registerList(list, {
      ids: () =>
        sortItems(arrangeRef.current.items)
          .filter((item) => !item.isDone)
          .map((item) => item.id),
      arrange: (ids) => arrangeRef.current.onArrange?.(ids),
    })
  }, [arrangeable])
  // Где стояла каждая строка при прошлой отрисовке: от этого считается сдвиг.
  const tops = useRef<Map<string, number> | null>(null)
  // Положения из отрисовки перед последней: к моменту, когда замечено удаление строки,
  // свежая карта её уже не содержит.
  const olderTops = useRef<Map<string, number> | null>(null)
  // Строки, которые сейчас рассыпаются в пыль перед удалением.
  const vanishing = useRef(new Set<string>())

  /**
   * Удаление с «щелчком Таноса»: строка сначала рассыпается в пыль на своём месте и только
   * потом убирается из данных. Так эффект виден целиком, даже если строка в списке одна,
   * а соседние строки не наезжают на пыль.
   */
  const remove = (id: string) => {
    const row = listRef.current?.querySelector<HTMLElement>(`li[data-id="${CSS.escape(id)}"]`)
    if (!row || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onDelete(id)
      return
    }
    if (vanishing.current.has(id)) return
    vanishing.current.add(id)
    dissolve(row).then(() => {
      vanishing.current.delete(id)
      // Пометка для наблюдателя ниже: эту строку показывать ещё раз не нужно.
      row.dataset.vanished = 'true'
      onDelete(id)
    })
  }

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

  // Строку, которая ушла из списка не удалением (задачу перенесли на другой день), React
  // убирает сразу. Чтобы она не исчезала рывком, возвращаем её на прежнее место поверх списка
  // уже неживой и даём погаснуть.
  useEffect(() => {
    const list = listRef.current
    if (!list || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ghosts = new WeakSet<Node>()
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.removedNodes) {
          if (!(node instanceof HTMLElement) || ghosts.has(node) || !node.dataset.id) continue
          // Удалённая строка уже рассыпалась в пыль, показывать её снова незачем.
          if (node.dataset.vanished) continue
          // Строка на месте: её не удалили, а переставили (после отметки).
          if (node.isConnected) continue
          const id = node.dataset.id
          const top = tops.current?.get(id) ?? olderTops.current?.get(id)
          if (top === undefined) continue
          ghosts.add(node)
          delete node.dataset.id
          node.inert = true
          node.setAttribute('aria-hidden', 'true')
          Object.assign(node.style, { position: 'absolute', top: `${top}px`, left: '0', right: '0' })
          list.appendChild(node)
          node.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: FADE_DURATION_MS,
            easing: 'ease-in',
            fill: 'forwards',
          })
          // Таймер, а не ожидание конца анимации: во вкладке в фоне она может не дойти до конца.
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
        <li
          key={item.id}
          data-id={item.id}
          onPointerDown={(event) => {
            // Тянуть можно невыполненную строку, левой кнопкой мыши и не за кнопки с иконками,
            // чекбокс или поле переименования.
            if (!onArrange || item.isDone || event.button !== 0 || event.pointerType !== 'mouse') return
            if (!canDragTasks()) return
            const target = event.target as Element
            if (target.closest('[role="checkbox"], textarea, input, [data-no-drag]')) return
            watchDrag(event.nativeEvent, event.currentTarget, item.id, {
              ghost: styles.ghost,
              source: styles.source,
              before: styles.dropBefore,
              after: styles.dropAfter,
            })
          }}
        >
          <ListItem
            title={item.title}
            done={item.isDone}
            onToggle={(done) => onToggle(item.id, done)}
            onRename={(title) => onRename(item.id, title)}
            onDelete={() =>
              confirmDelete ? confirmDelete(item.id, () => remove(item.id)) : remove(item.id)
            }
            repeats={Boolean(item.ruleId)}
            move={item.isDone ? undefined : moveOf?.(item.id)}
            burst={burst}
          />
        </li>
      ))}
    </ul>
  )
}
