import type { ReactNode } from 'react'
import styles from './Section.module.css'

type Props = {
  title: string
  /** Что стоит справа от заголовка: выпадающий список, кнопка. */
  action?: ReactNode
  children: ReactNode
}

/** Карточка-секция экрана: «Цели недели», «Задачи на сегодня» и т. п. */
export function Section({ title, action, children }: Props) {
  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <h2 className="t-heading-5">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  )
}
