import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import styles from './DotField.module.css'

const GAP = 24 // шаг сетки
const REACH = 560 // радиус пятна, дальше точки не видны
const MIN_RADIUS = 0.6
const MAX_RADIUS = 2.6
const FADE = 1.4 // насколько быстро точки бледнеют к краю пятна
const EASE = 0.12 // доля пути до курсора за кадр: чем меньше, тем плавнее догоняет

const GLOW_REACH = 130 // радиус лаймовой подсветки вокруг курсора
const GLOW_GROW = 0.8 // подсвеченная точка чуть крупнее
const WAVE_MS = 2600 // сколько волна идёт от формы до края пятна
const WAVE_EVERY_MS = 7000
const WAVE_WIDTH = 70 // толщина кольца волны

/** Планшет или телефон: пятно не следует за указателем, вместо этого по точкам идёт волна. */
const TOUCH_QUERY = '(max-width: 1024px), (hover: none)'
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)'

type Point = { x: number; y: number }

/**
 * Фон экрана входа: сетка точек, которые видны пятном. Сначала пятно стоит под формой,
 * при движении курсора плавно следует за ним, а когда курсор уходит из окна, возвращается.
 * Точки рядом с курсором загораются лаймом. На планшетах и телефонах пятно неподвижно,
 * а лайм изредка расходится от формы медленной волной. При отключённых в системе анимациях
 * нет ни движения, ни лайма.
 */
export function DotField({ anchorRef }: { anchorRef: RefObject<HTMLElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    let width = 0
    let height = 0
    let frame = 0
    let following = false
    // Радиус волны, пока она идёт (планшет и телефон).
    let wave: number | null = null
    let waveFrame = 0
    let waveStart = 0

    const reduced = window.matchMedia(REDUCED_QUERY).matches
    const touch = window.matchMedia(TOUCH_QUERY).matches

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
      const style = getComputedStyle(canvas)
      const base = style.color
      const lime = style.getPropertyValue('--highlight-default').trim()
      context.fillStyle = base
      // Сетка симметрична относительно центра экрана.
      const startX = (width / 2) % GAP
      for (let x = startX; x < width; x += GAP) {
        for (let y = GAP / 2; y < height; y += GAP) {
          const distance = Math.hypot(x - spot.x, y - spot.y)
          if (distance >= REACH) continue
          const strength = 1 - distance / REACH
          context.globalAlpha = strength ** FADE
          context.beginPath()
          const radius = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * strength
          context.arc(x, y, radius, 0, Math.PI * 2)
          context.fill()

          // Лайм: вокруг курсора (под формой его не видно) или кольцом волны.
          let glow = 0
          if (wave !== null) {
            const off = Math.abs(distance - wave)
            if (off < WAVE_WIDTH) glow = (1 - off / WAVE_WIDTH) * strength
          } else if (following && distance < GLOW_REACH) {
            glow = 1 - distance / GLOW_REACH
          }
          if (glow > 0) {
            context.fillStyle = lime
            context.globalAlpha = glow
            context.beginPath()
            context.arc(x, y, radius + GLOW_GROW * glow, 0, Math.PI * 2)
            context.fill()
            context.fillStyle = base
          }
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

    const waveTick = (time: number) => {
      if (!waveStart) waveStart = time
      const progress = (time - waveStart) / WAVE_MS
      wave = progress < 1 ? progress * REACH : null
      draw()
      waveFrame = wave === null ? 0 : requestAnimationFrame(waveTick)
    }

    const startWave = () => {
      if (waveFrame || document.hidden) return
      waveStart = 0
      waveFrame = requestAnimationFrame(waveTick)
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

    // На планшетах и телефонах пятно стоит под формой и не двигается: там нет курсора,
    // а пятно, прыгающее за каждым касанием, только мешает.
    let waveTimer = 0
    let firstWave = 0
    if (!reduced && !touch) {
      window.addEventListener('pointermove', onMove)
      document.documentElement.addEventListener('pointerleave', onLeave)
    } else if (!reduced) {
      firstWave = window.setTimeout(startWave, 1500)
      waveTimer = window.setInterval(startWave, WAVE_EVERY_MS)
    }

    return () => {
      cancelAnimationFrame(frame)
      cancelAnimationFrame(waveFrame)
      clearTimeout(firstWave)
      clearInterval(waveTimer)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [anchorRef])

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden />
}
