import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { DotField } from './DotField'
import styles from './AuthLayout.module.css'

type Props = {
  title: string
  subtitle: string
  /** Счётчик ошибок: с каждым новым значением карточка коротко качается из стороны в сторону. */
  shake?: number
  /** Вход выполнен: экран растворяется, пока открывается приложение. */
  leaving?: boolean
  children: ReactNode
}

/** Карточка «качает головой»: размах затухает. */
const SHAKE_PX = [-10, 9, -7, 5, -3]

export const AUTHOR_URL = 'https://t.me/nst_vlsncv'

/** Каркас экрана входа: без сайдбара, логотип и карточка 450px на 120px ниже верхнего края. */
export function AuthLayout({ title, subtitle, shake = 0, leaving, children }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!shake || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    cardRef.current?.animate(
      { transform: ['none', ...SHAKE_PX.map((px) => `translateX(${px}px)`), 'none'] },
      { duration: 420, easing: 'ease-out' },
    )
  }, [shake])

  return (
    <main className={cx(styles.page, leaving && styles.leaving)}>
      <DotField anchorRef={cardRef} />
      <div className={styles.content}>
        <div className={styles.brand}>
          <div className={`t-heading-2 ${styles.logo}`}>
            <span className={styles.mark} aria-hidden />
            Трекер
          </div>
          <p className={`t-body-sm ${styles.tagline}`}>
            Недели, задачи, цели и привычки в одном месте
          </p>
        </div>
        <div ref={cardRef} className={styles.card}>
          <header className={styles.heading}>
            <h1 className="t-heading-5">{title}</h1>
            <p className={styles.subtitle}>{subtitle}</p>
          </header>
          {children}
        </div>
      </div>
      <footer className={`t-body-sm ${styles.footer}`}>
        Designed &amp; developed
        <br />
        by{' '}
        <a className={styles.author} href={AUTHOR_URL} target="_blank" rel="noreferrer">
          Anastasia
        </a>{' '}
        with love
      </footer>
    </main>
  )
}
