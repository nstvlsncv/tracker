import { createContext, useContext } from 'react'

export type ToastOptions = {
  message: string
  /** Кнопка в тосте, например «Отменить» после удаления. Тост закрывается по клику. */
  action?: { label: string; onClick: () => void }
  /** По умолчанию TOAST_DURATION_MS. */
  duration?: number
}

export const ToastContext = createContext<((options: ToastOptions) => void) | null>(null)

export function useToast() {
  const show = useContext(ToastContext)
  if (!show) throw new Error('useToast: нет ToastProvider выше по дереву')
  return show
}
