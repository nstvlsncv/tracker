import { cx } from '../lib/cx'
import { useAfterMount } from '../lib/useAfterMount'
import { RollingNumber } from './RollingNumber'
import styles from './Donut.module.css'

type Props = {
  /** Процент 0–100 или null, если считать не из чего (в центре прочерк). */
  value: number | null
  /** sm 72px, lg 120px, xl 150px (карточки дней). */
  size?: 'sm' | 'lg' | 'xl'
}

const SIZES = {
  sm: { diameter: 72, stroke: 6 },
  lg: { diameter: 120, stroke: 10 },
  xl: { diameter: 150, stroke: 14 },
}

/**
 * Кольцо прогресса. При появлении полоска заполняется от нуля, а процент в центре
 * проворачивается как счётчик; при смене значения оба плавно переходят к новому.
 */
export function Donut({ value, size = 'sm' }: Props) {
  const ready = useAfterMount()
  const { diameter, stroke } = SIZES[size]
  const radius = (diameter - stroke) / 2
  const length = 2 * Math.PI * radius
  const center = diameter / 2
  const filled = ready && value !== null ? Math.min(value, 100) / 100 : 0

  return (
    <div
      className={styles.donut}
      style={{ width: diameter, height: diameter }}
      role="img"
      aria-label={value === null ? 'Нет задач' : `Выполнено ${value}%`}
    >
      <svg width={diameter} height={diameter} viewBox={`0 0 ${diameter} ${diameter}`} aria-hidden>
        <circle className={styles.track} cx={center} cy={center} r={radius} strokeWidth={stroke} />
        <circle
          className={cx(styles.fill, filled === 0 && styles.empty)}
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={stroke}
          strokeDasharray={length}
          strokeDashoffset={length * (1 - filled)}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <span
        className={cx(
          styles.label,
          size === 'sm' ? 't-number-sm' : 't-number-lg',
          value === null && styles.muted,
        )}
      >
        {value === null ? '—' : <RollingNumber value={`${value}%`} />}
      </span>
    </div>
  )
}
