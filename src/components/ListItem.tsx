import { ArrowBendUpRight, Trash } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import type { TouchEvent } from 'react'
import { cx } from '../lib/cx'
import { moveTarget } from '../lib/taskMove'
import { Checkbox } from './Checkbox'
import { IconButton } from './IconButton'
import { InlineInput } from './InlineInput'
import { MoveMenu } from './MoveMenu'
import styles from './ListItem.module.css'

/** Перенос задачи на другой день: где она стоит сейчас и что сделать с выбранным днём. */
export type MoveAction = { date: string; today: string; onPick: (date: string) => void }

type Props = {
  title: string
  done: boolean
  onToggle: (done: boolean) => void
  onRename: (title: string) => void
  onDelete: () => void
  /** Есть у невыполненных задач. У целей и выполненных задач переноса нет. */
  move?: MoveAction
}

/** Сенсорный экран: кнопок в строке нет, действия открываются свайпом. */
const TOUCH_QUERY = '(hover: none)'
/** Ширина кнопки, которая открывается под строкой. */
const REVEAL_PX = 72
/** С какого сдвига понятно, куда ведут палец: вбок (свайп) или вверх-вниз (прокрутка). */
const LOCK_PX = 8
/** Какую долю ширины строки нужно протянуть, чтобы действие сработало сразу, без нажатия на кнопку. */
const FULL_SWIPE = 0.6
const SETTLE_MS = 200

// offset: сдвиг строки. Больше нуля: строку увели влево (открывается удаление справа).
// Меньше нуля: увели вправо (открывается перенос слева).
type Gesture = { x: number; y: number; base: number; offset: number; axis: 'x' | 'y' | null }

/**
 * Строка задачи или цели. Клик по строке (кроме чекбокса и кнопок) включает переименование.
 * На компьютере при наведении появляются кнопки: перенос (у задач, открывает меню с днями)
 * и корзина. На сенсорных экранах, как в iOS: свайп влево открывает удаление, свайп вправо
 * перенос; короткий свайп показывает кнопку (у переноса она открывает то же меню шторкой),
 * длинный выполняет действие сразу.
 */
export function ListItem({ title, done, onToggle, onRename, onDelete, move }: Props) {
  const [editing, setEditing] = useState(false)
  const [open, setOpen] = useState<'delete' | 'move' | null>(null)
  const swipeRef = useRef<HTMLDivElement>(null)
  const gesture = useRef<Gesture | null>(null)
  // Сразу после свайпа браузер может прислать клик: он не должен включать переименование.
  const swiped = useRef(false)
  // Открыто ли меню переноса и где: под кнопкой (компьютер) или шторкой (сенсорный экран).
  const [moveMenu, setMoveMenu] = useState<DOMRect | 'sheet' | null>(null)
  // Быстрый перенос длинным свайпом: с прошедшего дня на сегодня, иначе на следующий день.
  const quick = move && moveTarget(move.date, move.today)

  const save = (next: string) => {
    if (next && next !== title) onRename(next)
    setEditing(false)
  }

  /** Сдвинуть строку. Стиль меняется напрямую, без перерисовки: строка идёт за пальцем. */
  const setOffset = (px: number) => {
    swipeRef.current?.style.setProperty('--reveal', `${Math.max(px, 0)}px`)
    swipeRef.current?.style.setProperty('--pull', `${Math.max(-px, 0)}px`)
  }

  const close = () => {
    setOpen(null)
    setOffset(0)
  }

  // Открытая кнопка прячется, как только нажали куда-то мимо этой строки.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && swipeRef.current?.contains(event.target)) return
      setOpen(null)
      swipeRef.current?.style.setProperty('--reveal', '0px')
      swipeRef.current?.style.setProperty('--pull', '0px')
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const onTouchStart = (event: TouchEvent) => {
    if (editing || !window.matchMedia(TOUCH_QUERY).matches) return
    const base = open === 'delete' ? REVEAL_PX : open === 'move' ? -REVEAL_PX : 0
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
    // Вправо строка едет, только если у неё есть перенос.
    current.offset = Math.max(current.base - dx, move ? -Infinity : 0)
    setOffset(current.offset)
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
    const { offset } = current
    if (offset > width * FULL_SWIPE) {
      // Протянули далеко влево: строка возвращается на место и удаляется (рассыпается в пыль).
      close()
      onDelete()
    } else if (move && offset < -width * FULL_SWIPE) {
      // Далеко вправо: задача переносится сразу, без меню.
      setOffset(-width)
      setTimeout(() => quick && move.onPick(quick.date), SETTLE_MS)
    } else if (offset > REVEAL_PX / 2) {
      setOpen('delete')
      setOffset(REVEAL_PX)
    } else if (offset < -REVEAL_PX / 2) {
      setOpen('move')
      setOffset(-REVEAL_PX)
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
      {/* Кнопки лежат под строкой и видны только на сенсорных экранах, когда строку сдвинули. */}
      {move && (
        <button
          type="button"
          className={styles.move}
          aria-label={`Перенести: ${title}`}
          tabIndex={open === 'move' ? 0 : -1}
          onClick={() => {
            close()
            setMoveMenu('sheet')
          }}
        >
          <ArrowBendUpRight aria-hidden />
        </button>
      )}
      <button
        type="button"
        className={styles.remove}
        aria-label={`Удалить: ${title}`}
        tabIndex={open === 'delete' ? 0 : -1}
        onClick={() => {
          close()
          onDelete()
        }}
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
            {move && (
              <IconButton
                variant="ghost"
                size="sm"
                icon={<ArrowBendUpRight aria-hidden />}
                aria-label={`Перенести: ${title}`}
                aria-haspopup="dialog"
                onClick={(event) => {
                  event.stopPropagation()
                  setMoveMenu(event.currentTarget.getBoundingClientRect())
                }}
              />
            )}
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
      {move && moveMenu && (
        <MoveMenu
          date={move.date}
          today={move.today}
          anchor={moveMenu}
          onClose={() => setMoveMenu(null)}
          onPick={(date) => {
            setMoveMenu(null)
            move.onPick(date)
          }}
        />
      )}
    </div>
  )
}
