import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import type { Mood } from '../data/types'
import { cx } from '../lib/cx'
import { MOODS, moodLabel } from '../lib/moods'
import { MoodFace } from './MoodFace'
import styles from './MoodMenu.module.css'

type RowProps = {
  mood: Mood | null
  /** Выбрали лицо. Повторный выбор того же лица снимает отметку: приходит null. */
  onPick: (mood: Mood | null) => void
  /** Лицо под курсором сменилось: по нему показывают подпись. */
  onHover?: (mood: Mood | null) => void
  /** Диаметр лица. */
  size?: number
  className?: string
}

/** Пять лиц настроения в ряд, от отличного дня к плохому. Выбранное обведено. */
export function MoodRow({ mood, onPick, onHover, size = 32, className }: RowProps) {
  return (
    <div className={cx(styles.faces, className)} role="group" aria-label="Настроение дня">
      {MOODS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cx(styles.option, option.value === mood && styles.current)}
          aria-label={option.label}
          aria-pressed={option.value === mood}
          title={option.label}
          onPointerEnter={() => onHover?.(option.value)}
          onPointerLeave={() => onHover?.(null)}
          onClick={() => onPick(option.value === mood ? null : option.value)}
        >
          <MoodFace mood={option.value} size={size} />
        </button>
      ))}
    </div>
  )
}

type MenuProps = {
  /** Элемент, под которым открыто окошко (лицо дня). */
  anchor: Element
  mood: Mood | null
  onPick: (mood: Mood | null) => void
  onClose: () => void
}

/** Отступ окошка от лица и от краёв окна. */
const GAP = 8

/**
 * Окошко выбора настроения: пять лиц и подпись. Одно и то же на Неделе и в Привычках.
 * Рисуется поверх страницы, поэтому его не обрезают ни карточка дня, ни прокручиваемая сетка.
 * Стоит под лицом, по его правому краю; если снизу места нет, открывается вверх.
 * Закрывается выбором, нажатием мимо, Escape и любой прокруткой.
 */
export function MoodMenu({ anchor, mood, onPick, onClose }: MenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState<Mood | null>(null)
  const [place, setPlace] = useState<CSSProperties>({ visibility: 'hidden' })

  useLayoutEffect(() => {
    const menu = ref.current
    if (!menu) return
    const at = anchor.getBoundingClientRect()
    const { offsetWidth: width, offsetHeight: height } = menu
    const left = Math.min(Math.max(GAP, at.right - width), window.innerWidth - width - GAP)
    const below = at.bottom + GAP
    const fits = below + height <= window.innerHeight - GAP
    setPlace({ left, top: fits ? below : at.top - height - GAP })
  }, [anchor])

  useEffect(() => {
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (!ref.current?.contains(target) && !anchor.contains(target)) onClose()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    // capture: прокрутка любого блока (ряд дней, сетка истории), не только страницы.
    window.addEventListener('scroll', onClose, true)
    window.addEventListener('resize', onClose)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onClose, true)
      window.removeEventListener('resize', onClose)
    }
  }, [anchor, onClose])

  const shown = hovered ?? mood
  return createPortal(
    <div ref={ref} className={styles.menu} style={place}>
      <MoodRow
        mood={mood}
        onHover={setHovered}
        onPick={(next) => {
          onPick(next)
          onClose()
        }}
      />
      <span className={`t-body-sm ${styles.caption}`}>
        {shown ? moodLabel(shown) : 'Каким был день?'}
      </span>
    </div>,
    document.body,
  )
}
