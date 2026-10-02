import { Check } from '@phosphor-icons/react'
import { parseISO } from 'date-fns'
import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../../auth/useAuth'
import { checkPassword, isPasswordValid } from '../../auth/validation'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Modal } from '../../components/Modal'
import { Section } from '../../components/Section'
import { useToast } from '../../components/useToast'
import { cx } from '../../lib/cx'
import { formatAgo } from '../../lib/dates'
import { failureMessage, useAccount } from './useAccount'
import styles from './profile.module.css'

/** Блок «Пароль»: когда меняли в последний раз и кнопка смены. */
export function PasswordSection() {
  const { profile } = useAuth()
  const [changing, setChanging] = useState(false)
  // Время открытия экрана: от него считается «3 месяца назад».
  const [now] = useState(() => new Date())
  const changedAt = profile?.passwordChangedAt

  return (
    <>
      <Section title="Пароль">
        {changedAt && (
          <p className={styles.note}>Последнее изменение: {formatAgo(parseISO(changedAt), now)}</p>
        )}
        <div>
          <Button variant="secondary" onClick={() => setChanging(true)}>
            Сменить пароль
          </Button>
        </div>
      </Section>
      {changing && <ChangePasswordModal onClose={() => setChanging(false)} />}
    </>
  )
}

type Errors = { current?: string; next?: string; repeat?: string }

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { refreshProfile } = useAuth()
  const account = useAccount()
  const toast = useToast()
  const formId = useId()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const found: Errors = {}
    if (!current) found.current = 'Введи текущий пароль'
    if (!isPasswordValid(next)) found.next = 'Пароль пока не подходит под требования ниже'
    else if (next !== repeat) found.repeat = 'Пароли не совпадают'
    if (Object.keys(found).length) return setErrors(found)

    setBusy(true)
    try {
      const result = await account.changePassword(current, next)
      if (result === 'ok') {
        await refreshProfile()
        toast({ message: 'Пароль изменён' })
        onClose()
        return
      }
      setErrors(
        result === 'wrong-password'
          ? { current: 'Неверный пароль' }
          : { next: 'Новый пароль совпадает с текущим' },
      )
    } catch (reason) {
      toast({ message: failureMessage(reason) })
    }
    setBusy(false)
  }

  return (
    <Modal
      open
      title="Сменить пароль"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" form={formId} pending={busy}>
            Сменить пароль
          </Button>
        </>
      }
    >
      <form id={formId} className={styles.form} onSubmit={submit} noValidate>
        <Input
          label="Текущий пароль"
          type="password"
          autoComplete="current-password"
          value={current}
          error={errors.current}
          onChange={(event) => {
            setCurrent(event.target.value)
            setErrors({})
          }}
        />
        <Input
          label="Новый пароль"
          type="password"
          autoComplete="new-password"
          value={next}
          error={errors.next}
          onChange={(event) => {
            setNext(event.target.value)
            setErrors({})
          }}
        />
        <ul className={styles.checks}>
          {checkPassword(next).map((check) => (
            <li key={check.label} className={cx(styles.check, check.passed && styles.passed)}>
              <span className={styles.checkMark}>{check.passed && <Check aria-hidden />}</span>
              {check.label}
              <span className="visually-hidden">{check.passed ? ': выполнено' : ': не выполнено'}</span>
            </li>
          ))}
        </ul>
        <Input
          label="Повтори пароль"
          type="password"
          autoComplete="new-password"
          value={repeat}
          error={errors.repeat}
          onChange={(event) => {
            setRepeat(event.target.value)
            setErrors({})
          }}
          onBlur={() => {
            if (repeat && next !== repeat) setErrors((found) => ({ ...found, repeat: 'Пароли не совпадают' }))
          }}
        />
      </form>
    </Modal>
  )
}
