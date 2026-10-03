import { X } from '@phosphor-icons/react'
import { useEffect, useId, useLayoutEffect, useRef } from 'react'
import type { ReactNode, TouchEvent } from 'react'
import { createPortal } from 'react-dom'
import { cx } from '../lib/cx'
import { IconButton } from './IconButton'
import styles from './Modal.module.css'

type Props = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** Кнопки справа внизу: «Отмена» и основное действие. */
  footer?: ReactNode
  /** Действие слева внизу (например, «Архивировать»). */
  footerStart?: ReactNode
  /** md 650px: формы. sm 450px: подтверждения, где только вопрос и две кнопки. */
  size?: 'md' | 'sm'
}

/** Когда модалка показывается шторкой снизу. */
const SHEET_QUERY = '(max-width: 640px)'
/** С какого сдвига палец считается тянущим шторку, а не тапающим по ней. */
const DRAG_START_PX = 8
/** На сколько нужно утянуть шторку вниз, чтобы она закрылась. */
const DRAG_CLOSE_PX = 100
const SHEET_SETTLE_MS = 200
/** Сколько длится исчезновение модалки. То же число стоит в Modal.module.css. */
const CLOSE_MS = 180

const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])'

/**
 * Карточка 650px (подтверждения 450px) по центру, на 120px ниже верхнего края. Крестик вынесен за карточку,
 * справа сверху. Внутреннего скролла нет: если контент не помещается, скроллится подложка.
 * На телефоне вместо карточки шторка: выезжает снизу и закрывается свайпом вниз.
 */
export function Modal({ open, title, onClose, children, footer, footerStart, size = 'md' }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const dialog = dialogRef.current
    if (!open || !dialog) return

    const previous = document.activeElement
    // На компьютере фокус сразу встаёт в первое поле. На телефоне нет: там это выдвинуло бы
    // клавиатуру поверх шторки и закрыло всё, что под полем.
    const touch = window.matchMedia('(pointer: coarse)').matches
    const field = touch ? null : dialog.querySelector<HTMLElement>('input:not(:disabled)')
    ;(field ?? dialog).focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      // Фокус-ловушка: Tab ходит по кругу внутри модалки.
      const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)]
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (!dialog.contains(active) || (event.shiftKey && (active === first || active === dialog))) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first?.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [open])

  // --- Плавное исчезновение ---
  // Модалку убирают из страницы сразу, как только она не нужна, поэтому «уходит» не она сама,
  // а её неживая копия: копия остаётся на долю секунды, растворяется и удаляется.
  const overlayRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const overlay = overlayRef.current
    if (!open || !overlay) return
    return () => {
      queueMicrotask(() => {
        // Оригинал ещё в странице: это не закрытие, а повторный прогон эффектов в режиме разработки.
        if (overlay.isConnected) return
        const ghost = overlay.cloneNode(true) as HTMLElement
        ghost.classList.add(styles.closing)
        ghost.setAttribute('aria-hidden', 'true')
        ghost.inert = true
        document.body.appendChild(ghost)
        setTimeout(() => ghost.remove(), CLOSE_MS)
      })
    }
  }, [open])

  // --- Шторка на телефоне закрывается свайпом вниз ---
  const drag = useRef<{ startY: number; offset: number } | null>(null)

  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const dialog = dialogRef.current
    // Только для шторки и только когда её содержимое не прокручено: иначе жест нужен прокрутке.
    if (!dialog || !window.matchMedia(SHEET_QUERY).matches || dialog.scrollTop > 0) return
    drag.current = { startY: event.touches[0].clientY, offset: 0 }
  }

  const onTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    const dialog = dialogRef.current
    if (!dialog || !drag.current) return
    const offset = event.touches[0].clientY - drag.current.startY
    // Небольшое движение считаем обычным тапом, движение вверх не тянет шторку.
    drag.current.offset = offset > DRAG_START_PX ? offset : 0
    dialog.style.transition = 'none'
    dialog.style.transform = drag.current.offset ? `translateY(${drag.current.offset}px)` : ''
  }

  const onTouchEnd = () => {
    const dialog = dialogRef.current
    if (!dialog || !drag.current) return
    const { offset } = drag.current
    drag.current = null
    dialog.style.transition = `transform ${SHEET_SETTLE_MS}ms ease-out`
    if (offset > DRAG_CLOSE_PX) {
      // Утянули достаточно далеко: шторка уезжает вниз и закрывается.
      dialog.style.transform = 'translateY(100%)'
      setTimeout(() => onCloseRef.current(), SHEET_SETTLE_MS)
    } else {
      dialog.style.transform = ''
    }
  }

  if (!open) return null

  return createPortal(
    <div
      ref={overlayRef}
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className={cx(styles.dialog, size === 'sm' && styles.small)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <h2 id={titleId} className="t-heading-4">
          {title}
        </h2>
        <div className={styles.content}>{children}</div>
        {(footer || footerStart) && (
          <footer className={styles.footer}>
            <div>{footerStart}</div>
            <div className={styles.actions}>{footer}</div>
          </footer>
        )}
        {/* В разметке последний, чтобы фокус сначала попадал в поля, а визуально вынесен наружу. */}
        <IconButton
          className={styles.close}
          variant="secondary"
          icon={<X aria-hidden />}
          aria-label="Закрыть"
          onClick={onClose}
        />
      </div>
    </div>,
    document.body,
  )
}
