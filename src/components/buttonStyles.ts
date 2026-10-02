import { cx } from '../lib/cx'
import styles from './Button.module.css'

/** Accent: Main, Secondary, Ghost. Danger: Main, Ghost. */
export type ButtonStyle =
  | { tone?: 'accent'; variant?: 'main' | 'secondary' | 'ghost' }
  | { tone: 'danger'; variant?: 'main' | 'ghost' }

export type ButtonSize = 'sm' | 'md' | 'lg'

const STYLE_CLASS = {
  accent: { main: styles.accentMain, secondary: styles.accentSecondary, ghost: styles.accentGhost },
  danger: { main: styles.dangerMain, secondary: undefined, ghost: styles.dangerGhost },
}

/** Общие классы для Button и IconButton: у них одни стили, варианты и состояния. */
export function buttonClassName(options: {
  tone?: 'accent' | 'danger'
  variant?: 'main' | 'secondary' | 'ghost'
  size?: ButtonSize
  pending?: boolean
  iconOnly?: boolean
  fullWidth?: boolean
}): string {
  const { tone = 'accent', variant = 'main', size = 'md', pending, iconOnly, fullWidth } = options
  return cx(
    't-button',
    styles.button,
    STYLE_CLASS[tone][variant],
    styles[size],
    pending && styles.pending,
    iconOnly && styles.iconOnly,
    fullWidth && styles.fullWidth,
  )
}

export { styles as buttonStyles }
