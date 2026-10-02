import { useAfterMount } from '../lib/useAfterMount'
import styles from './RollingNumber.module.css'

type Props = {
  /** Число или текст с числом: 6, «67%». Знаки, которые не цифры, стоят на месте. */
  value: number | string
}

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
// Ячейки барабана: пустая, потом цифры. С пустой стартуют старшие разряды, чтобы число
// появлялось из «0», а не из «000».
const CELLS = ['', ...DIGITS]

/**
 * Число-счётчик: каждая цифра это барабан от 0 до 9, который проворачивается до нужной.
 * При появлении число вырастает из нуля: единицы крутятся от 0, старшие разряды выезжают
 * из пустоты. При смене значения барабаны крутятся от прежней цифры.
 */
export function RollingNumber({ value }: Props) {
  const ready = useAfterMount()
  const text = String(value)
  const lastDigit = [...text].findLastIndex((char) => DIGITS.includes(char))

  return (
    <span className={styles.number}>
      <span className="visually-hidden">{text}</span>
      <span aria-hidden>
        {[...text].map((char, index) => {
          // Ключ считается от правого края: единицы остаются единицами, когда число растёт.
          const key = text.length - index
          if (!DIGITS.includes(char)) return <span key={key}>{char}</span>
          const isUnits = index === lastDigit
          const cell = ready ? Number(char) + 1 : isUnits ? 1 : 0
          return (
            <span key={key} className={styles.digit}>
              {/* Невидимая цифра держит ширину, поверх неё ездит барабан. */}
              <span className={styles.sizer}>{char}</span>
              <span className={styles.drum} style={{ transform: `translateY(-${(cell * 100) / CELLS.length}%)` }}>
                {CELLS.map((digit) => (
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
