import { Eye, EyeClosed, WarningCircle } from '@phosphor-icons/react'
import { useId, useState } from 'react'
import type { InputHTMLAttributes, Ref } from 'react'
import { cx } from '../lib/cx'
import styles from './Input.module.css'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  /** Текст ошибки под полем. */
  error?: string
  /** Пояснение под полем. Если есть ошибка, вместо него показывается она. */
  hint?: string
  /** Состояние error без своего текста (общая ошибка на несколько полей, как на входе). */
  invalid?: boolean
  /** Подпись только для скринридера, в поле вместо неё плейсхолдер (экран входа). */
  hideLabel?: boolean
  ref?: Ref<HTMLInputElement>
}

export function Input({
  label,
  error,
  hint,
  invalid,
  hideLabel,
  type = 'text',
  className,
  ref,
  ...rest
}: Props) {
  const id = useId()
  const [revealed, setRevealed] = useState(false)
  // Глаз моргает только после нажатия, не при появлении поля.
  const [blinked, setBlinked] = useState(false)
  const isPassword = type === 'password'
  const hasError = Boolean(error) || invalid

  return (
    <div className={cx(styles.field, className)}>
      <label htmlFor={id} className={hideLabel ? 'visually-hidden' : `t-caption ${styles.label}`}>
        {label}
      </label>
      <div className={styles.control}>
        <input
          ref={ref}
          id={id}
          type={isPassword && revealed ? 'text' : type}
          className={cx('t-body-md', styles.input, hasError && styles.error, isPassword && styles.withToggle)}
          aria-invalid={hasError || undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          placeholder={hideLabel ? label : undefined}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            className={styles.toggle}
            aria-label={revealed ? 'Скрыть пароль' : 'Показать пароль'}
            aria-pressed={revealed}
            disabled={rest.disabled}
            onClick={() => {
              setRevealed((value) => !value)
              setBlinked(true)
            }}
          >
            {/* Открытый глаз: пароль виден. Закрытый с ресничками: скрыт. Смена иконки
                пересоздаёт её (key), и она коротко «моргает». */}
            {revealed ? (
              <Eye key="open" className={cx(blinked && styles.blink)} aria-hidden />
            ) : (
              <EyeClosed key="closed" className={cx(blinked && styles.blink)} aria-hidden />
            )}
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className={`t-body-sm ${styles.message}`}>
          <WarningCircle aria-hidden />
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${id}-hint`} className={`t-body-sm ${styles.hint}`}>
          {hint}
        </p>
      )}
    </div>
  )
}
