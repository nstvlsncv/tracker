import { CaretDown } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cx } from '../lib/cx'
import { buttonClassName } from './buttonStyles'
import { Calendar } from './Calendar'
import styles from './CalendarPicker.module.css'

type Props = {
  /** day: выбирается день. week: неделя целиком, значение её понедельник. */
  mode: 'day' | 'week'
  /** 'yyyy-MM-dd' */
  value: string
  onChange: (value: string) => void
  /** Текст на кнопке: выбранный день или неделя. */
  label: string
  today: string
  /** Понедельники недель, в которых есть данные: в календаре они помечены точкой. */
  markedWeeks?: string[]
  variant?: 'main' | 'secondary'
  /** К какому краю кнопки прижат календарь. */
  align?: 'start' | 'end'
  /** Что выбирает кнопка: для скринридера. */
  'aria-label': string
  /** Содержимое под календарём. Клик по нему закрывает окошко. */
  footer?: ReactNode
}

/**
 * Кнопка с выбранным днём или неделей. По клику под ней открывается календарь.
 * В отличие от списка, не разрастается, сколько бы недель ни накопилось.
 */
export function CalendarPicker({
  mode,
  value,
  onChange,
  label,
  today,
  markedWeeks,
  variant = 'secondary',
  align = 'start',
  footer,
  ...rest
}: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Клик мимо закрывает календарь.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const close = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div
      ref={rootRef}
      className={styles.root}
      onKeyDown={(event) => {
        if (open && event.key === 'Escape') {
          event.stopPropagation()
          close()
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className={buttonClassName({ variant, size: 'lg' })}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        {...rest}
      >
        <span className={styles.value}>
          {label}
          <CaretDown className={cx(styles.chevron, open && styles.chevronOpen)} aria-hidden />
        </span>
      </button>
      {open && (
        <div
          data-popover
          className={cx(styles.popover, align === 'end' ? styles.end : styles.start)}
          role="dialog"
          {...rest}
        >
          <Calendar
            mode={mode}
            value={value}
            today={today}
            markedWeeks={markedWeeks}
            onChange={(next) => {
              onChange(next)
              close()
            }}
          />
          {footer && <div onClick={close}>{footer}</div>}
        </div>
      )}
    </div>
  )
}
