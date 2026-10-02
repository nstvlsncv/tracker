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

/** Сколько ждать, пока выедет клавиатура телефона, прежде чем прокручивать к полю. */
const KEYBOARD_DELAY_MS = 350

const isTouch = () => window.matchMedia('(pointer: coarse)').matches

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

  // Сохранить введённое и закрыть поле: по потере фокуса и по кнопке «Готово» на телефоне.
  // Скрытие клавиатуры отдельно не отслеживается: размер экрана на телефоне меняют ещё и
  // панели браузера, и угадывать по нему клавиатуру ненадёжно (поле закрывалось само).
  const commit = () => {
    if (settled.current) return
    settled.current = true
    onBlur(inputRef.current?.value.trim() ?? '')
  }

  // Поле должно быть на виду. На компьютере страница двигается, только если поля не видно.
  // На телефоне поле ставится в середину экрана: нижнюю половину занимает клавиатура.
  const reveal = () => {
    inputRef.current?.scrollIntoView({
      block: isTouch() ? 'center' : 'nearest',
      inline: 'nearest',
      behavior: 'smooth',
    })
  }

  useEffect(() => {
    // Один раз и с задержкой: к этому моменту клавиатура телефона уже выехала.
    // Прокрутка на каждое изменение экрана заставляла страницу дёргаться.
    const timer = setTimeout(reveal, isTouch() ? KEYBOARD_DELAY_MS : 0)
    return () => clearTimeout(timer)
  }, [])

  return (
    <input
      ref={inputRef}
      className={`t-body-md ${styles.input}`}
      autoFocus
      enterKeyHint="done"
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
          // На телефоне кнопка «Готово» на клавиатуре добавляет и закрывает поле вместе с
          // клавиатурой. Ввод нескольких строк подряд через Enter остаётся только на компьютере.
          if (isTouch()) {
            commit()
            return
          }
          const trimmed = value.trim()
          if (!trimmed) return
          if (onEnter(trimmed)) {
            setValue('')
            // Список вырос, поле уехало ниже: возвращаем его на вид.
            requestAnimationFrame(reveal)
          } else settled.current = true
        }
      }}
      onBlur={commit}
      {...rest}
    />
  )
}
