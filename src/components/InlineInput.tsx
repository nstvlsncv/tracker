import { useRef, useState } from 'react'
import { ITEM_TITLE_MAX_LENGTH } from '../lib/constants'
import styles from './InlineInput.module.css'

type Props = {
  initialValue?: string
  placeholder?: string
  maxLength?: number
  'aria-label': string
  /** Enter с непустым значением. Вернуть true, чтобы очистить поле и продолжить ввод. */
  onEnter: (value: string) => boolean | void
  /** Потеря фокуса. Значение уже обрезано, может быть пустым. */
  onBlur: (value: string) => void
  onEscape: () => void
}

/** Инлайн-поле для добавления и переименования задач и целей (SPEC.md, раздел 11). */
export function InlineInput({
  initialValue = '',
  maxLength = ITEM_TITLE_MAX_LENGTH,
  onEnter,
  onBlur,
  onEscape,
  ...rest
}: Props) {
  const [value, setValue] = useState(initialValue)
  // Esc и Enter размонтируют поле. Флаг не даёт blur сработать после них второй раз.
  const settled = useRef(false)

  return (
    <input
      className={`t-body-md ${styles.input}`}
      autoFocus
      value={value}
      maxLength={maxLength}
      onChange={(event) => setValue(event.target.value)}
      onFocus={(event) => event.target.select()}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation()
          settled.current = true
          onEscape()
        }
        if (event.key === 'Enter') {
          const trimmed = value.trim()
          if (!trimmed) return
          if (onEnter(trimmed)) setValue('')
          else settled.current = true
        }
      }}
      onBlur={() => {
        if (!settled.current) onBlur(value.trim())
      }}
      {...rest}
    />
  )
}
