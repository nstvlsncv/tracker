import { useCallback } from 'react'
import type { ReactNode } from 'react'
import { Toaster, toast as sonner, useSonner } from 'sonner'
import { TOAST_DURATION_MS } from '../lib/constants'
import { ToastContext } from './useToast'
import type { ToastOptions } from './useToast'
import styles from './Toast.module.css'

/** Сколько тостов показывается списком. Когда их больше, они складываются в стопку. */
const STACK_AFTER = 3

/**
 * Тосты сверху по центру, на 48px ниже верхнего края. Показывает их библиотека Sonner:
 * она складывает тосты в стопку и даёт смахнуть любой из них в любую сторону.
 * Остальное приложение про Sonner не знает и вызывает тосты через useToast.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { toasts } = useSonner()

  const show = useCallback(({ message, action, duration = TOAST_DURATION_MS }: ToastOptions) => {
    // После нажатия на кнопку действия Sonner закрывает тост сам.
    sonner(message, { duration, action })
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <Toaster
        position="top-center"
        offset={48}
        mobileOffset={24}
        gap={8}
        visibleToasts={STACK_AFTER}
        expand={toasts.length <= STACK_AFTER}
        swipeDirections={['top', 'right', 'bottom', 'left']}
        containerAriaLabel="Уведомления"
        toastOptions={{
          unstyled: true,
          classNames: {
            toast: `t-body-md ${styles.toast}`,
            content: styles.content,
            actionButton: `t-button ${styles.action}`,
          },
        }}
      />
    </ToastContext.Provider>
  )
}
