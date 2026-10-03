import type { CSSProperties } from 'react'
import { BURST_DOTS as DOTS } from './fireBurst'
import styles from './Burst.module.css'

type Props = {
  /** На каком расстоянии от центра точки появляются и до какого долетают, px. */
  from: number
  to: number
}

/**
 * Маленький праздник: точки разлетаются из центра родителя и гаснут. Рисуется поверх
 * родителя (тому нужен position: relative), на клики не реагирует. Чтобы проиграть ещё раз,
 * компонент пересоздают с новым key.
 */
export function Burst({ from, to }: Props) {
  return (
    <span className={styles.burst} aria-hidden>
      {Array.from({ length: DOTS }, (_, index) => (
        <span
          key={index}
          style={
            {
              '--angle': `${(360 / DOTS) * index}deg`,
              '--from': `${from}px`,
              '--to': `${to}px`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  )
}
