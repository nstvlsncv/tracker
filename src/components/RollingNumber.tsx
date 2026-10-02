import { useAfterMount } from '../lib/useAfterMount'
import styles from './RollingNumber.module.css'

type Props = {
  /** Число или текст с числом: 6, «67%». Знаки, которые не цифры, стоят на месте. */
  value: number | string
}

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

/**
 * Число-счётчик: каждая цифра это барабан от 0 до 9, который проворачивается до нужной.
 * При появлении барабаны крутятся от нуля, при смене значения от прежней цифры.
 */
export function RollingNumber({ value }: Props) {
  const ready = useAfterMount()
  const text = String(value)

  return (
    <span className={styles.number}>
      <span className="visually-hidden">{text}</span>
      <span aria-hidden>
        {[...text].map((char, index) => {
          // Ключ считается от правого края: единицы остаются единицами, когда число растёт.
          const key = text.length - index
          if (!DIGITS.includes(char)) return <span key={key}>{char}</span>
          const shown = ready ? Number(char) : 0
          return (
            <span key={key} className={styles.digit}>
              {/* Невидимая цифра держит ширину, поверх неё ездит барабан. */}
              <span className={styles.sizer}>{char}</span>
              <span className={styles.drum} style={{ transform: `translateY(-${shown * 10}%)` }}>
                {DIGITS.map((digit) => (
                  <span key={digit}>{digit}</span>
                ))}
              </span>
            </span>
          )
        })}
      </span>
    </span>
  )
}
