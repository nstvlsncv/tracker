import type { ReactNode } from 'react'
import { cx } from '../lib/cx'
import styles from './StatCard.module.css'

type Props = {
  value: ReactNode
  label: string
  /** surface: белая вложенная карточка. muted и inverse: KPI на Главной. */
  variant?: 'surface' | 'muted' | 'inverse'
  /** Значение словом («Каждый день», «пн»), а не числом: набирается Unbounded. */
  textValue?: boolean
}

export function StatCard({ value, label, variant = 'surface', textValue }: Props) {
  return (
    <div className={cx(styles.card, styles[variant])}>
      <span className={textValue ? 't-heading-5' : 't-number-lg'}>{value}</span>
      <span className={`t-caption ${styles.label}`}>{label}</span>
    </div>
  )
}
