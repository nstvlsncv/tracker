import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import styles from './DotField.module.css'

const GAP = 24 // шаг сетки
const REACH = 560 // радиус пятна, дальше точки не видны
const MIN_RADIUS = 0.6
const MAX_RADIUS = 2.6
const FADE = 1.4 // насколько быстро точки бледнеют к краю пятна
const EASE = 0.12 // доля пути до курсора за кадр: чем меньше, тем плавнее догоняет

/** Планшет и телефон: точек нет вовсе (канвас скрыт и в CSS). */
const TOUCH_QUERY = '(max-width: 1024px), (hover: none)'
/** Когда пятно не следует за указателем. */
const STILL_QUERY = '(prefers-reduced-motion: reduce)'

type Point = { x: number; y: number }

/**
 * Фон экрана входа: сетка точек, которые видны пятном. Сначала пятно стоит под формой,
 * при движении курсора плавно следует за ним, а когда курсор уходит из окна, возвращается.
 * На планшетах и телефонах точек нет: фон чистый.
 */
export function DotField({ anchorRef }: { anchorRef: RefObject<HTMLElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context || window.matchMedia(TOUCH_QUERY).matches) return

    let width = 0
    let height = 0
    let frame = 0
    let following = false

    const rest = (): Point => {
      const rect = anchorRef.current?.getBoundingClientRect()
      return rect
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        : { x: width / 2, y: height / 2 }
    }

    let target = rest()
    const spot = { ...target }

    const draw = () => {
      context.clearRect(0, 0, width, height)
      // Цвет точек задан в CSS через токен, сюда он приходит как color канваса.
      context.fillStyle = getComputedStyle(canvas).color
      // Сетка симметрична относительно центра экрана.
      const startX = (width / 2) % GAP
      for (let x = startX; x < width; x += GAP) {
        for (let y = GAP / 2; y < height; y += GAP) {
          const distance = Math.hypot(x - spot.x, y - spot.y)
          if (distance >= REACH) continue
          const strength = 1 - distance / REACH
          context.globalAlpha = strength ** FADE
          context.beginPath()
          context.arc(x, y, MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * strength, 0, Math.PI * 2)
          context.fill()
        }
      }
    }

    const tick = () => {
      spot.x += (target.x - spot.x) * EASE
      spot.y += (target.y - spot.y) * EASE
      draw()
      const settled = Math.hypot(target.x - spot.x, target.y - spot.y) < 0.5
      frame = settled ? 0 : requestAnimationFrame(tick)
    }

    const moveTo = (point: Point) => {
      target = point
      if (!frame) frame = requestAnimationFrame(tick)
    }

    const resize = () => {
      const ratio = window.devicePixelRatio || 1
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * ratio
      canvas.height = height * ratio
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      if (!following) {
        target = rest()
        Object.assign(spot, target)
      }
      draw()
    }

    const onMove = (event: PointerEvent) => {
      following = true
      moveTo({ x: event.clientX, y: event.clientY })
    }
    const onLeave = () => {
      following = false
      moveTo(rest())
    }

    resize()
    // Когда догрузится шрифт, форма чуть сдвигается: пятно встаёт под неё заново.
    document.fonts.ready.then(resize)
    window.addEventListener('resize', resize)
    // Форма меняет высоту (появилась ошибка, догрузились стили): пятно остаётся под её центром.
    const observer = new ResizeObserver(() => {
      if (!following) moveTo(rest())
    })
    if (anchorRef.current) observer.observe(anchorRef.current)

    // При отключённых в системе анимациях пятно стоит под формой и не двигается.
    const still = window.matchMedia(STILL_QUERY).matches
    if (!still) {
      window.addEventListener('pointermove', onMove)
      document.documentElement.addEventListener('pointerleave', onLeave)
    }

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [anchorRef])

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden />
}
