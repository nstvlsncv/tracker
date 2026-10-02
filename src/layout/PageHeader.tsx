import type { ReactNode } from 'react'
import styles from './PageHeader.module.css'

type Props = {
  title: string
  /** Стоит сразу за названием, с отступом 16px (выбор недели). */
  aside?: ReactNode
  /** Кнопки у правого края. */
  actions?: ReactNode
}

/** Шапка экрана: название раздела и кнопки. До основного содержимого от неё 24px. */
export function PageHeader({ title, aside, actions }: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.title}>
        <h1 className="t-heading-1">{title}</h1>
        {aside}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  )
}
