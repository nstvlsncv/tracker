import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { TOAST_DURATION_MS } from '../lib/constants'
import { ToastContext } from './useToast'
import type { ToastOptions } from './useToast'
import styles from './Toast.module.css'

type ToastState = ToastOptions & { id: number }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastState[]>([])
  const nextId = useRef(0)

  const show = useCallback((options: ToastOptions) => {
    const id = nextId.current++
    setToasts((current) => [...current, { ...options, id }])
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {createPortal(
        <div className={styles.region} role="status" aria-live="polite">
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: (id: number) => void }) {
  const { id, message, action, duration = TOAST_DURATION_MS } = toast

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), duration)
    return () => clearTimeout(timer)
  }, [id, duration, onDismiss])

  return (
    <div className={`t-body-md ${styles.toast}`}>
      <span>{message}</span>
      {action && (
        <button
          type="button"
          className={`t-button ${styles.action}`}
          onClick={() => {
            action.onClick()
            onDismiss(id)
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
