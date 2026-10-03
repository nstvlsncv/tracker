import { useEffect, useRef, useState } from 'react'
import { Section } from '../../components/Section'
import { Textarea } from '../../components/Textarea'
import { usePlanner } from '../../data/usePlanner'
import { NOTE_MAX_LENGTH } from '../../lib/constants'

/** Через сколько после последнего нажатия клавиши заметка сохраняется сама. */
const SAVE_DELAY_MS = 1000

/**
 * Заметка недели: одно текстовое поле под днями. Сохраняется сама: через секунду после
 * того, как перестали печатать, и когда из поля уходят. Кнопки «Сохранить» нет.
 */
export function WeekNote({ weekStart }: { weekStart: string }) {
  const { notes, saveNote } = usePlanner()
  const [text, setText] = useState(notes?.[weekStart] ?? '')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  // Последний набранный текст: его нужно сохранить, если экран закрыли, не дождавшись паузы.
  const pending = useRef<string | null>(null)

  const flush = () => {
    clearTimeout(timer.current)
    if (pending.current === null) return
    saveNote(weekStart, pending.current.trim())
    pending.current = null
  }
  const flushRef = useRef(flush)
  useEffect(() => {
    flushRef.current = flush
  })
  useEffect(() => () => flushRef.current(), [])

  return (
    <Section title="Заметка недели">
      <Textarea
        label="Как прошла неделя? Мысли, итоги, планы"
        hideLabel
        maxLength={NOTE_MAX_LENGTH}
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          pending.current = event.target.value
          clearTimeout(timer.current)
          timer.current = setTimeout(flush, SAVE_DELAY_MS)
        }}
        onBlur={flush}
      />
    </Section>
  )
}
