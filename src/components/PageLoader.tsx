import { useEffect } from 'react'
import { cx } from '../lib/cx'
import { holdSplash } from '../lib/splash'
import styles from './PageLoader.module.css'

type Props = {
  /** На весь экран: пока проверяется вход и грузится код приложения. */
  screen?: boolean
}

/**
 * Загрузка экрана: просто чистое место, без заглушек и без маскота. Серые силуэты
 * не совпадали с настоящим содержимым по высоте, и экран дёргался, когда оно появлялось;
 * маскот по центру оказался перебором. Содержимое потом проявляется целиком.
 * При самом первом открытии трекера поверх стоит заставка с маскотом (см. `splash.ts`):
 * пока на экране есть хоть одна загрузка, она не уходит.
 */
export function PageLoader({ screen }: Props) {
  useEffect(holdSplash, [])
  return (
    <div
      className={cx(styles.loader, screen && styles.screen)}
      aria-busy="true"
      aria-label="Загрузка"
    />
  )
}
