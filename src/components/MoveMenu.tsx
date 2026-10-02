import { CalendarDots } from '@phosphor-icons/react'
import { parseISO } from 'date-fns'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cx } from '../lib/cx'
import { formatDayMonth } from '../lib/dates'
import { shiftDate } from '../lib/metrics'
import { Calendar } from './Calendar'
import { Modal } from './Modal'
import styles from './MoveMenu.module.css'

type Props = {
  /** День, на котором задача стоит сейчас, 'yyyy-MM-dd'. */
  date: string
  today: string
  /**
   * Где показать меню. Прямоугольник кнопки: выпадающий список под ней (компьютер).
   * 'sheet': модалка, на телефоне она выезжает шторкой (сенсорные экраны).
   */
  anchor: DOMRect | 'sheet'
  onPick: (date: string) => void
  onClose: () => void
}

/** Отступ списка от кнопки и от краёв окна. */
const GAP_PX = 8

/** Меню «куда перенести задачу»: быстрые варианты и выбор любого дня в календаре. */
export function MoveMenu({ date, today, anchor, onPick, onClose }: Props) {
  const [picking, setPicking] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [place, setPlace] = useState<{ top: number; left: number }>()

  const tomorrow = shiftDate(today, 1)
  const options = [
    { label: 'Сегодня', date: today },
    { label: 'Завтра', date: tomorrow },
    { label: 'Через неделю', date: shiftDate(date, 7) },
    // Тот день, где задача уже стоит, не предлагаем.
  ].filter((option) => option.date !== date)

  const content = picking ? (
    <Calendar mode="day" value={date} today={today} onChange={onPick} />
  ) : (
    <ul className={styles.options}>
      {options.map((option) => (
        <li key={option.label}>
          <button type="button" className={`t-body-md ${styles.option}`} onClick={() => onPick(option.date)}>
            <span>{option.label}</span>
            <span className={styles.day}>{formatDayMonth(parseISO(option.date))}</span>
          </button>
        </li>
      ))}
      <li>
        <button type="button" className={`t-body-md ${styles.option}`} onClick={() => setPicking(true)}>
          <span>Выбрать день</span>
          <CalendarDots className={styles.day} aria-hidden />
        </button>
      </li>
    </ul>
  )

  // Список встаёт под кнопкой, правым краем к её правому краю. Если снизу или слева
  // не хватает места, сдвигается так, чтобы целиком остаться в окне.
  useLayoutEffect(() => {
    const popover = popoverRef.current
    if (anchor === 'sheet' || !popover) return
    const { width, height } = popover.getBoundingClientRect()
    const below = anchor.bottom + GAP_PX
    const top = below + height > window.innerHeight - GAP_PX ? anchor.top - GAP_PX - height : below
    setPlace({
      top: Math.max(GAP_PX, top),
      left: Math.max(GAP_PX, Math.min(anchor.right - width, window.innerWidth - width - GAP_PX)),
    })
  }, [anchor, picking])

  // Список закрывается по Escape, по нажатию мимо и при прокрутке страницы.
  useEffect(() => {
    if (anchor === 'sheet') return
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && popoverRef.current?.contains(event.target)) return
      onClose()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onClose, { passive: true })
    window.addEventListener('resize', onClose)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onClose)
      window.removeEventListener('resize', onClose)
    }
  }, [anchor, onClose])

  if (anchor === 'sheet') {
    return (
      <Modal open title="Перенести задачу" onClose={onClose}>
        {content}
      </Modal>
    )
  }

  return createPortal(
    <div
      ref={popoverRef}
      className={cx(styles.popover, picking && styles.calendar)}
      role="dialog"
      aria-label="Перенести задачу"
      // Пока место не посчитано, список невидим: иначе он мелькнул бы в углу окна.
      style={place ? place : { visibility: 'hidden' }}
      onClick={(event) => event.stopPropagation()}
    >
      {content}
    </div>,
    document.body,
  )
}
