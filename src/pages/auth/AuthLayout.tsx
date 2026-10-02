import type { ReactNode } from 'react'
import styles from './AuthLayout.module.css'

type Props = {
  title: string
  subtitle: string
  children: ReactNode
}

/** Каркас экрана входа: без сайдбара, по центру логотип и карточка 380px. */
export function AuthLayout({ title, subtitle, children }: Props) {
  return (
    <main className={styles.page}>
      <div className="t-heading-2">Трекер</div>
      <div className={styles.card}>
        <header className={styles.heading}>
          <h1 className="t-heading-5">{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </header>
        {children}
      </div>
    </main>
  )
}
