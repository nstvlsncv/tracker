import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { cx } from '../lib/cx'
import { fireBurst } from './fireBurst'
import { RollingNumber } from './RollingNumber'
import { Skeleton } from './Skeleton'
import styles from './StatCard.module.css'

type Props = {
  value: ReactNode
  label: string
  /**
   * muted: серая карточка на белой странице (статистика недели, KPI на Главной).
   * inverse: чёрная. surface: белая, внутри серой секции.
   * highlight: лаймовая, главный показатель ряда.
   */
  variant?: 'muted' | 'inverse' | 'surface' | 'highlight'
  /** Данные ещё загружаются: вместо значения серая заглушка. */
  loading?: boolean
  /** Показатель дошёл до цели (прогресс дня 100%): когда это случается на глазах, салют. */
  celebrate?: boolean
}

/** Карточка с одним показателем: крупное значение и подпись под ним, всё по центру. */
export function StatCard({ value, label, variant = 'muted', loading, celebrate = false }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  // Каким показатель был в прошлый раз. Пока данные грузятся, не считается: если всё уже
  // было выполнено при открытии экрана, салюта нет.
  const previous = useRef<boolean | null>(null)
  useEffect(() => {
    if (loading) return
    if (previous.current === false && celebrate && ref.current) fireBurst(ref.current, 52, 96)
    previous.current = celebrate
  }, [celebrate, loading])

  return (
    <div ref={ref} className={cx(styles.card, styles[variant])}>
      <span className={variant === 'surface' ? 't-heading-5' : 't-heading-2'}>
        {loading ? (
          <Skeleton width={56} height="1em" />
        ) : typeof value === 'number' || (typeof value === 'string' && /\d/.test(value)) ? (
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
