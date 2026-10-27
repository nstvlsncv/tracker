import { useLayoutEffect, useRef } from 'react'
import type { ComponentProps } from 'react'
import { Input } from '../../components/Input'
import { spaceAmount } from '../../lib/finance'

type Props = Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'ref'> & {
  value: string
  onChange: (value: string) => void
}

/** Сколько цифр и запятых стоит в строке до позиции `end`: пробелы не в счёт. */
const significant = (text: string, end: number) => text.slice(0, end).replace(/[^\d,]/g, '').length

/** Поставить курсор за `count` значимых знаков строки `text`. */
function setCaret(input: HTMLInputElement, text: string, count: number) {
  let position = 0
  let seen = 0
  while (position < text.length && seen < count) {
    if (/[\d,]/.test(text[position])) seen++
    position++
  }
  input.setSelectionRange(position, position)
}

/**
 * Поле суммы: пока печатают, тысячи сами разделяются пробелами («1 000»), как в суммах
 * на экране. Пробелы вставляются и пропадают сами, поэтому курсор после форматирования
 * ставится обратно за ту же цифру, а не прыгает в конец.
 */
export function AmountInput({ value, onChange, ...rest }: Props) {
  const ref = useRef<HTMLInputElement>(null)
  // Сколько значимых знаков было до курсора: после отрисовки курсор встанет за них же.
  const caret = useRef<number | null>(null)

  // Без списка зависимостей: курсор ставится после каждой отрисовки, которой он ждёт.
  useLayoutEffect(() => {
    const input = ref.current
    if (caret.current === null || !input || document.activeElement !== input) return
    setCaret(input, value, caret.current)
    caret.current = null
  })

  return (
    <Input
      {...rest}
      ref={ref}
      inputMode="decimal"
      autoComplete="off"
      value={value}
      onChange={(event) => {
        let raw = event.target.value.replace(/\./g, ',')
        let at = significant(raw, event.target.selectionStart ?? raw.length)
        // Стёрли только пробел между тысячами: стираем цифру перед ним, как ждёт человек.
        if (raw.length < value.length && spaceAmount(raw) === value && at > 0) {
          let seen = 0
          raw = [...raw]
            .filter((char) => !/[\d,]/.test(char) || ++seen !== at)
            .join('')
          at -= 1
        }
        caret.current = at
        onChange(spaceAmount(raw))
        // Значение не изменилось (набрали букву): React не отрисует поле заново, а вернёт
        // в него прежний текст, и курсор уедет в конец. Ставим его на место после этого.
        if (spaceAmount(raw) === value) {
          const input = event.target
          caret.current = null
          requestAnimationFrame(() => setCaret(input, value, at))
        }
      }}
    />
  )
}
