import { IconAlertCircle, IconEye, IconEyeOff } from '@tabler/icons-react'
import { useId, useState } from 'react'
import type { InputHTMLAttributes, Ref } from 'react'
import { cx } from '../lib/cx'
import styles from './Input.module.css'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  /** Текст ошибки под полем. */
  error?: string
  /** Состояние error без своего текста (общая ошибка на несколько полей, как на входе). */
  invalid?: boolean
  /** Подпись только для скринридера, в поле вместо неё плейсхолдер (экран входа). */
  hideLabel?: boolean
  ref?: Ref<HTMLInputElement>
}

export function Input({
  label,
  error,
  invalid,
  hideLabel,
  type = 'text',
  className,
  ref,
  ...rest
}: Props) {
  const id = useId()
  const [revealed, setRevealed] = useState(false)
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
          aria-describedby={error ? `${id}-error` : undefined}
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
            onClick={() => setRevealed((value) => !value)}
          >
            {revealed ? <IconEyeOff aria-hidden /> : <IconEye aria-hidden />}
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className={`t-body-sm ${styles.message}`}>
          <IconAlertCircle aria-hidden />
          {error}
        </p>
      )}
    </div>
  )
}
