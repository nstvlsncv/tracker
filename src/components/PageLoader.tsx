import { useEffect, useState } from 'react'
import { cx } from '../lib/cx'
import { Mascot } from './Mascot'
import styles from './PageLoader.module.css'

/** Быстрая загрузка проходит без маскота: он появляется, только если ждать приходится дольше. */
const SHOW_AFTER_MS = 250

type Props = {
  /** На весь экран: пока проверяется вход и грузится код приложения. */
  screen?: boolean
}

/**
 * Загрузка экрана: маскот по центру свободного места. Серых заглушек-силуэтов нет: они
 * не совпадали с настоящим содержимым по высоте, и экран дёргался, когда оно появлялось.
 */
export function PageLoader({ screen }: Props) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setShown(true), SHOW_AFTER_MS)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className={cx(styles.loader, screen && styles.screen)} aria-busy="true" aria-label="Загрузка">
      {shown && <Mascot size={64} interactive={false} still className={styles.mascot} />}
    </div>
  )
}
