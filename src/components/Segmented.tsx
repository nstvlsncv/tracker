import type { ReactNode } from 'react'
import { cx } from '../lib/cx'
import styles from './Segmented.module.css'

type Option<T extends string> = { value: T; label: string; icon?: ReactNode }

type Props<T extends string> = {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  /** Что выбирает переключатель: для скринридера. */
  'aria-label': string
}

/** Переключатель из нескольких вариантов в одной плашке: выбран всегда ровно один. */
export function Segmented<T extends string>({ options, value, onChange, ...rest }: Props<T>) {
  return (
    <div role="radiogroup" className={styles.group} {...rest}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className={cx('t-button', styles.option, option.value === value && styles.selected)}
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  )
}
