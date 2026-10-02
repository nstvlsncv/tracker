import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../../auth/useAuth'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Modal } from '../../components/Modal'
import { Section } from '../../components/Section'
import { useToast } from '../../components/useToast'
import { NAME_MAX_LENGTH } from '../../lib/constants'
import { failureMessage, useAccount } from './useAccount'
import styles from './profile.module.css'

/** Блок «Аккаунт»: имя, фамилия и логин. Имя и фамилия меняются в модалке, логин в ней только показан. */
export function AccountSection() {
  const { profile } = useAuth()
  const account = useAccount()
  const [editing, setEditing] = useState(false)

  return (
    <>
      <Section title="Аккаунт">
        <dl className={styles.fields}>
          <Field label="Имя" value={profile?.name} />
          <Field label="Фамилия" value={profile?.lastName} />
          <Field label="Логин" value={account.email} />
        </dl>
        <div>
          <Button variant="secondary" onClick={() => setEditing(true)}>
            Изменить
          </Button>
        </div>
      </Section>
      {editing && <EditAccountModal onClose={() => setEditing(false)} />}
    </>
  )
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className={styles.field}>
      <dt className={`t-caption ${styles.fieldLabel}`}>{label}</dt>
      <dd className={value ? styles.fieldValue : styles.fieldEmpty}>{value || 'Не указана'}</dd>
    </div>
  )
}

function EditAccountModal({ onClose }: { onClose: () => void }) {
  const { profile, refreshProfile } = useAuth()
  const account = useAccount()
  const toast = useToast()
  const formId = useId()
  const [name, setName] = useState(profile?.name ?? '')
  const [lastName, setLastName] = useState(profile?.lastName ?? '')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return setError('Напиши, как тебя зовут')
    setBusy(true)
    try {
      await account.saveName(name.trim(), lastName.trim())
      await refreshProfile()
      toast({ message: 'Сохранено' })
      onClose()
    } catch (reason) {
      setBusy(false)
      toast({ message: failureMessage(reason) })
    }
  }

  return (
    <Modal
      open
      title="Изменить аккаунт"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" form={formId} pending={busy}>
            Сохранить
          </Button>
        </>
      }
    >
      <form id={formId} className={styles.form} onSubmit={submit} noValidate>
        <Input
          label="Имя"
          autoComplete="given-name"
          maxLength={NAME_MAX_LENGTH}
          value={name}
          error={error}
          onChange={(event) => {
            setName(event.target.value)
            setError(undefined)
          }}
        />
        <Input
          label="Фамилия"
          autoComplete="family-name"
          maxLength={NAME_MAX_LENGTH}
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
        />
        <Input
          label="Логин"
          value={account.email}
          disabled
          readOnly
          hint="Логин поменять нельзя. Зато не придётся запоминать новый"
        />
      </form>
    </Modal>
  )
}
