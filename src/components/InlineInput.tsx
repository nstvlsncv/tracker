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

/** Насколько должна вырасти видимая часть экрана, чтобы считать, что клавиатуру убрали. */
const KEYBOARD_MIN_HEIGHT = 120
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

  // Сохранить введённое и закрыть поле. Так же срабатывает потеря фокуса.
  const commit = () => {
    if (settled.current) return
    settled.current = true
    onBlur(inputRef.current?.value.trim() ?? '')
  }
  const commitRef = useRef(commit)
  useEffect(() => {
    commitRef.current = commit
  })

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

    const viewport = window.visualViewport
    if (!viewport) return () => clearTimeout(timer)
    let height = viewport.height
    const onResize = () => {
      const grew = viewport.height - height
      height = viewport.height
      // Видимая часть экрана заметно выросла: клавиатуру убрали. На телефоне это значит
      // «готово»: сохраняем введённое и закрываем поле.
      if (grew > KEYBOARD_MIN_HEIGHT && isTouch()) commitRef.current()
    }
    viewport.addEventListener('resize', onResize)
    return () => {
      clearTimeout(timer)
      viewport.removeEventListener('resize', onResize)
    }
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
