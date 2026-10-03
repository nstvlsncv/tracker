import { Warning } from '@phosphor-icons/react'
import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Modal } from '../../components/Modal'
import { useToast } from '../../components/useToast'
import { failureMessage, useAccount } from './useAccount'
import styles from './profile.module.css'

/** Блок «Опасная зона»: удаление аккаунта с подтверждением паролем. */
export function DangerZone() {
  const [confirming, setConfirming] = useState(false)

  return (
    <>
      <section className={styles.danger}>
        <h2 className={`t-heading-5 ${styles.dangerTitle}`}>
          <Warning aria-hidden />
          Опасная зона
        </h2>
        <p className={styles.dangerText}>
          Удаление аккаунта необратимо. Все задачи, цели, привычки и история удалятся навсегда.
        </p>
        <div>
          <Button tone="danger" onClick={() => setConfirming(true)}>
            Удалить аккаунт
          </Button>
        </div>
      </section>
      {confirming && <DeleteAccountModal onClose={() => setConfirming(false)} />}
    </>
  )
}

function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const account = useAccount()
  const toast = useToast()
  const formId = useId()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!password) return setError('Введи пароль, чтобы удалить аккаунт')
    setBusy(true)
    try {
      const result = await account.deleteAccount(password)
      if (result === 'ok') {
        // Дальше приложение само уводит на экран входа: сессии больше нет.
        toast({ message: 'Аккаунт удалён' })
        onClose()
        return
      }
      setError('Неверный пароль')
    } catch (reason) {
      toast({ message: failureMessage(reason) })
    }
    setBusy(false)
  }

  return (
    <Modal
      open
      size="sm"
      title="Удалить аккаунт?"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button tone="danger" type="submit" form={formId} pending={busy}>
            Удалить
          </Button>
        </>
      }
    >
      <form id={formId} className={styles.form} onSubmit={submit} noValidate>
        <p>Это действие нельзя отменить.</p>
        <Input
          label="Введи пароль, чтобы подтвердить"
          type="password"
          autoComplete="current-password"
          value={password}
          error={error}
          onChange={(event) => {
            setPassword(event.target.value)
            setError(undefined)
          }}
        />
      </form>
    </Modal>
  )
}
