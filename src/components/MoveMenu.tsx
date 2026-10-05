import { CaretRight } from '@phosphor-icons/react'
import { parseISO } from 'date-fns'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { cx } from '../lib/cx'
import { formatDayMonth } from '../lib/dates'
import type { Repeat } from '../data/types'
import { shiftDate } from '../lib/metrics'
import { REPEAT_OPTIONS } from '../lib/repeat'
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
  /** Сделать задачу повторяющейся начиная с её дня. Нет функции: пунктов повтора в меню нет. */
  onRepeat?: (repeat: Repeat) => void
  onClose: () => void
}

/** Отступ списка от кнопки, вложенного списка от основного и обоих от краёв окна. */
const GAP_PX = 8
const HIDDEN: CSSProperties = { visibility: 'hidden' }

type Place = { top: number; left: number }

/**
 * Меню «куда перенести задачу»: быстрые варианты и «Выбрать день». На компьютере это
 * выпадающий список, а календарь открывается рядом вложенным списком, когда на пункт
 * «Выбрать день» наводят курсор или нажимают. На сенсорных экранах меню показывается
 * модалкой (на телефоне шторкой), календарь встаёт на место списка. Ниже, если задача ещё не
 * повторяется, пункты «Повторять»: каждый день, по будням, раз в неделю.
 */
export function MoveMenu({ date, today, anchor, onPick, onRepeat, onClose }: Props) {
  const [picking, setPicking] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const pickRef = useRef<HTMLButtonElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)
  const [place, setPlace] = useState<Place>()
  const [calendarPlace, setCalendarPlace] = useState<Place>()

  const options = [
    { label: 'Сегодня', date: today },
    { label: 'Завтра', date: shiftDate(today, 1) },
    { label: 'Через неделю', date: shiftDate(date, 7) },
    // Тот день, где задача уже стоит, не предлагаем.
  ].filter((option) => option.date !== date)

  const calendar = <Calendar mode="day" value={date} today={today} onChange={onPick} />
  const sheet = anchor === 'sheet'

  const list = (
    <ul className={styles.options}>
      {options.map((option) => (
        <li key={option.label}>
          <button
            type="button"
            className={`t-body-md ${styles.option}`}
            // Курсор ушёл на другой пункт: вложенный календарь закрывается.
            onMouseEnter={() => setPicking(false)}
            onClick={() => onPick(option.date)}
          >
            <span>{option.label}</span>
            <span className={styles.day}>{formatDayMonth(parseISO(option.date))}</span>
          </button>
        </li>
      ))}
      <li>
        <button
          ref={pickRef}
          type="button"
          className={cx('t-body-md', styles.option, picking && styles.optionOpen)}
          aria-haspopup="dialog"
          aria-expanded={picking}
          onMouseEnter={() => !sheet && setPicking(true)}
          onClick={() => setPicking(true)}
        >
          <span>Выбрать день</span>
          <CaretRight className={styles.day} aria-hidden />
        </button>
      </li>
      {/* Задачу, которая ещё не повторяется, можно сделать повторяющейся прямо отсюда. */}
      {onRepeat && (
        <>
          <li className={`t-caption ${styles.group}`}>Повторять</li>
          {REPEAT_OPTIONS.filter((option) => option.value !== 'none').map((option) => (
            <li key={option.value}>
              <button
                type="button"
                className={`t-body-md ${styles.option}`}
                onMouseEnter={() => setPicking(false)}
                onClick={() => onRepeat(option.value as Repeat)}
              >
                <span>{option.label}</span>
              </button>
            </li>
          ))}
        </>
      )}
    </ul>
  )

  // Список встаёт под кнопкой, правым краем к её правому краю. Если снизу или слева
  // не хватает места, сдвигается так, чтобы целиком остаться в окне.
  useLayoutEffect(() => {
    const popover = listRef.current
    if (anchor === 'sheet' || !popover) return
    const { width, height } = popover.getBoundingClientRect()
    const below = anchor.bottom + GAP_PX
    const top = below + height > window.innerHeight - GAP_PX ? anchor.top - GAP_PX - height : below
    setPlace({
      top: Math.max(GAP_PX, top),
      left: Math.max(GAP_PX, Math.min(anchor.right - width, window.innerWidth - width - GAP_PX)),
    })
  }, [anchor])

  // Календарь встаёт сбоку от списка, на уровне пункта «Выбрать день»: справа, а если там
  // нет места, слева. По высоте сдвигается так, чтобы целиком остаться в окне.
  useLayoutEffect(() => {
    const menu = listRef.current
    const item = pickRef.current
    const box = calendarRef.current
    if (!picking || !place || !menu || !item || !box) return
    const menuRect = menu.getBoundingClientRect()
    const { width, height } = box.getBoundingClientRect()
    const right = menuRect.right + GAP_PX
    const left = right + width > window.innerWidth - GAP_PX ? menuRect.left - GAP_PX - width : right
    const top = Math.min(item.getBoundingClientRect().top - GAP_PX, window.innerHeight - GAP_PX - height)
    setCalendarPlace({ top: Math.max(GAP_PX, top), left: Math.max(GAP_PX, left) })
  }, [picking, place])

  // Меню закрывается по Escape, по нажатию мимо и при прокрутке страницы.
  useEffect(() => {
    if (anchor === 'sheet') return
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) return
      onClose()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    // capture: ловим прокрутку любого блока (ряд дней листается сам по себе), не только страницы.
    window.addEventListener('scroll', onClose, { passive: true, capture: true })
    window.addEventListener('resize', onClose)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onClose, { capture: true })
      window.removeEventListener('resize', onClose)
    }
  }, [anchor, onClose])

  if (sheet) {
    return (
      <Modal open title="Перенести задачу" onClose={onClose}>
        {picking ? calendar : list}
      </Modal>
    )
  }

  return createPortal(
    <div ref={rootRef} onClick={(event) => event.stopPropagation()}>
      <div
        ref={listRef}
        className={styles.popover}
        role="dialog"
        aria-label="Перенести задачу"
        // Пока место не посчитано, список невидим: иначе он мелькнул бы в углу окна.
        style={place ?? HIDDEN}
      >
        {list}
      </div>
      {picking && (
        <div
          ref={calendarRef}
          className={cx(styles.popover, styles.calendar)}
          role="dialog"
          aria-label="Выбрать день"
          style={calendarPlace ?? HIDDEN}
        >
          {calendar}
        </div>
      )}
    </div>,
    document.body,
  )
}
