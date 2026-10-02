import { cx } from '../lib/cx'
import styles from './Donut.module.css'

type Props = {
  /** Процент 0–100 или null, если считать не из чего (в центре прочерк). */
  value: number | null
  size?: 'sm' | 'lg'
}

const SIZES = {
  sm: { diameter: 72, stroke: 6 },
  lg: { diameter: 120, stroke: 10 },
}

export function Donut({ value, size = 'sm' }: Props) {
  const { diameter, stroke } = SIZES[size]
  const radius = (diameter - stroke) / 2
  const length = 2 * Math.PI * radius
  const center = diameter / 2
  const label = value === null ? '—' : `${value}%`

  return (
    <div
      className={styles.donut}
      style={{ width: diameter, height: diameter }}
      role="img"
      aria-label={value === null ? 'Нет задач' : `Выполнено ${value}%`}
    >
      <svg width={diameter} height={diameter} viewBox={`0 0 ${diameter} ${diameter}`} aria-hidden>
        <circle className={styles.track} cx={center} cy={center} r={radius} strokeWidth={stroke} />
        {value !== null && value > 0 && (
          <circle
            className={styles.fill}
            cx={center}
            cy={center}
            r={radius}
            strokeWidth={stroke}
            strokeDasharray={length}
            strokeDashoffset={length * (1 - Math.min(value, 100) / 100)}
            transform={`rotate(-90 ${center} ${center})`}
          />
        )}
      </svg>
      <span
        className={cx(
          styles.label,
          size === 'lg' ? 't-number-lg' : 't-number-sm',
          value === null && styles.muted,
        )}
      >
        {label}
      </span>
    </div>
  )
}
