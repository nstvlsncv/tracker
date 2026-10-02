import { useEffect, useRef, useState } from 'react'
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
  const inputRef = useRef<HTMLInputElement>(null)

  // Поле должно быть на виду. На компьютере страница двигается, только если поля не видно.
  // На телефоне поле ставится в середину видимой части экрана: нижнюю часть занимает
  // клавиатура, и браузер про неё при обычной прокрутке не знает.
  const reveal = () => {
    const input = inputRef.current
    if (!input) return
    const viewport = window.visualViewport
    if (!viewport || !window.matchMedia('(pointer: coarse)').matches) {
      input.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
      return
    }
    // Сначала обычная прокрутка: она же докручивает по горизонтали карточки дней.
    input.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    const rect = input.getBoundingClientRect()
    const middle = viewport.offsetTop + viewport.height / 2
    window.scrollBy({ top: rect.top + rect.height / 2 - middle })
  }

  useEffect(() => {
    reveal()
    // Клавиатура телефона выезжает не сразу: когда видимая часть экрана уменьшится, ставим поле заново.
    const viewport = window.visualViewport
    viewport?.addEventListener('resize', reveal)
    return () => viewport?.removeEventListener('resize', reveal)
  }, [])

  return (
    <input
      ref={inputRef}
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
          if (onEnter(trimmed)) {
            setValue('')
            // Список вырос, поле уехало ниже: возвращаем его на вид.
            requestAnimationFrame(reveal)
          } else settled.current = true
        }
      }}
      onBlur={() => {
        if (!settled.current) onBlur(value.trim())
      }}
      {...rest}
    />
  )
}
