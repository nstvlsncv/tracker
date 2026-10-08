import { useEffect, useRef, useState } from 'react'

const WIDTH = 1200
const TITLE = 'Трекер'
const TAGLINE = 'Недели, задачи, привычки, финансы и списки'
const HEIGHT = 630
/** Прогресс по дням недели на картинке: просто красивый пример. */
const WEEK = [100, 100, 67, 100, 40, 0, 0]

/**
 * Картинка-превью ссылки для мессенджеров (public/og.png). Открывается только в режиме
 * разработки по адресу /dev/og: рисует картинку на холсте, кнопка под ней сохраняет её
 * в public/og.png. Картинка не зависит от темы, поэтому цвета заданы прямо здесь.
 */
export function OgImage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const [saved, setSaved] = useState<string>()

  // Дев-сервер умеет принять картинку и положить её в public/og.png (см. vite.config.ts).
  const save = () => {
    canvasRef.current?.toBlob(async (blob) => {
      if (!blob) return
      const response = await fetch('/__save-og', { method: 'POST', body: blob })
      setSaved(response.ok ? 'Сохранено в public/og.png' : 'Не получилось сохранить')
    }, 'image/png')
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const pen = canvas?.getContext('2d')
    if (!canvas || !pen) return
    let cancelled = false

    // Вторым аргументом текст: шрифт разбит на части по алфавитам, и без русских букв в запросе
    // браузер загрузил бы только латиницу, а надписи нарисовались бы запасным шрифтом.
    Promise.all([
      document.fonts.load('600 148px Unbounded', TITLE),
      document.fonts.load('400 36px Unbounded', TAGLINE),
    ]).then(() => {
      if (cancelled) return
      // Белый фон и маскот, как на иконке приложения.
      pen.fillStyle = '#FFFFFF'
      pen.fillRect(0, 0, WIDTH, HEIGHT)

      // Маскот перед названием, как в меню трекера: лаймовый круг и два глаза.
      // Пропорции глаз те же, что у Mascot: ширина 0.13 диаметра, высота 0.22, между ними 0.16.
      const size = 136
      const centerX = 96 + size / 2
      const centerY = 96 + size / 2
      pen.fillStyle = '#C6F432'
      pen.beginPath()
      pen.arc(centerX, centerY, size / 2, 0, Math.PI * 2)
      pen.fill()
      pen.fillStyle = '#171717'
      for (const side of [-1, 1]) {
        pen.beginPath()
        pen.roundRect(
          centerX + side * size * 0.145 - size * 0.065,
          centerY - size * 0.04 - size * 0.11,
          size * 0.13,
          size * 0.22,
          size * 0.065,
        )
        pen.fill()
      }

      pen.textBaseline = 'middle'
      pen.fillStyle = '#171717'
      pen.font = '600 148px Unbounded'
      pen.letterSpacing = '-3px'
      pen.fillText(TITLE, 96 + size + 36, centerY + 6)

      pen.textBaseline = 'top'
      pen.letterSpacing = '0px'
      pen.fillStyle = '#737373'
      // Подпись стоит в одну строку между полями: если не помещается, шрифт становится мельче.
      let taglineSize = 36
      pen.font = `400 ${taglineSize}px Unbounded`
      while (pen.measureText(TAGLINE).width > WIDTH - 96 * 2 && taglineSize > 24) {
        taglineSize -= 1
        pen.font = `400 ${taglineSize}px Unbounded`
      }
      pen.fillText(TAGLINE, 96, 278)

      // Семь колец недели: серая дорожка и лаймовая дуга по проценту.
      WEEK.forEach((value, index) => {
        const x = 96 + 52 + index * (104 + 28)
        const y = HEIGHT - 88 - 52
        pen.lineWidth = 16
        pen.strokeStyle = '#EDEDED'
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
      setReady(true)
    })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} style={{ maxWidth: '100%' }} />
      <p>
        <button type="button" onClick={save} disabled={!ready} data-save-og>
          Сохранить в public/og.png
        </button>{' '}
        {saved}
      </p>
    </>
  )
}
