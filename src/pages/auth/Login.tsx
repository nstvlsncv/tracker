import { useState } from 'react'
import type { FormEvent } from 'react'
import { isLocked, NO_ATTEMPTS, registerFailure } from '../../auth/validation'
import type { LoginAttempts } from '../../auth/validation'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { useToast } from '../../components/useToast'
import { isNetworkError, NETWORK_ERROR_MESSAGE, supabase } from '../../lib/supabase'
import { AuthLayout } from './AuthLayout'

const ATTEMPTS_KEY = 'tracker.loginAttempts'
const WRONG_MESSAGE = 'Неверный логин или пароль'
const LOCKED_MESSAGE = 'Слишком много попыток. Попробуй через 5 минут'

function readAttempts(): LoginAttempts {
  try {
    return { ...NO_ATTEMPTS, ...JSON.parse(localStorage.getItem(ATTEMPTS_KEY) ?? '{}') }
  } catch {
    return NO_ATTEMPTS
  }
}

function writeAttempts(attempts: LoginAttempts) {
  try {
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts))
  } catch {
    // Хранилище недоступно (приватный режим): блокировка просто не переживёт перезагрузку.
  }
}

export function Login() {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (isLocked(readAttempts(), Date.now())) {
      setError(LOCKED_MESSAGE)
      return
    }
    setBusy(true)
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (!authError) {
      // Кнопка остаётся в ожидании, пока грузится профиль: дальше GuestRoute уведёт на Главную.
      writeAttempts(NO_ATTEMPTS)
      return
    }
    setBusy(false)
    if (isNetworkError(authError)) {
      toast({ message: NETWORK_ERROR_MESSAGE })
      return
    }
    // Одно общее сообщение: нельзя раскрывать, существует ли такой логин.
    const attempts = registerFailure(readAttempts(), Date.now())
    writeAttempts(attempts)
    setError(isLocked(attempts, Date.now()) ? LOCKED_MESSAGE : WRONG_MESSAGE)
  }

  return (
    <AuthLayout title="С возвращением!" subtitle="Войди, чтобы продолжить">
      <form onSubmit={submit} noValidate>
        <Input
          label="Логин"
          hideLabel
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          invalid={Boolean(error)}
          onChange={(event) => {
            setEmail(event.target.value)
            setError(null)
          }}
        />
        <Input
          label="Пароль"
          hideLabel
          type="password"
          autoComplete="current-password"
          value={password}
          error={error ?? undefined}
          onChange={(event) => {
            setPassword(event.target.value)
            setError(null)
          }}
        />
        <Button
          type="submit"
          size="lg"
          fullWidth
          disabled={!email.trim() || !password}
          pending={busy}
        >
          Войти
        </Button>
      </form>
    </AuthLayout>
  )
}
