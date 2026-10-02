import { X } from '@phosphor-icons/react'
import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
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
}

const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])'

/**
 * Карточка 650px по центру, на 120px ниже верхнего края. Крестик вынесен за карточку,
 * справа сверху. Внутреннего скролла нет: если контент не помещается, скроллится подложка.
 * На телефоне вместо карточки шторка, которая выезжает снизу.
 */
export function Modal({ open, title, onClose, children, footer, footerStart }: Props) {
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

  if (!open) return null

  return createPortal(
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
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
