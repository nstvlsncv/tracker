import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ReelScene } from '../pages/auth/Showreel'
import type { ReelSceneId } from '../pages/auth/Showreel'

/** В какой ширине сцена раскладывается: та же, что в ролике на экране входа. */
const SCENE_WIDTH = 360
/** Какую долю плашки сцена занимает по ширине и по высоте. */
const FILL_X = 0.86
const FILL_Y = 0.72
/** Границы увеличения: мельче сцена нечитаема, крупнее выглядит грубо. */
const MIN_SCALE = 0.6
const MAX_SCALE = 1.6

type Props = {
  id: ReelSceneId
  /** Плашка под сцену: её размер и вид задаёт тот, кто сцену показывает. */
  className?: string
  /**
   * Сыграть один раз и остановиться в конечном виде. Сцена начинается, когда плашка
   * появляется на экране, а не раньше: иначе её бы никто не увидел.
   */
  once?: boolean
}

/**
 * Живая сцена из ролика (`ReelScene`) в плашке любого размера. Сцены разные, а плашки
 * под них на каждом экране свои, поэтому сцена раскладывается в своей обычной ширине
 * и целиком увеличивается или уменьшается так, чтобы занять плашку и не обрезаться.
 * Нужна знакомству с трекером (`Onboarding`) и лендингу (`Landing`).
 */
export function SceneFit({ id, className, once = false }: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  // Видна ли плашка: до этого сцена, которая играет один раз, ждёт. Нет наблюдателя
  // (старый браузер, тесты): считаем, что видна.
  const [seen, setSeen] = useState(() => !once || typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const stage = stageRef.current
    if (seen || !stage) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setSeen(true)
        observer.disconnect()
      },
      { threshold: 0.6 },
    )
    observer.observe(stage)
    return () => observer.disconnect()
  }, [seen])

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const fit = () => {
      const content = stage.querySelector<HTMLElement>('[data-reel-scene] > *')
      if (!content || !content.offsetWidth || !content.offsetHeight) return
      const next = Math.min(
        (stage.clientWidth * FILL_X) / content.offsetWidth,
        (stage.clientHeight * FILL_Y) / content.offsetHeight,
      )
      setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, next)))
    }
    fit()
    // Плашка меняет размер (поворот телефона, окно): сцена подстраивается заново.
    const observer = new ResizeObserver(fit)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [id])

  return (
    <div ref={stageRef} className={className}>
      <div style={{ flex: 'none', width: SCENE_WIDTH, transform: `scale(${scale})` }}>
        <ReelScene id={id} once={once} paused={!seen} />
      </div>
    </div>
  )
}
