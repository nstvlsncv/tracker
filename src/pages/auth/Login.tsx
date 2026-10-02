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

type FieldErrors = { login?: string; password?: string; loginInvalid?: boolean }

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
  const [errors, setErrors] = useState<FieldErrors>({})
  const [busy, setBusy] = useState(false)

  // Общая ошибка на оба поля: подсвечены оба, текст один, под паролем.
  const failBoth = (message: string) => setErrors({ loginInvalid: true, password: message })

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const noLogin = !email.trim()
    const noPassword = !password
    if (noLogin && noPassword) return failBoth('Введи логин и пароль, чтобы войти')
    if (noLogin) return setErrors({ login: 'Введи логин, чтобы войти' })
    if (noPassword) return setErrors({ password: 'Введи пароль, чтобы войти' })
    if (isLocked(readAttempts(), Date.now())) return failBoth(LOCKED_MESSAGE)

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
    failBoth(isLocked(attempts, Date.now()) ? LOCKED_MESSAGE : WRONG_MESSAGE)
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
          error={errors.login}
          invalid={errors.loginInvalid}
          onChange={(event) => {
            setEmail(event.target.value)
            setErrors({})
          }}
        />
        <Input
          label="Пароль"
          hideLabel
          type="password"
          autoComplete="current-password"
          value={password}
          error={errors.password}
          onChange={(event) => {
            setPassword(event.target.value)
            setErrors({})
          }}
        />
        <Button type="submit" size="lg" fullWidth pending={busy}>
          Войти
        </Button>
      </form>
    </AuthLayout>
  )
}
