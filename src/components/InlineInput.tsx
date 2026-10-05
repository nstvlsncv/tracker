import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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
/** Одно нажатие «Готово» может прийти сразу несколькими событиями: лишние отбрасываются. */
const REPEAT_GUARD_MS = 100

/** Телефон или планшет: сенсорный экран либо узкое окно. */
const isTouch = () => window.matchMedia('(pointer: coarse), (max-width: 640px)').matches

/**
 * Инлайн-поле для добавления и переименования задач и целей (SPEC.md, раздел 11).
 * Растёт вниз: текст, который не помещается в строку, переносится на следующую, как в готовой
 * строке списка. Название остаётся однострочным по смыслу: Enter подтверждает ввод,
 * а переносы из вставленного текста заменяются пробелами.
 */
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
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const lastConfirm = useRef(0)

  // Высота подгоняется под текст при каждом его изменении.
  useLayoutEffect(() => {
    const field = inputRef.current
    if (!field) return
    field.style.height = 'auto'
    field.style.height = `${field.scrollHeight}px`
  }, [value])

  // Сохранить введённое и закрыть поле: по потере фокуса и по кнопке «Готово» на телефоне.
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

  // Подтверждение ввода: Enter на компьютере, «Готово» или галочка на клавиатуре телефона.
  const confirm = () => {
    const now = Date.now()
    if (now - lastConfirm.current < REPEAT_GUARD_MS) return
    lastConfirm.current = now

    // На телефоне подтверждение добавляет и закрывает поле вместе с клавиатурой.
    // Ввод нескольких строк подряд через Enter остаётся только на компьютере.
    if (isTouch()) {
      commit()
      return
    }
    const trimmed = inputRef.current?.value.trim()
    if (!trimmed) return
    if (onEnter(trimmed)) {
      setValue('')
      // Список вырос, поле уехало ниже: возвращаем его на вид.
      requestAnimationFrame(reveal)
    } else settled.current = true
  }
  const confirmRef = useRef(confirm)
  useEffect(() => {
    confirmRef.current = confirm
  })

  useEffect(() => {
    // Один раз и с задержкой: к этому моменту клавиатура телефона уже выехала.
    // Прокрутка на каждое изменение экрана заставляла страницу дёргаться.
    const timer = setTimeout(reveal, isTouch() ? KEYBOARD_DELAY_MS : 0)

    // Клавиатуры телефонов не всегда присылают нажатие Enter как клавишу (на Android оно
    // может прийти «неопознанным»). Зато перенос строки приходит
    // событием beforeinput: ловим и его.
    const input = inputRef.current
    const onBeforeInput = (event: InputEvent) => {
      if (event.inputType !== 'insertLineBreak') return
      event.preventDefault()
      confirmRef.current()
    }
    input?.addEventListener('beforeinput', onBeforeInput)
    return () => {
      clearTimeout(timer)
      input?.removeEventListener('beforeinput', onBeforeInput)
    }
  }, [])

  return (
    // Форма нужна ради её события submit: кнопка подтверждения на клавиатуре телефона
    // надёжнее всего срабатывает как отправка формы.
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault()
        confirm()
      }}
    >
      <textarea
        ref={inputRef}
        rows={1}
        className={`t-body-md ${styles.input}`}
        autoFocus
        enterKeyHint="done"
        value={value}
        maxLength={maxLength}
        onChange={(event) => setValue(event.target.value.replace(/\s*\n\s*/g, ' '))}
        onFocus={(event) => event.target.select()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation()
            settled.current = true
            onEscape()
          }
          if (event.key === 'Enter') {
            event.preventDefault()
            confirm()
          }
        }}
        onBlur={commit}
        {...rest}
      />
    </form>
  )
}
