import { Trash } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import type { TouchEvent } from 'react'
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

/** Сенсорный экран: корзины в строке нет, удаление свайпом влево. */
const TOUCH_QUERY = '(hover: none)'
/** Ширина красной кнопки, которая открывается под строкой. */
const REVEAL_PX = 72
/** С какого сдвига понятно, куда ведут палец: вбок (свайп) или вверх-вниз (прокрутка). */
const LOCK_PX = 8
/** Какую долю ширины строки нужно протянуть, чтобы удалить сразу, без нажатия на кнопку. */
const FULL_SWIPE = 0.6
const SETTLE_MS = 200

type Gesture = { x: number; y: number; base: number; offset: number; axis: 'x' | 'y' | null }

/**
 * Строка задачи или цели. Клик по строке (кроме чекбокса и корзины) включает переименование.
 * Удаление: на компьютере корзина при наведении, на сенсорных экранах свайп влево, как в iOS.
 * Короткий свайп открывает красную кнопку, длинный удаляет сразу.
 */
export function ListItem({ title, done, onToggle, onRename, onDelete }: Props) {
  const [editing, setEditing] = useState(false)
  const [open, setOpen] = useState(false)
  const swipeRef = useRef<HTMLDivElement>(null)
  const gesture = useRef<Gesture | null>(null)
  // Сразу после свайпа браузер может прислать клик: он не должен включать переименование.
  const swiped = useRef(false)

  const save = (next: string) => {
    if (next && next !== title) onRename(next)
    setEditing(false)
  }

  /** На сколько пикселей строка сдвинута влево. Двигаем стилем напрямую, без перерисовки. */
  const setReveal = (px: number) => swipeRef.current?.style.setProperty('--reveal', `${px}px`)

  const close = () => {
    setOpen(false)
    setReveal(0)
  }

  // Открытая кнопка прячется, как только нажали куда-то мимо этой строки.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && swipeRef.current?.contains(event.target)) return
      setOpen(false)
      setReveal(0)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const onTouchStart = (event: TouchEvent) => {
    if (editing || !window.matchMedia(TOUCH_QUERY).matches) return
    const base = open ? REVEAL_PX : 0
    const { clientX, clientY } = event.touches[0]
    gesture.current = { x: clientX, y: clientY, base, offset: base, axis: null }
  }

  const onTouchMove = (event: TouchEvent) => {
    const current = gesture.current
    if (!current) return
    const dx = event.touches[0].clientX - current.x
    const dy = event.touches[0].clientY - current.y
    if (!current.axis) {
      if (Math.abs(dx) < LOCK_PX && Math.abs(dy) < LOCK_PX) return
      current.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      if (current.axis === 'x') swipeRef.current?.classList.add(styles.dragging)
    }
    if (current.axis !== 'x') return
    current.offset = Math.max(0, current.base - dx)
    setReveal(current.offset)
  }

  const onTouchEnd = () => {
    const current = gesture.current
    gesture.current = null
    const swipe = swipeRef.current
    if (!current || current.axis !== 'x' || !swipe) return

    swipe.classList.remove(styles.dragging)
    swiped.current = true
    setTimeout(() => (swiped.current = false), 300)

    const width = swipe.offsetWidth
    if (current.offset > width * FULL_SWIPE) {
      // Протянули далеко: строка уезжает целиком и удаляется.
      setReveal(width)
      setTimeout(onDelete, SETTLE_MS)
    } else if (current.offset > REVEAL_PX / 2) {
      setOpen(true)
      setReveal(REVEAL_PX)
    } else {
      close()
    }
  }

  const onRowClick = () => {
    if (swiped.current) return
    if (open) close()
    else setEditing(true)
  }

  return (
    <div ref={swipeRef} className={styles.swipe}>
      {/* Лежит под строкой и видна только на сенсорных экранах, когда строку сдвинули. */}
      <button
        type="button"
        className={styles.remove}
        aria-label={`Удалить: ${title}`}
        tabIndex={open ? 0 : -1}
        onClick={onDelete}
      >
        <Trash aria-hidden />
      </button>
      <div
        className={cx(styles.item, done && styles.done, editing && styles.editing)}
        onClick={onRowClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
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
    </div>
  )
}
