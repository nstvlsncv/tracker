import type { ReactNode } from 'react'
import { cx } from '../lib/cx'
import { RollingNumber } from './RollingNumber'
import { Skeleton } from './Skeleton'
import styles from './StatCard.module.css'

type Props = {
  value: ReactNode
  label: string
  /**
   * muted: серая карточка на белой странице (статистика недели, KPI на Главной).
   * inverse: чёрная, главный акцент ряда. surface: белая, внутри серой секции.
   */
  variant?: 'muted' | 'inverse' | 'surface'
  /** Данные ещё загружаются: вместо значения серая заглушка. */
  loading?: boolean
}

/** Карточка с одним показателем: крупное значение и подпись под ним, всё по центру. */
export function StatCard({ value, label, variant = 'muted', loading }: Props) {
  return (
    <div className={cx(styles.card, styles[variant])}>
      <span className={variant === 'surface' ? 't-heading-5' : 't-heading-2'}>
        {loading ? (
          <Skeleton width={56} height="1em" />
        ) : typeof value === 'number' || typeof value === 'string' ? (
          // Числа появляются как счётчик: цифры проворачиваются от нуля.
          <RollingNumber value={value} />
        ) : (
          value
        )}
      </span>
      <span className={cx('t-body-md', styles.label)}>{label}</span>
    </div>
  )
}
