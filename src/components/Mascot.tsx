import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { onCheer } from '../lib/cheer'
import { cx } from '../lib/cx'
import { fireBurst } from './fireBurst'
import styles from './Mascot.module.css'

export type MascotMood = 'calm' | 'shy' | 'happy' | 'sad'

type Props = {
  /** Диаметр: число в пикселях или размер в CSS (например, '1.2em' рядом с текстом). */
  size?: number | string
  /**
   * calm: смотрит и моргает. shy: зажмурился (вводят пароль). happy: радуется.
   * sad: грустит (остались невыполненные задачи, неделя буксует).
   */
  mood?: MascotMood
  /** false: просто картинка: на нажатие не отвечает и на общие салюты не реагирует. */
  interactive?: boolean
  /**
   * Смотрит прямо перед собой и ни за чем не следит. Так стоит маскот в меню, когда на экране
   * есть другой, главный (в «Итогах»): двое, синхронно водящих глазами, выглядят странно.
   */
  still?: boolean
  className?: string
}

/** Что маскот делает в ответ на нажатие, по кругу. */
const REACTIONS = ['hop', 'wink', 'spin'] as const
type Reaction = (typeof REACTIONS)[number] | 'cheer'
/** Сколько длится любая реакция. То же число стоит в Mascot.module.css. */
const REACTION_MS = 600
/** Каждое какое по счёту нажатие маскот выпускает салют. */
const BURST_EVERY = 5

/** Насколько зрачки уходят от центра вслед за взглядом, в долях диаметра. */
const LOOK = 0.11
/**
 * Точка дальше этого расстояния считается «далеко»: взгляд отведён до упора. Небольшое:
 * на экране входа курсор почти всегда рядом с маскотом, и с большим порогом глаза едва двигались.
 */
const FAR_PX = 70
/** Поля, в которые маскот заглядывает, пока в них печатают. В пароли не подглядывает. */
const FIELDS = 'input:not([type="password"]), textarea'

type Point = { x: number; y: number }

/** Ночью (с 23 до 5) маскот сонный: глаза полуприкрыты. */
const isNight = () => {
  const hour = new Date().getHours()
  return hour >= 23 || hour < 5
}

/** Место в поле, где сейчас печатают: примерно там, где стоит курсор ввода. */
function typingPoint(field: HTMLInputElement | HTMLTextAreaElement): Point {
  const rect = field.getBoundingClientRect()
  const fontSize = parseFloat(getComputedStyle(field).fontSize) || 16
  const typed = (field.selectionStart ?? field.value.length) * fontSize * 0.62
  return {
    x: rect.left + Math.min(rect.width - 8, 16 + typed),
    y: rect.top + Math.min(rect.height, 48) / 2,
  }
}

/**
 * Маскот трекера: круг акцентного цвета с глазами. Глаза следят за курсором, а пока
 * где-то печатают, за текстом (до первого движения курсора); моргают. Живой: на нажатие отвечает по очереди прыжком,
 * подмигиванием и кувырком, на каждое пятое выпускает салют; подпрыгивает, когда в трекере
 * что-то отмечают с салютом; ночью сонный. Украшение: для скринридера и клавиатуры его нет.
 */
export function Mascot({
  size = 32,
  mood = 'calm',
  interactive = true,
  still = false,
  className,
}: Props) {
  const ref = useRef<HTMLElement>(null)
  // Текущая реакция и её номер: номер идёт в key лица, чтобы та же реакция проигралась заново.
  const [reaction, setReaction] = useState<{ kind: Reaction; id: number } | null>(null)
  const [sleepy] = useState(isNight)
  const taps = useRef(0)

  const react = (kind: Reaction) => setReaction((last) => ({ kind, id: (last?.id ?? 0) + 1 }))

  useEffect(() => {
    if (!reaction) return
    const timer = setTimeout(() => setReaction(null), REACTION_MS)
    return () => clearTimeout(timer)
  }, [reaction])

  useEffect(() => {
    if (interactive) return onCheer(() => react('cheer'))
  }, [interactive])

  // Куда смотреть. Взгляд записывается на внешний элемент: он не пересоздаётся при реакциях,
  // поэтому слежение не теряется.
  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (still || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      node.style.setProperty('--look-x', '0px')
      node.style.setProperty('--look-y', '0px')
      return
    }
    // На сенсорных экранах курсора нет: маскот смотрит прямо и только заглядывает в поля.
    const hasPointer = !window.matchMedia('(hover: none)').matches
    let frame = 0
    let pointer: Point | null = null
    let typing: Point | null = null

    const look = () => {
      frame = 0
      const point = typing ?? pointer
      if (!point) {
        node.style.setProperty('--look-x', '0px')
        node.style.setProperty('--look-y', '0px')
        return
      }
      const rect = node.getBoundingClientRect()
      const dx = point.x - (rect.left + rect.width / 2)
      const dy = point.y - (rect.top + rect.height / 2)
      const distance = Math.hypot(dx, dy) || 1
      const reach = Math.min(distance / FAR_PX, 1) * LOOK * rect.width
      node.style.setProperty('--look-x', `${(dx / distance) * reach}px`)
      node.style.setProperty('--look-y', `${(dy / distance) * reach}px`)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(look)
    }

    const onMove = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY }
      // Курсор главнее: стоит ему сдвинуться, взгляд возвращается к нему, даже если поле
      // ввода ещё в фокусе. Иначе после нажатия в поле маскот «залипал» на нём.
      typing = null
      schedule()
    }
    const onType = (event: Event) => {
      const field = event.target
      if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return
      if (!field.matches(FIELDS)) return
      typing = typingPoint(field)
      schedule()
    }
    const onLeaveField = () => {
      typing = null
      schedule()
    }

    if (hasPointer) window.addEventListener('pointermove', onMove)
    // За текстом он смотрит, только пока печатают: фокус в поле сам по себе взгляд не забирает.
    // На сенсорных экранах курсора нет, там хватает и фокуса.
    if (!hasPointer) document.addEventListener('focusin', onType)
    document.addEventListener('input', onType)
    document.addEventListener('focusout', onLeaveField)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('focusin', onType)
      document.removeEventListener('input', onType)
      document.removeEventListener('focusout', onLeaveField)
    }
  }, [still])

  const poke = () => {
    taps.current++
    react(REACTIONS[(taps.current - 1) % REACTIONS.length])
    const node = ref.current
    if (node && taps.current % BURST_EVERY === 0) {
      const radius = node.offsetWidth / 2
      fireBurst(node, radius + 2, radius + 26, { quiet: true })
    }
  }

  const face = (
    <span
      key={reaction?.id ?? 0}
      className={cx(
        styles.face,
        styles[mood],
        sleepy && mood === 'calm' && styles.sleepy,
        reaction && styles[reaction.kind],
      )}
    >
      <span className={styles.eyes}>
        <span className={styles.eye} />
        <span className={styles.eye} />
      </span>
    </span>
  )
  const style = { '--size': typeof size === 'number' ? `${size}px` : size } as CSSProperties

  if (!interactive) {
    return (
      <span ref={ref} className={cx(styles.mascot, className)} style={style} aria-hidden>
        {face}
      </span>
    )
  }

  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      type="button"
      tabIndex={-1}
      aria-hidden
      className={cx(styles.mascot, styles.alive, className)}
      style={style}
      onClick={(event) => {
        // Маскот может стоять внутри ссылки или кликабельного блока: нажатие остаётся ему.
        event.preventDefault()
        event.stopPropagation()
        poke()
      }}
    >
      {face}
    </button>
  )
}
