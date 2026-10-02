import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '../lib/cx'
import { buttonClassName, buttonStyles } from './buttonStyles'
import type { ButtonSize, ButtonStyle } from './buttonStyles'

type Props = ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonStyle & {
    /** sm 32px, md 40px, lg 48px. lg: основные кнопки и самые главные действия. */
    size?: ButtonSize
    icon?: ReactNode
    /** Действие выполняется: вместо содержимого спиннер, нажать нельзя. */
    pending?: boolean
    fullWidth?: boolean
  }

export function Button({
  tone,
  variant,
  size,
  icon,
  pending,
  fullWidth,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={cx(buttonClassName({ tone, variant, size, pending, fullWidth }), className)}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...rest}
    >
      <span className={buttonStyles.content}>
        {icon}
        {children}
      </span>
      {pending && <span className={buttonStyles.spinner} aria-hidden />}
    </button>
  )
}
