import { cx } from '../lib/cx'
import styles from './PageLoader.module.css'

type Props = {
  /** На весь экран: пока проверяется вход и грузится код приложения. */
  screen?: boolean
}

/**
 * Загрузка экрана: просто чистое место, без заглушек и без маскота. Серые силуэты
 * не совпадали с настоящим содержимым по высоте, и экран дёргался, когда оно появлялось;
 * маскот по центру оказался перебором. Содержимое потом проявляется целиком.
 */
export function PageLoader({ screen }: Props) {
  return (
    <div
      className={cx(styles.loader, screen && styles.screen)}
      aria-busy="true"
      aria-label="Загрузка"
    />
  )
}
