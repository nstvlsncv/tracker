import { useEffect, useRef } from 'react'
import { cx } from '../lib/cx'
import { fireBurst } from './fireBurst'
import { useBurst } from './useBurst'
import styles from './Checkbox.module.css'

type Props = {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  /** Этой отметкой закрыто всё (например, все привычки за день): салют крупнее обычного. */
  celebrate?: boolean
  /** У чекбокса нет своего текста, подпись обязательна. */
  'aria-label': string
}

/**
 * Круглый чекбокс 32×32. При отметке круг заливается, галочка прорисовывается штрихом,
 * а из чекбокса разлетается маленький салют. Если отметка уже стояла при появлении
 * чекбокса, салюта нет: он только за то, что сделано сейчас.
 */
export function Checkbox({ checked, onChange, disabled, celebrate = false, ...rest }: Props) {
  const ref = useRef<HTMLButtonElement>(null)
  const burst = useBurst(checked)
  // Размер салюта берётся на момент отметки, а не при каждой перерисовке.
  const big = useRef(celebrate)
  useEffect(() => {
    big.current = celebrate
  })

  useEffect(() => {
    if (burst > 0 && ref.current) fireBurst(ref.current, 14, big.current ? 46 : 30)
  }, [burst])

  return (
    <button
      ref={ref}
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      className={cx(styles.checkbox, checked && styles.checked)}
      onClick={(event) => {
        // Чекбокс внутри кликабельной карточки (аккордеон привычек) не должен её раскрывать.
        event.stopPropagation()
        onChange(!checked)
      }}
      {...rest}
    >
      <svg viewBox="0 0 32 32" aria-hidden>
        <path className={styles.check} d="M10 16.5l4.2 4.2L22 11.8" pathLength={1} />
      </svg>
    </button>
  )
}
