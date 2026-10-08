import { ArrowRight, Check, Moon, Sun } from '@phosphor-icons/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent, ReactNode } from 'react'
import { Link } from 'react-router'
import { buttonClassName } from '../../components/buttonStyles'
import { Checkbox } from '../../components/Checkbox'
import { Donut } from '../../components/Donut'
import { fireBurst } from '../../components/fireBurst'
import { Mascot } from '../../components/Mascot'
import { SceneFit } from '../../components/SceneFit'
import { ACCENTS } from '../../lib/accent'
import type { Accent } from '../../lib/accent'
import { AUTHOR_URL } from '../../lib/constants'
import { cx } from '../../lib/cx'
import { setTheme, useTheme } from '../../lib/theme'
import { tidy } from '../../lib/typography'
import { DotField } from '../auth/DotField'
import type { ReelSceneId } from '../auth/Showreel'
import styles from './Landing.module.css'

/**
 * Задачи самой страницы. Лендинг устроен как список дел: у каждого раздела своя задача,
 * и она отмечается сама, когда раздел прочитан. Последнюю, «Открыть демо», закрывает кнопка.
 */
const PAGE_TASKS = [
  { id: 'hero', title: 'Узнать, что такое Трекер' },
  { id: 'features', title: 'Посмотреть, что внутри' },
  { id: 'custom', title: 'Выбрать свой цвет' },
  { id: 'perks', title: 'Понять, чем он удобен' },
  { id: 'steps', title: 'Разобраться, как начать' },
  { id: 'demo', title: 'Открыть демо' },
] as const
type TaskId = (typeof PAGE_TASKS)[number]['id']

/** Раздел считается прочитанным, когда его низ поднялся выше этой доли высоты окна. */
const READ_LINE = 0.6

/** Задачи живой карточки в начале страницы: их можно отмечать прямо на лендинге. */
const DEMO_TASKS = ['Разобрать почту', 'Позвонить маме', 'Пробежка 20 минут', 'Почитать перед сном']
/** Сколько из них отмечено с самого начала. */
const DEMO_DONE = 1

/** Что собрано в трекере: слова меняются в заголовке по кругу. */
const SUBJECTS = ['Вся неделя', 'Все задачи', 'Все привычки', 'Все платежи', 'Все списки']
const SUBJECT_MS = 2400

/** Абзац под заголовком: что такое трекер, одной мыслью. */
const LEAD =
  'Трекер помогает спланировать неделю и не забыть важное: задачи по дням, цели, привычки и обязательные платежи. Отмечаешь сделанное и видишь, сколько уже позади'

/** Бегущая строка: из чего состоит трекер. */
const WORDS = ['задачи', 'цели недели', 'привычки', 'серии', 'платежи', 'списки', 'настроение', 'итоги', 'повтор', 'заметки']

type Feature = { scene: ReelSceneId; title: string; text: string; wide?: boolean }

/**
 * Возможности: у каждой живая сцена, та же, что в ролике на экране входа. Порядок подобран
 * под сетку в три столбца, четыре ряда без дыр: широкая и обычная, обычная и широкая,
 * и ещё раз так же.
 */
const FEATURES: Feature[] = [
  {
    scene: 'week',
    title: 'Неделя целиком',
    text: 'Задачи разложены по дням с понедельника по воскресенье. У каждого дня кольцо: оно показывает, какая часть задач уже сделана',
    wide: true,
  },
  {
    scene: 'habits',
    title: 'Привычки',
    text: 'Отмечай привычку каждый день или в выбранные дни. Трекер считает, сколько дней подряд ты не пропускаешь',
  },
  {
    scene: 'finance',
    title: 'Обязательные платежи',
    text: 'Запиши, что нужно оплатить с аванса и с зарплаты. Отмечай оплаченное и смотри, сколько денег останется свободными',
  },
  {
    scene: 'repeat',
    title: 'Повтор и перенос',
    text: 'Задачу можно поставить на каждый день или по будням, и она будет появляться сама. Не успел сегодня: перенеси на завтра одним нажатием',
    wide: true,
  },
  {
    scene: 'lists',
    title: 'Списки',
    text: 'Продукты, фильмы, идеи, сборы в поездку: всё, что не привязано к дню. Купил по списку: убери отмеченное одной кнопкой и начни заново',
    wide: true,
  },
  {
    scene: 'goals',
    title: 'Цели недели',
    text: 'Одна-три главные вещи, которые хочется успеть за неделю. Они всегда наверху и не теряются среди мелких дел',
  },
  {
    scene: 'mood',
    title: 'Настроение дня',
    text: 'Раз в день отмечаешь, каким он был. Через пару недель видно, какие дни даются легче',
  },
  {
    scene: 'day',
    title: 'Прогресс дня',
    text: 'Каждая галочка двигает кольцо. Закроешь все задачи дня, и трекер отпразднует это салютом',
    wide: true,
  },
]

/** Чем удобен: уже отмеченный список, по одной мысли в строке. */
const PERKS = [
  { title: 'Разбираться не придётся', text: 'Добавил задачу, отметил, готово. Инструкция не нужна' },
  { title: 'Работает на телефоне', text: 'Открывается в браузере и ставится иконкой на экран, как обычное приложение' },
  { title: 'Твои записи видишь только ты', text: 'Задачи, заметки и суммы не показываются другим людям' },
  { title: 'Ничего не отвлекает', text: 'Нет рекламы, лент и уведомлений, о которых не просили' },
  { title: 'Светлая и тёмная тема', text: 'И пять цветов на выбор: можно настроить под себя' },
  { title: 'Есть итоги', text: 'Трекер показывает, как шли последние недели и какие привычки держатся' },
]

/** Как начать: регистрации нет, аккаунты заводятся вручную, поэтому путь лежит через сообщение. */
const STEPS = [
  {
    title: 'Посмотри демо',
    text: 'Это настоящий трекер с примером данных. Нажимай что угодно: после обновления страницы всё вернётся как было',
  },
  {
    title: 'Напиши мне',
    text: 'Регистрации на сайте нет. Я сама заведу тебе аккаунт и пришлю логин с паролем',
  },
  {
    title: 'Войди и собери первую неделю',
    text: 'Поставь пару целей, добавь задачи на сегодня и одну привычку. Дальше прогресс считается сам',
  },
]

/** Блок проявляется, когда доезжает до экрана. */
function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  // Нет наблюдателя (старый браузер, тесты): блок просто виден сразу.
  const [shown, setShown] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const block = ref.current
    if (!block || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setShown(true)
        observer.disconnect()
      },
      { threshold: 0.15 },
    )
    observer.observe(block)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={cx(styles.reveal, shown && styles.shown, className)}
      style={{ '--delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  )
}

/** Живая карточка «Задачи на сегодня»: галочки ставятся, кольцо растёт, на 100% салют. */
function HeroDemo({ onDone }: { onDone: (done: boolean) => void }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [done, setDone] = useState<ReadonlySet<number>>(
    () => new Set(DEMO_TASKS.map((_, index) => index).slice(0, DEMO_DONE)),
  )
  const all = done.size === DEMO_TASKS.length

  const toggle = (index: number, checked: boolean) => {
    const next = new Set(done)
    if (checked) next.add(index)
    else next.delete(index)
    setDone(next)
    const complete = next.size === DEMO_TASKS.length
    onDone(complete)
    // Закрыто всё: большой салют из карточки, как в настоящем трекере.
    if (complete && cardRef.current) fireBurst(cardRef.current, 80, 220)
  }

  // Карточка наклоняется вслед за курсором, как лежащая на столе: углы уходят в переменные CSS.
  const tilt = (event: PointerEvent<HTMLDivElement>) => {
    const card = cardRef.current
    if (!card || event.pointerType !== 'mouse') return
    const rect = card.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    card.style.setProperty('--tilt-x', `${(-y * 10).toFixed(2)}deg`)
    card.style.setProperty('--tilt-y', `${(x * 12).toFixed(2)}deg`)
  }
  const level = () => {
    cardRef.current?.style.removeProperty('--tilt-x')
    cardRef.current?.style.removeProperty('--tilt-y')
  }

  return (
    <div ref={cardRef} className={styles.demo} onPointerMove={tilt} onPointerLeave={level}>
      <div className={styles.demoHead}>
        <span className="t-heading-5">{tidy('Задачи на сегодня')}</span>
        <span className={`t-caption ${styles.demoHint}`}>{all ? 'всё сделано' : 'попробуй отметить'}</span>
      </div>
      <div className={styles.demoBody}>
        <Donut value={Math.round((done.size / DEMO_TASKS.length) * 100)} size="lg" quiet />
        <ul className={styles.demoList}>
          {DEMO_TASKS.map((title, index) => (
            <li key={title} className={cx(styles.demoTask, done.has(index) && styles.demoDone)}>
              <Checkbox
                checked={done.has(index)}
                burst
                quiet
                onChange={(checked) => toggle(index, checked)}
                aria-label={title}
              />
              <span>{tidy(title)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/**
 * Бегущая строка. Едет сама, а при прокрутке страницы ускоряется в сторону прокрутки:
 * сдвиг складывается из времени и из того, насколько страницу пролистали.
 */
function Marquee() {
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const track = trackRef.current
    if (!track || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    const started = performance.now()
    const move = (now: number) => {
      // Список повторён дважды: сдвиг ходит в пределах его половины, шва не видно.
      const half = track.scrollWidth / 2
      const shift = half > 0 ? ((now - started) * 0.04 + window.scrollY * 0.5) % half : 0
      track.style.transform = `translateX(${-shift}px)`
      frame = requestAnimationFrame(move)
    }
    frame = requestAnimationFrame(move)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className={styles.marquee} aria-hidden>
      <div ref={trackRef} className={styles.marqueeTrack}>
        {[...WORDS, ...WORDS].map((word, index) => (
          <span key={index} className={`t-heading-4 ${styles.marqueeWord}`}>
            {word}
            <span className={styles.marqueeDot} />
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * Лендинг: первая страница для тех, кто ещё не вошёл. Устроен как список дел, то есть как сам
 * трекер: у каждого раздела своя задача, она отмечается, когда раздел прочитан, а кольцо
 * в углу показывает, сколько страницы позади. Рассказывает о трекере его же деталями: живая
 * карточка задач, сцены из ролика, маскот, выбор цвета. Регистрации нет: аккаунты заводятся
 * вручную, поэтому «получить доступ» ведёт в Телеграм владелицы.
 */
export function Landing() {
  const demoRef = useRef<HTMLDivElement>(null)
  // Цвет меняется только на этой странице: настройку трекера он не трогает.
  const [accent, setAccent] = useState<Accent>('lime')
  const [celebrating, setCelebrating] = useState(false)
  const theme = useTheme()

  // --- Задачи страницы ---
  const [done, setDone] = useState<ReadonlySet<TaskId>>(new Set())
  const mark = useCallback((id: TaskId, value = true) => {
    setDone((current) => {
      if (current.has(id) === value) return current
      const next = new Set(current)
      if (value) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  // Разделы, за чтением которых следит страница. «Открыть демо» в их число не входит.
  const sections = useRef(new Map<TaskId, HTMLElement>())
  const track = (id: TaskId) => (node: HTMLElement | null) => {
    if (node) sections.current.set(id, node)
    else sections.current.delete(id)
  }
  useEffect(() => {
    let frame = 0
    const check = () => {
      frame = 0
      const line = window.innerHeight * READ_LINE
      for (const [id, node] of sections.current) {
        if (node.getBoundingClientRect().bottom < line) mark(id)
      }
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [mark])

  // Слово в заголовке меняется по кругу.
  const [subject, setSubject] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = setInterval(() => {
      if (!document.hidden) setSubject((current) => (current + 1) % SUBJECTS.length)
    }, SUBJECT_MS)
    return () => clearInterval(timer)
  }, [])

  const left = PAGE_TASKS.length - done.size
  const percent = Math.round((done.size / PAGE_TASKS.length) * 100)

  /** Строка-задача над разделом: отмечается сама, но её можно отметить и снять рукой. */
  const task = (id: TaskId) => {
    const { title } = PAGE_TASKS.find((item) => item.id === id)!
    const checked = done.has(id)
    return (
      <div className={cx(styles.task, checked && styles.taskDone)}>
        <Checkbox checked={checked} burst onChange={(value) => mark(id, value)} aria-label={title} />
        <span className="t-heading-5">{tidy(title)}</span>
      </div>
    )
  }

  const actions = (size: 'md' | 'lg') => (
    <>
      <Link to="/demo" className={cx(buttonClassName({ size }), styles.cta)} onClick={() => mark('demo')}>
        Посмотреть демо
        <ArrowRight aria-hidden />
      </Link>
      <a
        href={AUTHOR_URL}
        target="_blank"
        rel="noreferrer"
        className={buttonClassName({ variant: 'secondary', size })}
      >
        Получить доступ
      </a>
    </>
  )

  return (
    <div className={styles.page} data-accent={accent}>
      <DotField anchorRef={demoRef} />

      <header className={styles.top}>
        {/* Название возвращает в начало страницы: мы и так на главной, перезагружать нечего. */}
        <a
          href="/"
          className={`t-heading-5 ${styles.logo}`}
          aria-label="Трекер: в начало страницы"
          onClick={(event) => {
            event.preventDefault()
            const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
            window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' })
          }}
        >
          <Mascot size={32} mood={celebrating ? 'happy' : 'calm'} />
          Трекер
        </a>
        <nav className={styles.topNav}>
          <Link to="/demo" className={cx(buttonClassName({ variant: 'ghost' }), styles.topDemo)}>
            Демо
          </Link>
          <Link to="/login" className={buttonClassName({})}>
            Войти
          </Link>
        </nav>
      </header>

      <main className={styles.main}>
        <section ref={track('hero')} className={styles.hero}>
          <div className={styles.heroText}>
            {task('hero')}
            {/* Слова меняются ради анимации: для скринридера заголовок назван целиком. */}
            <h1 className={`t-heading-1 ${styles.title}`} aria-label="Вся неделя в одном трекере">
              {/* key: новое слово въезжает снизу. */}
              <span key={subject} className={styles.subject}>
                {SUBJECTS[subject]}
              </span>
              <span className={styles.rest}>
                {tidy('в одном ')}
                <span className={styles.marked}>трекере</span>
              </span>
            </h1>
            <p className={`t-body-lg ${styles.lead}`}>
              {tidy(LEAD)}
            </p>
            <div className={styles.actions}>{actions('lg')}</div>
          </div>
          <div ref={demoRef} className={styles.heroDemo}>
            <HeroDemo onDone={setCelebrating} />
          </div>
        </section>

        <Marquee />

        <section ref={track('features')} className={styles.block}>
          <Reveal>
            {task('features')}
            <h2 className={`t-heading-2 ${styles.h2}`}>{tidy('Что внутри')}</h2>
            <p className={`t-body-lg ${styles.sub}`}>
              {tidy('Это настоящие детали трекера, а не скриншоты')}
            </p>
          </Reveal>
          <div className={styles.features}>
            {FEATURES.map((feature, index) => (
              <Reveal key={feature.scene} delay={(index % 3) * 90} className={cx(feature.wide && styles.wide)}>
                <article className={styles.feature}>
                  {/* Сцена играет один раз, когда плашка появляется на экране: по кругу она отвлекала. */}
                  <SceneFit id={feature.scene} className={styles.scene} once />
                  <div className={styles.featureText}>
                    <h3 className="t-heading-4">{tidy(feature.title)}</h3>
                    <p className={styles.muted}>{tidy(feature.text)}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <section ref={track('custom')} className={styles.block}>
          <Reveal>
            <div className={styles.custom}>
              <div className={styles.customText}>
                {task('custom')}
                <h2 className={`t-heading-2 ${styles.h2}`}>{tidy('Сделай его своим')}</h2>
                <p className={`t-body-lg ${styles.sub}`}>
                  {tidy('В трекере пять цветов и две темы. Нажми на кружок, и эта страница перекрасится')}
                </p>
                <div className={styles.pickers}>
                  <div className={styles.swatches} role="group" aria-label="Акцентный цвет">
                    {ACCENTS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        data-accent={option.value}
                        className={cx(styles.swatch, option.value === accent && styles.swatchOn)}
                        aria-label={option.label}
                        aria-pressed={option.value === accent}
                        onClick={() => {
                          setAccent(option.value)
                          // Цвет выбран: задача раздела закрыта.
                          mark('custom')
                        }}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    className={cx(buttonClassName({ variant: 'secondary' }), styles.cta)}
                    onClick={(event) =>
                      setTheme(theme === 'dark' ? 'light' : 'dark', { x: event.clientX, y: event.clientY })
                    }
                  >
                    {theme === 'dark' ? <Sun aria-hidden /> : <Moon aria-hidden />}
                    {theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
                  </button>
                </div>
              </div>
              <div className={styles.customMascot}>
                <Mascot size={168} mood="happy" />
                <span className={`t-caption ${styles.muted}`}>{tidy('это маскот, на него можно нажать')}</span>
              </div>
            </div>
          </Reveal>
        </section>

        <section ref={track('perks')} className={styles.block}>
          <Reveal>
            {task('perks')}
            <h2 className={`t-heading-2 ${styles.h2}`}>{tidy('Чем он удобен')}</h2>
          </Reveal>
          <ul className={styles.perks}>
            {PERKS.map(({ title, text }, index) => (
              <li key={title}>
                <Reveal delay={(index % 2) * 90}>
                  <div className={styles.perk}>
                    <span className={styles.perkMark}>
                      <Check aria-hidden />
                    </span>
                    <div className={styles.perkText}>
                      <h3 className="t-heading-5">{tidy(title)}</h3>
                      <p className={styles.muted}>{tidy(text)}</p>
                    </div>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </section>

        <section ref={track('steps')} className={styles.block}>
          <Reveal>
            {task('steps')}
            <h2 className={`t-heading-2 ${styles.h2}`}>{tidy('Как начать')}</h2>
          </Reveal>
          <ol className={styles.steps}>
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <Reveal delay={index * 100}>
                  <div className={styles.step}>
                    <span className={`t-heading-3 ${styles.stepNumber}`}>{index + 1}</span>
                    <h3 className="t-heading-5">{tidy(step.title)}</h3>
                    <p className={styles.muted}>{tidy(step.text)}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </section>

        <Reveal>
          <section className={styles.final}>
            <Mascot size={96} mood={left <= 1 ? 'happy' : 'calm'} />
            <h2 className={`t-heading-1 ${styles.finalTitle}`}>
              {tidy(
                left === 0
                  ? 'Все задачи закрыты'
                  : left === 1
                    ? 'Осталась одна задача'
                    : 'Задачи сами себя не закроют',
              )}
            </h2>
            <div className={styles.finalTask}>{task('demo')}</div>
            <div className={styles.actions}>{actions('lg')}</div>
          </section>
        </Reveal>
      </main>

      {/* Кольцо в углу: сколько задач страницы уже закрыто. */}
      <div className={styles.progress} aria-hidden>
        <Donut value={percent} size="sm" quiet />
        <div className={styles.progressText}>
          <span className="t-body-md">Задачи страницы</span>
          <span className={`t-caption ${styles.muted}`}>
            {done.size} из {PAGE_TASKS.length}
          </span>
        </div>
      </div>

      <footer className={`t-body-sm ${styles.footer}`}>
        <span>Designed &amp; developed by</span>
        <a href={AUTHOR_URL} target="_blank" rel="noreferrer">
          Anastasia
        </a>
      </footer>
    </div>
  )
}
