import { ArrowLeft } from '@phosphor-icons/react'
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { buttonClassName } from '../components/buttonStyles'
import { cx } from '../lib/cx'
import styles from './PageHeader.module.css'

type Props = {
  title: string
  /** Стоит сразу за названием, с отступом 16px (выбор недели). */
  aside?: ReactNode
  /** Кнопки у правого края. */
  actions?: ReactNode
  /**
   * Куда ведёт стрелка «назад» перед названием (адрес относительно текущего). Стрелка есть
   * только на телефоне и только у экранов, которых нет в нижней панели (Профиль).
   */
  backTo?: string
  /** Стрелка «назад» видна на любом экране: у разделов, которых нет и в боковом меню (Итоги). */
  backAlways?: boolean
}

/**
 * Шапка экрана: название раздела и кнопки. До основного содержимого от неё 24px.
 * На телефоне кнопки не стоят в шапке, а закреплены внизу экрана, над нижней панелью.
 */
export function PageHeader({ title, aside, actions, backTo, backAlways }: Props) {
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
      <div className={cx(styles.title, backAlways && styles.withBack)}>
        {backTo && (
          <Link
            to={backTo}
            relative="path"
            className={cx(buttonClassName({ variant: 'ghost', iconOnly: true }), styles.back)}
            aria-label="Назад"
          >
            <ArrowLeft aria-hidden />
          </Link>
        )}
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
