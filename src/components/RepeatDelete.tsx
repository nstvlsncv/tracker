import { useState } from 'react'
import type { ReactNode } from 'react'
import { usePlanner } from '../data/usePlanner'
import { Button } from './Button'
import { Modal } from './Modal'

type Request = { id: string; proceed: () => void }

/**
 * Удаление повторяющейся задачи сначала спрашивает: только эту или эту и все следующие.
 * Обычные задачи удаляются сразу, как раньше. `confirmDelete` передаётся в ItemList,
 * `modal` нужно отрисовать рядом со списком.
 */
export function useRepeatDelete(): {
  confirmDelete: (id: string, proceed: () => void) => void
  modal: ReactNode
} {
  const { tasks, endRepeat } = usePlanner()
  const [request, setRequest] = useState<Request | null>(null)

  const confirmDelete = (id: string, proceed: () => void) => {
    if (tasks.find((task) => task.id === id)?.ruleId) setRequest({ id, proceed })
    else proceed()
  }

  const close = () => setRequest(null)

  const modal = request && (
    <Modal
      open
      size="sm"
      title="Удалить повторяющуюся задачу?"
      onClose={close}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => {
              close()
              request.proceed()
            }}
          >
            Только эту
          </Button>
          <Button
            tone="danger"
            onClick={() => {
              close()
              endRepeat(request.id)
            }}
          >
            Эту и следующие
          </Button>
        </>
      }
    >
      <p>Можно убрать её только с этого дня или перестать повторять совсем.</p>
    </Modal>
  )

  return { confirmDelete, modal }
}
