import { useEffect, useState } from 'react'
import { Checkbox } from '../../components/Checkbox'
import { Donut } from '../../components/Donut'
import { Mascot } from '../../components/Mascot'
import { RollingNumber } from '../../components/RollingNumber'
import { ACCENTS } from '../../lib/accent'
import { cx } from '../../lib/cx'
import styles from './Showreel.module.css'

// Ролик идёт шагами: у каждой сцены их поровну, на каждом шаге в сцене что-то происходит.
const STEP_MS = 480
const STEPS_PER_SCENE = 8

const SCENES = [
  { id: 'day', title: 'Задачи дня' },
  { id: 'week', title: 'Вся неделя на виду' },
  { id: 'habits', title: 'Привычки и серии' },
  { id: 'note', title: 'Заметка недели' },
  { id: 'stats', title: 'Итоги недель' },
  { id: 'mascot', title: 'Свой цвет' },
] as const

// Короткие: в ролике названия стоят в одну строку и не должны обрезаться.
const TASKS = ['Разобрать почту', 'План на неделю', 'Почитать на ночь']
const noop = () => {}

/** Сцена 1: задачи отмечаются одна за другой, кольцо доходит до 100% и салютует. */
function DayScene({ step }: { step: number }) {
  const done = Math.min(TASKS.length, Math.max(0, step - 1))
  return (
    <div className={styles.day}>
      <Donut value={Math.round((done / TASKS.length) * 100)} size="lg" quiet />
      <ul className={styles.tasks}>
        {TASKS.map((title, index) => (
          <li key={title} className={cx(styles.task, index < done && styles.taskDone)}>
            <Checkbox checked={index < done} onChange={noop} aria-label={title} />
            <span>{title}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const WEEK = [
  { day: 'Пн', value: 100 },
  { day: 'Вт', value: 75 },
  { day: 'Ср', value: 100 },
  { day: 'Чт', value: 50 },
  { day: 'Пт', value: 25 },
]

/** Сцена 2: кольца дней недели заполняются одно за другим. */
function WeekScene({ step }: { step: number }) {
  return (
    <div className={styles.week}>
      {WEEK.map(({ day, value }, index) => (
        <div key={day} className={styles.weekDay}>
          <span className={`t-heading-5 ${styles.weekLabel}`}>{day}</span>
          <Donut value={step > index ? value : 0} size="sm" quiet />
        </div>
      ))}
    </div>
  )
}

const NOTE = 'Хорошая неделя: закрыто почти всё. На следующей не забыть про отдых.'

/** Сцена 4: заметка недели печатается сама, маскот читает. */
function NoteScene({ step }: { step: number }) {
  const typed = NOTE.slice(0, Math.round(NOTE.length * Math.min(1, step / 6)))
  return (
    <div className={styles.note}>
      <Mascot size={40} interactive={false} still mood={step >= 6 ? 'happy' : 'calm'} />
      <p className={styles.noteField}>
        {typed}
        <span className={styles.caret} />
      </p>
    </div>
  )
}

const HISTORY = 14
const HISTORY_FILLED = 9

/** Сцена 3: точки истории заполняются, серия растёт. */
function HabitsScene({ step }: { step: number }) {
  const filled = HISTORY_FILLED + Math.min(HISTORY - HISTORY_FILLED, step)
  const today = filled === HISTORY
  return (
    <div className={styles.habit}>
      <div className={styles.habitHead}>
        <Checkbox checked={today} onChange={noop} aria-label="Чтение" />
        <div className={styles.habitText}>
          <span className={cx('t-heading-5', today && styles.struck)}>Чтение 20 минут</span>
          <span className={`t-body-sm ${styles.muted}`}>
            серия <RollingNumber value={filled} /> дней
          </span>
        </div>
      </div>
      <div className={styles.dots}>
        {Array.from({ length: HISTORY }, (_, index) => (
          <span
            key={index}
            className={cx(
              styles.dot,
              index < filled && styles.dotDone,
              index === HISTORY - 1 && styles.dotToday,
            )}
          />
        ))}
      </div>
    </div>
  )
}

const BARS = [35, 60, 55, 72, 48, 80, 66, 92]

/** Сцена 5: столбики недель вырастают один за другим, маскот доволен. */
function StatsScene({ step }: { step: number }) {
  const grown = step >= 1
  return (
    <div className={styles.stats}>
      <div className={styles.verdict}>
        <Mascot size={40} interactive={false} still mood={step >= 5 ? 'happy' : 'calm'} />
        <span className="t-heading-5">Отличная неделя</span>
      </div>
      <div className={styles.bars}>
        {BARS.map((height, index) => (
          <span key={index} className={styles.barTrack}>
            <span
              className={styles.barFill}
              style={{ height: grown ? `${height}%` : 0, transitionDelay: `${index * 70}ms` }}
            />
          </span>
        ))}
      </div>
    </div>
  )
}

/** Сцена 6: маскот перебирает акцентные цвета и в конце радуется. */
function MascotScene({ step }: { step: number }) {
  const accent = ACCENTS[step % ACCENTS.length]
  return (
    <div className={styles.mascotScene} data-accent={accent.value}>
      {/* Прыгает один раз, в конце: прыжок на каждой смене цвета обрывался и дёргался. */}
      <Mascot size={88} interactive={false} still mood={step >= 6 ? 'happy' : 'calm'} />
      <div className={styles.swatches}>
        {ACCENTS.map((option) => (
          <span
            key={option.value}
            data-accent={option.value}
            className={cx(styles.swatch, option.value === accent.value && styles.swatchOn)}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Шоурил на экране входа: короткий ролик из настоящих деталей трекера, который сам играет
 * по кругу, как видео. Шесть сцен: задачи дня, неделя, привычки, заметка, итоги, маскот и цвета.
 * Нажимать в нём нечего: он неживой (inert) и для скринридера не существует.
 * При отключённых в системе анимациях стоит на первой сцене в её конечном виде.
 */
export function Showreel() {
  const [still] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [time, setTime] = useState(still ? STEPS_PER_SCENE - 1 : 0)

  useEffect(() => {
    if (still) return
    const timer = setInterval(() => {
      // В фоновой вкладке ролик стоит: вернувшись, человек видит его с того же места.
      if (!document.hidden) setTime((current) => current + 1)
    }, STEP_MS)
    return () => clearInterval(timer)
  }, [still])

  const loop = Math.floor(time / STEPS_PER_SCENE)
  const index = loop % SCENES.length
  const step = time % STEPS_PER_SCENE
  const scene = SCENES[index]

  return (
    <div className={styles.reel} inert aria-hidden>
      <span key={scene.id} className={`t-heading-5 ${styles.title}`}>
        {scene.title}
      </span>
      {/* key: каждая сцена создаётся заново и проявляется, счётчики и кольцо стартуют с нуля. */}
      <div key={loop} className={styles.scene}>
        {scene.id === 'day' && <DayScene step={step} />}
        {scene.id === 'week' && <WeekScene step={step} />}
        {scene.id === 'habits' && <HabitsScene step={step} />}
        {scene.id === 'note' && <NoteScene step={step} />}
        {scene.id === 'stats' && <StatsScene step={step} />}
        {scene.id === 'mascot' && <MascotScene step={step} />}
      </div>
    </div>
  )
}
