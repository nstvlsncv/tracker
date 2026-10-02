import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '../lib/cx'
import { buttonClassName, buttonStyles } from './buttonStyles'
import type { ButtonSize, ButtonStyle } from './buttonStyles'

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> &
  ButtonStyle & {
    icon: ReactNode
    /** Иконка без текста обязана иметь подпись для скринридера. */
    'aria-label': string
    /** sm 32px, md 40px, lg 48px */
    size?: ButtonSize
    pending?: boolean
  }

/** Квадратная кнопка с одной иконкой. Стили, варианты и состояния те же, что у Button. */
export function IconButton({
  tone,
  variant,
  size,
  icon,
  pending,
  className,
  disabled,
  type = 'button',
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={cx(buttonClassName({ tone, variant, size, pending, iconOnly: true }), className)}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...rest}
    >
      <span className={buttonStyles.content}>{icon}</span>
      {pending && <span className={buttonStyles.spinner} aria-hidden />}
    </button>
  )
}
