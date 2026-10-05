import type { CSSProperties } from 'react'
import { cx } from '../lib/cx'
import { Mascot } from './Mascot'
import styles from './Avatar.module.css'

type Props = {
  /** Адрес фото. Пока фото нет, в кружке маскот. */
  url?: string | null
  /** Диаметр в пикселях. */
  size?: number
  className?: string
}

/**
 * Фото профиля в кружке. Без фото на его месте маскот: он и так лицо трекера.
 * Украшение: имя рядом говорит, чей это профиль.
 */
export function Avatar({ url, size = 40, className }: Props) {
  if (!url) return <Mascot size={size} interactive={false} still className={className} />
  return (
    <img
      src={url}
      alt=""
      className={cx(styles.avatar, className)}
      style={{ '--size': `${size}px` } as CSSProperties}
      draggable={false}
    />
  )
}
