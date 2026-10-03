import { useId, useLayoutEffect, useRef } from 'react'
import type { TextareaHTMLAttributes } from 'react'
import { cx } from '../lib/cx'
import styles from './Textarea.module.css'

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string
  /** Подпись только для скринридера, в поле вместо неё плейсхолдер. */
  hideLabel?: boolean
}

/** Многострочное поле. Растёт вместе с текстом, своей прокрутки у него нет. */
export function Textarea({ label, hideLabel, className, value, ...rest }: Props) {
  const id = useId()
  const ref = useRef<HTMLTextAreaElement>(null)

  // Высота подгоняется под текст при каждом его изменении.
  useLayoutEffect(() => {
    const field = ref.current
    if (!field) return
    field.style.height = 'auto'
    field.style.height = `${field.scrollHeight + 2}px`
  }, [value])

  return (
    <div className={cx(styles.field, className)}>
      <label htmlFor={id} className={hideLabel ? 'visually-hidden' : `t-caption ${styles.label}`}>
        {label}
      </label>
      <textarea
        ref={ref}
        id={id}
        rows={2}
        className={`t-body-md ${styles.textarea}`}
        placeholder={hideLabel ? label : undefined}
        value={value}
        {...rest}
      />
    </div>
  )
}
