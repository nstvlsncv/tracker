import { useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from './Button'
import { Modal } from './Modal'

type Props = {
  title: string
  /** Чем это обернётся, одной-двумя фразами. */
  children: ReactNode
  /** Подпись кнопки подтверждения: «Выйти», «Завершить». */
  confirmLabel: string
  /** Если действие занимает время, кнопка покажет ожидание, а модалка закроется после него. */
  onConfirm: () => void | Promise<void>
  onClose: () => void
}

/** Подтверждение действия, которое нельзя отменить: выход, завершение сессии. */
export function ConfirmModal({ title, children, confirmLabel, onConfirm, onClose }: Props) {
  const [busy, setBusy] = useState(false)

  const confirm = async () => {
    setBusy(true)
    await onConfirm()
    onClose()
  }

  return (
    <Modal
      open
      size="sm"
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button tone="danger" pending={busy} onClick={confirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p>{children}</p>
    </Modal>
  )
}
