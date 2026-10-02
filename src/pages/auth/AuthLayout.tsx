import { useRef } from 'react'
import type { ReactNode } from 'react'
import { DotField } from './DotField'
import styles from './AuthLayout.module.css'

type Props = {
  title: string
  subtitle: string
  children: ReactNode
}

const AUTHOR_URL = 'https://t.me/nst_vlsncv'

/** Каркас экрана входа: без сайдбара, логотип и карточка 380px на 120px ниже верхнего края. */
export function AuthLayout({ title, subtitle, children }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)

  return (
    <main className={styles.page}>
      <DotField anchorRef={cardRef} />
      <div className={styles.content}>
        <div className="t-heading-2">Трекер</div>
        <div ref={cardRef} className={styles.card}>
          <header className={styles.heading}>
            <h1 className="t-heading-5">{title}</h1>
            <p className={styles.subtitle}>{subtitle}</p>
          </header>
          {children}
        </div>
      </div>
      <footer className={`t-body-sm ${styles.footer}`}>
        Designed &amp; developed by{' '}
        <a className={styles.author} href={AUTHOR_URL} target="_blank" rel="noreferrer">
          Anastasia
        </a>{' '}
        with love ♡
      </footer>
    </main>
  )
}
