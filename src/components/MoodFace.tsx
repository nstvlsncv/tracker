import type { CSSProperties } from 'react'
import type { Mood } from '../data/types'
import { cx } from '../lib/cx'
import { moodKind } from '../lib/moods'
import styles from './MoodFace.module.css'

type Props = {
  /** Настроение. null: день без отметки, серое лицо. */
  mood: Mood | null
  /** Диаметр: число в пикселях или размер в CSS. */
  size?: number | string
  className?: string
}

/**
 * Лицо маскота с настроением дня: тот же круг с глазами, только неживой (не следит и не моргает),
 * поэтому их можно рисовать сотнями в истории. У каждого настроения свой цвет (от зелёного к красному)
 * и своё выражение глаз.
 * Украшение: подпись даёт тот, кто его показывает.
 */
export function MoodFace({ mood, size = 32, className }: Props) {
  const style = { '--size': typeof size === 'number' ? `${size}px` : size } as CSSProperties
  return (
    <span
      className={cx(styles.face, mood ? styles[moodKind(mood)] : styles.none, className)}
      style={style}
      aria-hidden
    >
      <span className={styles.eyes}>
        <span className={styles.eye} />
        <span className={styles.eye} />
      </span>
    </span>
  )
}
