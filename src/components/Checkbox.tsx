import { useEffect, useRef } from 'react'
import { cx } from '../lib/cx'
import { fireBurst } from './fireBurst'
import { useBurst } from './useBurst'
import styles from './Checkbox.module.css'

type Props = {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  /** Салют при каждой отметке (привычки). У задач и целей его нет: там празднует прогресс дня. */
  burst?: boolean
  /** Этой отметкой закрыто всё (все привычки за день): салют крупнее обычного. */
  celebrate?: boolean
  /** Салют без прыжка маскота: ролик на экране входа, где отметки ставятся сами. */
  quiet?: boolean
  /**
   * Отметить сейчас нельзя (привычка не своего дня, норма недели набрана): чекбокс бледнее.
   * Нажать его всё равно можно: в ответ тот, кто его показывает, объясняет почему.
   */
  locked?: boolean
  /** У чекбокса нет своего текста, подпись обязательна. */
  'aria-label': string
}

/**
 * Круглый чекбокс 32×32. При отметке круг заливается, галочка прорисовывается штрихом.
 * С `burst` из чекбокса при отметке разлетается маленький салют. Если отметка уже стояла
 * при появлении чекбокса, салюта нет: он только за то, что сделано сейчас.
 */
export function Checkbox({
  checked,
  onChange,
  disabled,
  burst = false,
  celebrate = false,
  quiet = false,
  locked = false,
  ...rest
}: Props) {
  const ref = useRef<HTMLButtonElement>(null)
  const checks = useBurst(checked)
  // Размер салюта берётся на момент отметки, а не при каждой перерисовке.
  const latest = useRef({ burst, celebrate, quiet })
  useEffect(() => {
    latest.current = { burst, celebrate, quiet }
  })

  useEffect(() => {
    if (checks > 0 && latest.current.burst && ref.current) {
      fireBurst(ref.current, 14, latest.current.celebrate ? 46 : 30, {
        quiet: latest.current.quiet,
      })
    }
  }, [checks])

  return (
    <button
      ref={ref}
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      className={cx(styles.checkbox, checked && styles.checked, locked && !checked && styles.locked)}
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
