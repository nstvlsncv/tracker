import { cx } from '../lib/cx'
import styles from './Checkbox.module.css'

type Props = {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  /** У чекбокса нет своего текста, подпись обязательна. */
  'aria-label': string
}

/** Круглый чекбокс 32×32. При отметке круг заливается, а галочка прорисовывается штрихом. */
export function Checkbox({ checked, onChange, disabled, ...rest }: Props) {
  return (
    <button
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
