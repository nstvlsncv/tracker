import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import styles from './PageHeader.module.css'

type Props = {
  title: string
  /** Стоит сразу за названием, с отступом 16px (выбор недели). */
  aside?: ReactNode
  /** Кнопки у правого края. */
  actions?: ReactNode
}

/**
 * Шапка экрана: название раздела и кнопки. До основного содержимого от неё 24px.
 * На телефоне кнопки не стоят в шапке, а закреплены внизу экрана, над нижней панелью.
 */
export function PageHeader({ title, aside, actions }: Props) {
  const actionsRef = useRef<HTMLDivElement>(null)
  const hasActions = Boolean(actions)

  // Высота блока кнопок уходит в CSS-переменную: на телефоне каркас оставляет под
  // закреплённые кнопки место внизу страницы, чтобы они не закрывали последний блок.
  useEffect(() => {
    const block = actionsRef.current
    if (!block) return
    const root = document.documentElement
    const observer = new ResizeObserver(() =>
      root.style.setProperty('--page-actions-height', `${block.offsetHeight}px`),
    )
    observer.observe(block)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--page-actions-height')
    }
  }, [hasActions])

  return (
    <header className={styles.header}>
      <div className={styles.title}>
        <h1 className="t-heading-1">{title}</h1>
        {aside}
      </div>
      {actions && (
        <div ref={actionsRef} className={styles.actions}>
          {actions}
        </div>
      )}
    </header>
  )
}
