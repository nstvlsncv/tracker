import { CaretDown } from '@phosphor-icons/react'
import { useEffect, useId, useRef, useState } from 'react'
import { cx } from '../lib/cx'
import { buttonClassName } from './buttonStyles'
import type { ButtonSize } from './buttonStyles'
import styles from './Dropdown.module.css'

export type DropdownOption<T extends string> = { value: T; label: string }

type Props<T extends string> = {
  options: DropdownOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Что выбирает список: для скринридера. */
  'aria-label': string
  size?: ButtonSize
  variant?: 'secondary' | 'ghost'
  /** К какому краю кнопки прижато меню. */
  align?: 'start' | 'end'
}

/** Выпадающий список: серая кнопка с текущим значением и меню под ней. */
export function Dropdown<T extends string>({
  options,
  value,
  onChange,
  size = 'lg',
  variant = 'secondary',
  align = 'end',
  ...rest
}: Props<T>) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const selected = options.find((option) => option.value === value)

  // При открытии фокус встаёт на выбранный пункт.
  useEffect(() => {
    if (!open) return
    const list = listRef.current
    const current = list?.querySelector<HTMLElement>('[aria-selected="true"]')
    ;(current ?? list?.querySelector<HTMLElement>('[role="option"]'))?.focus()
  }, [open])

  // Клик мимо закрывает список.
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

  const moveFocus = (step: number) => {
    const items = [...(listRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])]
    const index = items.indexOf(document.activeElement as HTMLElement)
    items[Math.max(0, Math.min(items.length - 1, index + step))]?.focus()
  }

  return (
    <div
      ref={rootRef}
      className={styles.root}
      onKeyDown={(event) => {
        if (!open) return
        if (event.key === 'Escape') {
          event.stopPropagation()
          close()
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault()
          moveFocus(event.key === 'ArrowDown' ? 1 : -1)
        }
        if (event.key === 'Tab') setOpen(false)
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className={buttonClassName({ variant, size })}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((value) => !value)}
        {...rest}
      >
        <span className={styles.value}>
          {selected?.label}
          <CaretDown className={cx(styles.chevron, open && styles.chevronOpen)} aria-hidden />
        </span>
      </button>
      {open && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          className={cx(styles.list, align === 'start' ? styles.start : styles.end)}
          {...rest}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={cx(
                't-body-md',
                styles.option,
                option.value === value && styles.optionSelected,
              )}
              onClick={() => {
                if (option.value !== value) onChange(option.value)
                close()
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
