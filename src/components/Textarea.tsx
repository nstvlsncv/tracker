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

  // Высота подгоняется под текст при каждом его изменении и когда меняется ширина поля:
  // при первой отрисовке ширина ещё могла быть другой (шрифт, раскладка экрана), и длинный
  // текст обрезался снизу.
  useLayoutEffect(() => {
    const field = ref.current
    if (!field) return
    let width = 0
    const fit = () => {
      field.style.height = 'auto'
      field.style.height = `${field.scrollHeight + 2}px`
    }
    fit()
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width === width) return
      width = entry.contentRect.width
      fit()
    })
    observer.observe(field)
    return () => observer.disconnect()
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
