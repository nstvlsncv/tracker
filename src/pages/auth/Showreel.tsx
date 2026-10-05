import { useEffect, useState } from 'react'
import { ArrowBendUpRight, Repeat } from '@phosphor-icons/react'
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
  { id: 'goals', title: 'Цели недели' },
  { id: 'repeat', title: 'Повтор и перенос' },
  { id: 'habits', title: 'Привычки и серии' },
  { id: 'note', title: 'Заметка недели' },
  { id: 'mascot', title: 'Свой цвет и тема' },
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

/** Сцена 6: заметка недели печатается сама, маскот читает. */
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

/** Сцена 5: точки истории заполняются, серия растёт. */
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

const GOALS = ['Дочитать книгу', 'Три тренировки', 'Сдать отчёт']

/** Сцена 3: цели недели закрываются одна за другой, каждая с салютом (последняя с большим). */
function GoalsScene({ step }: { step: number }) {
  const done = Math.min(GOALS.length, Math.floor(step / 2))
  return (
    <div className={styles.goals}>
      <span className={`t-body-sm ${styles.muted}`}>
        выполнено <RollingNumber value={done} /> из {GOALS.length}
      </span>
      <ul className={styles.tasks}>
        {GOALS.map((title, index) => (
          <li key={title} className={cx(styles.task, index < done && styles.taskDone)}>
            <Checkbox
              checked={index < done}
              onChange={noop}
              burst
              // Последняя цель закрывает неделю: салют крупнее.
              celebrate={index === GOALS.length - 1}
              quiet
              aria-label={title}
            />
            <span>{title}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const REPEAT_DAYS = ['Пн', 'Вт', 'Ср']
/** С какого шага задача уезжает на завтра; шагом раньше она «собирается». */
const MOVE_STEP = 5

/** Сцена 4: повторяющаяся задача сама встаёт в каждый день, а несделанная переезжает на завтра. */
function RepeatScene({ step }: { step: number }) {
  const moved = step >= MOVE_STEP
  return (
    <div className={styles.repeat}>
      {REPEAT_DAYS.map((day, index) => (
        <div key={day} className={styles.repeatDay}>
          <span className={`t-body-sm ${styles.muted}`}>{day}</span>
          {step >= index && (
            <span className={styles.chip}>
              <span className={styles.chipMark} />
              Зарядка
              <Repeat className={styles.chipIcon} />
            </span>
          )}
          {index === (moved ? 1 : 0) && (
            <span
              key={moved ? 'moved' : 'home'}
              className={cx(styles.chip, !moved && step === MOVE_STEP - 1 && styles.chipLeaving)}
            >
              <span className={styles.chipMark} />
              Звонок
              {!moved && step === MOVE_STEP - 1 && <ArrowBendUpRight className={styles.chipIcon} />}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

/** Сколько шагов сцены уходит на цвета; дальше плашка показывает другую тему. */
const THEME_STEP = ACCENTS.length

/**
 * Сцена 7: маскот перебирает акцентные цвета, каждый по одному разу, затем плашка
 * перекрашивается в другую тему, и маскот радуется.
 */
function MascotScene({ step }: { step: number }) {
  // Цветов меньше, чем шагов: дойдя до последнего, маскот на нём и остаётся, а не идёт по кругу.
  const accent = ACCENTS[Math.min(step, ACCENTS.length - 1)]
  return (
    <div className={styles.mascotScene} data-accent={accent.value}>
      {/* Прыгает один раз, в конце: прыжок на каждой смене цвета обрывался и дёргался. */}
      <Mascot size={88} interactive={false} still mood={step > THEME_STEP ? 'happy' : 'calm'} />
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
 * по кругу, как видео. Семь сцен: задачи дня, неделя, цели, повтор и перенос, привычки, заметка, маскот с цветами и темой.
 * Нажимать в нём нечего: он неживой (inert) и для скринридера не существует.
 * При отключённых в системе анимациях стоит на первой сцене в её конечном виде.
 */
export function Showreel({ onThemeFlip }: { onThemeFlip?: (flipped: boolean) => void }) {
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

  // В конце последней сцены ролик показывает другую тему: перекрашивается вся плашка вокруг.
  const flipped = !still && scene.id === 'mascot' && step >= THEME_STEP
  useEffect(() => {
    onThemeFlip?.(flipped)
  }, [flipped, onThemeFlip])

  return (
    <div className={styles.reel} inert aria-hidden>
      <span key={scene.id} className={`t-heading-5 ${styles.title}`}>
        {scene.title}
      </span>
      {/* key: каждая сцена создаётся заново и проявляется, счётчики и кольцо стартуют с нуля. */}
      <div key={loop} className={styles.scene}>
        {scene.id === 'day' && <DayScene step={step} />}
        {scene.id === 'week' && <WeekScene step={step} />}
        {scene.id === 'goals' && <GoalsScene step={step} />}
        {scene.id === 'repeat' && <RepeatScene step={step} />}
        {scene.id === 'habits' && <HabitsScene step={step} />}
        {scene.id === 'note' && <NoteScene step={step} />}
        {scene.id === 'mascot' && <MascotScene step={step} />}
      </div>
    </div>
  )
}
