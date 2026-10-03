import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import styles from './DotField.module.css'

const GAP = 24 // шаг сетки
const REACH = 200 // радиус пятна вокруг курсора, дальше точки не видны
const MIN_RADIUS = 0.6
const MAX_RADIUS = 3
const EASE = 0.12 // доля пути до курсора за кадр: чем меньше, тем плавнее догоняет

/** Где точек нет вовсе: планшет, телефон и отключённые в системе анимации. */
const OFF_QUERY = '(max-width: 1024px), (hover: none), (prefers-reduced-motion: reduce)'

type Point = { x: number; y: number }

/**
 * Фон экрана входа. Сам фон чистый, а вокруг курсора проступает пятно лаймовых точек
 * и плавно следует за ним. Когда курсор уходит из окна, пятно гаснет. На планшетах
 * и телефонах курсора нет, поэтому там просто чистый фон.
 */
export function DotField({ anchorRef }: { anchorRef: RefObject<HTMLElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context || window.matchMedia(OFF_QUERY).matches) return

    let width = 0
    let height = 0
    let frame = 0
    // Курсор в окне: пятно видно. Яркость плавно идёт к 1 или к 0.
    let following = false
    let brightness = 0

    // Пока курсора не было, пятно ждёт под формой: оттуда оно и выплывает.
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
      if (brightness < 0.01) return
      // Цвет точек задан в CSS через токен, сюда он приходит как color канваса.
      context.fillStyle = getComputedStyle(canvas).color
      // Сетка симметрична относительно центра экрана.
      const startX = (width / 2) % GAP
      for (let x = startX; x < width; x += GAP) {
        if (Math.abs(x - spot.x) >= REACH) continue
        for (let y = GAP / 2; y < height; y += GAP) {
          const distance = Math.hypot(x - spot.x, y - spot.y)
          if (distance >= REACH) continue
          const strength = 1 - distance / REACH
          context.globalAlpha = strength * brightness
          context.beginPath()
          context.arc(x, y, MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * strength, 0, Math.PI * 2)
          context.fill()
        }
      }
    }

    const tick = () => {
      spot.x += (target.x - spot.x) * EASE
      spot.y += (target.y - spot.y) * EASE
      const goal = following ? 1 : 0
      brightness += (goal - brightness) * EASE
      draw()
      const settled =
        Math.hypot(target.x - spot.x, target.y - spot.y) < 0.5 && Math.abs(goal - brightness) < 0.01
      frame = settled ? 0 : requestAnimationFrame(tick)
    }

    const wake = () => {
      if (!frame) frame = requestAnimationFrame(tick)
    }

    const resize = () => {
      const ratio = window.devicePixelRatio || 1
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * ratio
      canvas.height = height * ratio
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      if (!following && brightness < 0.01) {
        target = rest()
        Object.assign(spot, target)
      }
      draw()
    }

    const onMove = (event: PointerEvent) => {
      following = true
      target = { x: event.clientX, y: event.clientY }
      wake()
    }
    // Курсор ушёл из окна: пятно гаснет там, где было.
    const onLeave = () => {
      following = false
      wake()
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onMove)
    document.documentElement.addEventListener('pointerleave', onLeave)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [anchorRef])

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden />
}
