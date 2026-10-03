import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { onCheer } from '../lib/cheer'
import { cx } from '../lib/cx'
import { fireBurst } from './fireBurst'
import styles from './Mascot.module.css'

type Props = {
  /** Диаметр: число в пикселях или размер в CSS (например, '1.2em' рядом с текстом). */
  size?: number | string
  /** calm: смотрит за курсором и моргает. shy: зажмурился (вводят пароль). happy: радуется. */
  mood?: 'calm' | 'shy' | 'happy'
  className?: string
}

/** Что маскот делает в ответ на нажатие, по кругу. */
const REACTIONS = ['hop', 'wink', 'spin'] as const
type Reaction = (typeof REACTIONS)[number] | 'cheer'
/** Сколько длится любая реакция. То же число стоит в Mascot.module.css. */
const REACTION_MS = 600
/** Каждое какое по счёту нажатие маскот выпускает салют. */
const BURST_EVERY = 5

/** Насколько зрачки уходят от центра вслед за курсором, в долях диаметра. */
const LOOK = 0.09
/** Курсор дальше этого расстояния считается «далеко»: взгляд отведён до упора. */
const FAR_PX = 240

/** Ночью (с 23 до 5) маскот сонный: глаза полуприкрыты. */
const isNight = () => {
  const hour = new Date().getHours()
  return hour >= 23 || hour < 5
}

/**
 * Маскот трекера: круг акцентного цвета с глазами. Глаза следят за курсором и моргают,
 * на сенсорных экранах смотрят прямо. Живой: на нажатие отвечает по очереди прыжком,
 * подмигиванием и кувырком, на каждое пятое выпускает салют; подпрыгивает, когда в трекере
 * что-то отмечают с салютом; ночью сонный. Украшение: для скринридера и клавиатуры его нет.
 */
export function Mascot({ size = 32, mood = 'calm', className }: Props) {
  const ref = useRef<HTMLButtonElement>(null)
  // Текущая реакция и её номер: номер идёт в key, чтобы та же реакция проигралась заново.
  const [reaction, setReaction] = useState<{ kind: Reaction; id: number } | null>(null)
  const [sleepy] = useState(isNight)
  const taps = useRef(0)

  const react = (kind: Reaction) => setReaction((last) => ({ kind, id: (last?.id ?? 0) + 1 }))

  useEffect(() => {
    if (!reaction) return
    const timer = setTimeout(() => setReaction(null), REACTION_MS)
    return () => clearTimeout(timer)
  }, [reaction])

  useEffect(() => onCheer(() => react('cheer')), [])

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

  const poke = () => {
    taps.current++
    react(REACTIONS[(taps.current - 1) % REACTIONS.length])
    const node = ref.current
    if (node && taps.current % BURST_EVERY === 0) {
      const radius = node.offsetWidth / 2
      fireBurst(node, radius + 2, radius + 26, { quiet: true })
    }
  }

  return (
    <button
      ref={ref}
      key={reaction?.id ?? 0}
      type="button"
      tabIndex={-1}
      aria-hidden
      className={cx(
        styles.mascot,
        styles[mood],
        sleepy && mood === 'calm' && styles.sleepy,
        reaction && styles[reaction.kind],
        className,
      )}
      style={{ '--size': typeof size === 'number' ? `${size}px` : size } as CSSProperties}
      onClick={(event) => {
        // Маскот может стоять внутри ссылки или кликабельного блока: нажатие остаётся ему.
        event.preventDefault()
        event.stopPropagation()
        poke()
      }}
    >
      <span className={styles.eyes}>
        <span className={styles.eye} />
        <span className={styles.eye} />
      </span>
    </button>
  )
}
