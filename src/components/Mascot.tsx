import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { cx } from '../lib/cx'
import styles from './Mascot.module.css'

type Props = {
  /** Диаметр: число в пикселях или размер в CSS (например, '1.2em' рядом с текстом). */
  size?: number | string
  /** calm: смотрит за курсором и моргает. shy: зажмурился (вводят пароль). happy: радуется. */
  mood?: 'calm' | 'shy' | 'happy'
  className?: string
}

/** Насколько зрачки уходят от центра вслед за курсором, в долях диаметра. */
const LOOK = 0.09
/** Курсор дальше этого расстояния считается «далеко»: взгляд отведён до упора. */
const FAR_PX = 240

/**
 * Маскот трекера: круг акцентного цвета с глазами. Глаза следят за курсором и моргают,
 * на сенсорных экранах смотрят прямо. Украшение: для скринридера его нет.
 */
export function Mascot({ size = 32, mood = 'calm', className }: Props) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node || window.matchMedia('(hover: none), (prefers-reduced-motion: reduce)').matches) {
      return
    }
    let frame = 0
    let point = { x: 0, y: 0 }
    const look = () => {
      frame = 0
      const rect = node.getBoundingClientRect()
      const dx = point.x - (rect.left + rect.width / 2)
      const dy = point.y - (rect.top + rect.height / 2)
      const distance = Math.hypot(dx, dy) || 1
      const reach = Math.min(distance / FAR_PX, 1) * LOOK * rect.width
      node.style.setProperty('--look-x', `${(dx / distance) * reach}px`)
      node.style.setProperty('--look-y', `${(dy / distance) * reach}px`)
    }
    const onMove = (event: PointerEvent) => {
      point = { x: event.clientX, y: event.clientY }
      if (!frame) frame = requestAnimationFrame(look)
    }
    window.addEventListener('pointermove', onMove)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  return (
    <span
      ref={ref}
      className={cx(styles.mascot, styles[mood], className)}
      style={{ '--size': typeof size === 'number' ? `${size}px` : size } as CSSProperties}
      aria-hidden
    >
      <span className={styles.eyes}>
        <span className={styles.eye} />
        <span className={styles.eye} />
      </span>
    </span>
  )
}
