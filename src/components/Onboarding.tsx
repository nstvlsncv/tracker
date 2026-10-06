import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ReelScene } from '../pages/auth/Showreel'
import type { ReelSceneId } from '../pages/auth/Showreel'
import { cx } from '../lib/cx'
import { Button } from './Button'
import { Mascot } from './Mascot'
import styles from './Onboarding.module.css'

type Slide = {
  /** Что показано на слайде: сцена из ролика или маскот. */
  scene: ReelSceneId | 'hello'
  title: string
  text: string
}

/** Слайды знакомства: по одному на главную возможность, в порядке «от недели к мелочам». */
const SLIDES: Slide[] = [
  {
    scene: 'hello',
    title: 'Привет! Это Трекер',
    text: 'Недели, задачи, привычки и финансы в одном месте. За минуту покажу, что здесь есть',
  },
  {
    scene: 'week',
    title: 'Вся неделя на виду',
    text: 'Задачи разложены по дням, у каждого дня своё кольцо прогресса. Наверху цели недели, чтобы не терять главное',
  },
  {
    scene: 'day',
    title: 'Отмечай сделанное',
    text: 'Каждая галочка двигает прогресс дня. Закроешь всё, и трекер отпразднует это салютом',
  },
  {
    scene: 'repeat',
    title: 'Задачи умеют сами',
    text: 'Повторяются каждый день или по будням, переезжают на другой день и понимают слова: напиши «позвонить врачу завтра»',
  },
  {
    scene: 'habits',
    title: 'Привычки и серии',
    text: 'Каждый день, по дням недели или несколько раз в неделю. Серия растёт, пока не пропускаешь, а на время отпуска есть пауза',
  },
  {
    scene: 'finance',
    title: 'Платежи под присмотром',
    text: 'Обязательные платежи и накопления от аванса до зарплаты: отмечаешь оплаченное и сразу видишь, сколько останется',
  },
  {
    scene: 'mood',
    title: 'Настроение и итоги',
    text: 'Отмечай, каким был день. В «Итогах» трекер покажет, как шли недели и в какие дни дела идут лучше',
  },
  {
    scene: 'mascot',
    title: 'Сделай трекер своим',
    text: 'Тема и акцентный цвет выбираются в Профиле. А на телефоне трекер можно поставить иконкой на экран, как приложение',
  },
]

/** В какой ширине сцена раскладывается: та же, что в ролике на экране входа. */
const SCENE_WIDTH = 360
/** Какую долю плашки сцена занимает по ширине и по высоте. */
const FILL_X = 0.86
const FILL_Y = 0.72
/** Границы увеличения: мельче сцена нечитаема, крупнее выглядит грубо. */
const MIN_SCALE = 0.6
const MAX_SCALE = 1.6

type Props = {
  /** Знакомство пройдено до конца или пропущено. */
  onClose: () => void
}

/**
 * Знакомство с трекером при первом входе, в духе сторис: слайд с живой сценой из ролика,
 * заголовок и пара строк, сверху полоски слайдов. Листается кнопками «Назад» и «Дальше»
 * (и стрелками на клавиатуре), «Пропустить» закрывает сразу. Само не листается: человек
 * читает в своём темпе.
 */
export function Onboarding({ onClose }: Props) {
  const [index, setIndex] = useState(0)
  const slide = SLIDES[index]
  const last = index === SLIDES.length - 1
  const dialogRef = useRef<HTMLDivElement>(null)

  // Сцены разного размера, а плашка под них на каждом экране своя. Каждая сцена
  // увеличивается или уменьшается так, чтобы занять плашку целиком и не обрезаться.
  const stageRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
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
  }, [index])

  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    const previous = document.activeElement
    dialogRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current()
      if (event.key === 'ArrowRight') setIndex((current) => Math.min(current + 1, SLIDES.length - 1))
      if (event.key === 'ArrowLeft') setIndex((current) => Math.max(current - 1, 0))
      if (event.key !== 'Tab') return
      // Фокус ходит по кругу внутри окна знакомства.
      const dialog = dialogRef.current
      if (!dialog) return
      const items = [...dialog.querySelectorAll<HTMLElement>('button')]
      const first = items[0]
      const lastItem = items[items.length - 1]
      const active = document.activeElement
      if (!dialog.contains(active) || (event.shiftKey && (active === first || active === dialog))) {
        event.preventDefault()
        lastItem?.focus()
      } else if (!event.shiftKey && active === lastItem) {
        event.preventDefault()
        first?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [])

  return createPortal(
    <div className={styles.overlay}>
      <div
        ref={dialogRef}
        className={styles.card}
        role="dialog"
        aria-modal="true"
        aria-label="Знакомство с трекером"
        tabIndex={-1}
      >
        <div className={styles.top}>
          {/* Полоски слайдов, как в сторис: пройденные и текущий залиты. */}
          <div className={styles.bars} aria-hidden>
            {SLIDES.map((item, position) => (
              <span key={item.scene} className={cx(styles.bar, position <= index && styles.barOn)} />
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Пропустить
          </Button>
        </div>

        {/* key: каждая сцена создаётся заново и проявляется. */}
        <div key={slide.scene} ref={stageRef} className={styles.stage}>
          {slide.scene === 'hello' ? (
            <Mascot size={112} mood="happy" />
          ) : (
            <div className={styles.fit} style={{ width: SCENE_WIDTH, transform: `scale(${scale})` }}>
              <ReelScene id={slide.scene} />
            </div>
          )}
        </div>

        <div key={`text-${slide.scene}`} className={styles.text} aria-live="polite">
          <h2 className="t-heading-3">{slide.title}</h2>
          <p className={`t-body-lg ${styles.hint}`}>{slide.text}</p>
        </div>

        <div className={styles.buttons}>
          {index > 0 && (
            <Button variant="secondary" size="lg" onClick={() => setIndex(index - 1)}>
              Назад
            </Button>
          )}
          <Button
            size="lg"
            className={styles.next}
            onClick={() => (last ? onClose() : setIndex(index + 1))}
          >
            {last ? 'Начать' : 'Дальше'}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
