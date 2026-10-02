import type { CSSProperties } from 'react'
import styles from './Skeleton.module.css'

type Props = {
  width?: CSSProperties['width']
  height?: CSSProperties['height']
  /** Круг: для чекбоксов и донатов. */
  round?: boolean
}

/** Серая заглушка на месте блока, пока данные загружаются. */
export function Skeleton({ width = '100%', height = 20, round }: Props) {
  return (
    <span
      className={`${styles.skeleton} ${round ? styles.round : ''}`}
      style={{ width, height }}
      aria-hidden
    />
  )
}
