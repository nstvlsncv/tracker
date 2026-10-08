import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Mascot } from '../../components/Mascot'
import { AUTHOR_URL } from '../../lib/constants'
import { cx } from '../../lib/cx'
import { DotField } from './DotField'
import { Showreel } from './Showreel'
import styles from './AuthLayout.module.css'

type Props = {
  title: string
  subtitle: string
  /** Счётчик ошибок: с каждым новым значением карточка коротко качается из стороны в сторону. */
  shake?: number
  /** Вход выполнен: экран растворяется, пока открывается приложение. */
  leaving?: boolean
  /** Настроение маскота у названия: зажмуривается на пароле, радуется удачному входу. */
  mood?: 'calm' | 'shy' | 'happy'
  /** Кнопка во второй карточке, рядом со строкой о сервисе («Посмотреть демо»). */
  action?: ReactNode
  children: ReactNode
}

/** Карточка «качает головой»: размах затухает. */
const SHAKE_PX = [-10, 9, -7, 5, -3]

export { AUTHOR_URL }

/** Каркас экрана входа: без сайдбара, логотип и карточка 450px на 120px ниже верхнего края. */
export function AuthLayout({ title, subtitle, shake = 0, leaving, mood, action, children }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  // Пятно точек стоит под серединой колонки с формой и карточкой демо.
  const cardsRef = useRef<HTMLDivElement>(null)
  // Левая половина: на неё маскот поглядывает, когда курсор стоит.
  const stageRef = useRef<HTMLElement>(null)
  // Ролик в конце показывает другую тему: на это время перекрашивается вся плашка.
  const [stageTheme, setStageTheme] = useState<'light' | 'dark'>()
  const flipTheme = useCallback((flipped: boolean) => {
    const dark = document.documentElement.dataset.theme === 'dark'
    setStageTheme(flipped ? (dark ? 'light' : 'dark') : undefined)
  }, [])

  useEffect(() => {
    if (!shake || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    cardRef.current?.animate(
      { transform: ['none', ...SHAKE_PX.map((px) => `translateX(${px}px)`), 'none'] },
      { duration: 420, easing: 'ease-out' },
    )
  }, [shake])

  // Что это за сервис и кнопка, которая его показывает. Стоит в двух местах: на компьютере
  // под роликом, на планшете и телефоне под формой (видно всегда только одно).
  const promo = (
    <>
      {/* Неразрывные пробелы: «и» и «в» не остаются висеть в конце строки. */}
      <p className="t-body-sm">Недели, задачи, привычки, финансы и&nbsp;списки в&nbsp;одном месте</p>
      {action}
    </>
  )

  return (
    <main className={cx(styles.page, leaving && styles.leaving)} data-accent="lime">
      <DotField anchorRef={cardsRef} />
      {/* Компьютер: левая половина экрана отдана ролику, справа название, форма и подпись. */}
      <aside ref={stageRef} className={styles.stage} data-theme={stageTheme}>
        <div className={styles.stageReel}>
          <Showreel onThemeFlip={flipTheme} />
        </div>
        {/* Карточка демо на компьютере живёт здесь, под роликом. */}
        <div className={styles.stagePromo}>{promo}</div>
      </aside>
      <div className={styles.side}>
      <div className={styles.content}>
        {/* Название с маскотом ведёт обратно на лендинг: гость на главном адресе видит рассказ о трекере. */}
        <Link to="/" className={`t-heading-2 ${styles.logo}`} aria-label="Трекер: о трекере">
          <Mascot size="1.3em" mood={mood} idleTarget={stageRef} />
          Трекер
        </Link>
        <div ref={cardsRef} className={styles.cards}>
          <div ref={cardRef} className={styles.card}>
            <header className={styles.heading}>
              <h1 className="t-heading-5">{title}</h1>
              <p className={styles.subtitle}>{subtitle}</p>
            </header>
            {children}
          </div>
          {/* Вторая карточка: что это за сервис и кнопка, которая его показывает. */}
          {/* На планшете и телефоне ролика нет: карточка демо стоит под формой. */}
          <div className={styles.promo}>{promo}</div>
        </div>
      </div>
      </div>
    </main>
  )
}
