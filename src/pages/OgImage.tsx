import { useEffect, useRef } from 'react'

const WIDTH = 1200
const HEIGHT = 630
/** Прогресс по дням недели на картинке: просто красивый пример. */
const WEEK = [100, 100, 67, 100, 40, 0, 0]

/**
 * Картинка-превью ссылки для мессенджеров (public/og.png). Открывается только в режиме
 * разработки по адресу /dev/og: рисует картинку на холсте, её сохраняют правой кнопкой
 * как og.png. Картинка не зависит от темы, поэтому цвета заданы прямо здесь.
 */
export function OgImage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const pen = canvas?.getContext('2d')
    if (!canvas || !pen) return
    let cancelled = false

    Promise.all([
      document.fonts.load('600 148px Unbounded'),
      document.fonts.load('400 36px Unbounded'),
    ]).then(() => {
      if (cancelled) return
      pen.fillStyle = '#171717'
      pen.fillRect(0, 0, WIDTH, HEIGHT)

      pen.textBaseline = 'top'
      pen.fillStyle = '#FAFAFA'
      pen.font = '600 148px Unbounded'
      pen.letterSpacing = '-3px'
      pen.fillText('Трекер', 96, 88)

      pen.letterSpacing = '0px'
      pen.fillStyle = '#A3A3A3'
      pen.font = '400 36px Unbounded'
      pen.fillText('Недели, задачи, цели и привычки', 96, 262)

      // Семь колец недели: серая дорожка и лаймовая дуга по проценту.
      WEEK.forEach((value, index) => {
        const x = 96 + 52 + index * (104 + 28)
        const y = HEIGHT - 88 - 52
        pen.lineWidth = 16
        pen.strokeStyle = '#2E2E2E'
        pen.beginPath()
        pen.arc(x, y, 44, 0, Math.PI * 2)
        pen.stroke()
        if (value === 0) return
        pen.strokeStyle = '#C6F432'
        pen.lineCap = value < 100 ? 'round' : 'butt'
        pen.beginPath()
        pen.arc(x, y, 44, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * value) / 100)
        pen.stroke()
      })
    })

    return () => {
      cancelled = true
    }
  }, [])

  return <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} style={{ maxWidth: '100%' }} />
}
