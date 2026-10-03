import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { isLocked, NO_ATTEMPTS, registerFailure } from '../../auth/validation'
import type { LoginAttempts } from '../../auth/validation'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { useToast } from '../../components/useToast'
import { markEntrance } from '../../lib/entrance'
import { isNetworkError, NETWORK_ERROR_MESSAGE, supabase } from '../../lib/supabase'
import { AUTHOR_URL, AuthLayout } from './AuthLayout'
import styles from './Login.module.css'

const ATTEMPTS_KEY = 'tracker.loginAttempts'
const WRONG_MESSAGE = 'Неверный логин или пароль'

/** Сколько осталось до конца блокировки: «4:32». */
function formatLeft(ms: number): string {
  const seconds = Math.ceil(ms / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

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
  const [caps, setCaps] = useState(false)
  // Каждая неудача качает карточку, удачный вход растворяет экран.
  const [shake, setShake] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const passwordRef = useRef<HTMLInputElement>(null)

  // Блокировка после серии неудач: отсчёт идёт на глазах и сам исчезает, когда время вышло.
  const [lockedUntil, setLockedUntil] = useState(() => readAttempts().lockedUntil)
  const [now, setNow] = useState(() => Date.now())
  const locked = lockedUntil > now
  useEffect(() => {
    if (!lockedUntil) return
    const timer = setInterval(() => {
      setNow(Date.now())
      if (Date.now() >= lockedUntil) setLockedUntil(0)
    }, 1000)
    return () => clearInterval(timer)
  }, [lockedUntil])

  // Общая ошибка на оба поля: подсвечены оба, текст один, под паролем.
  const failBoth = (message: string) => setErrors({ loginInvalid: true, password: message })

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const noLogin = !email.trim()
    const noPassword = !password
    if (noLogin && noPassword) return failBoth('Введи логин и пароль, чтобы войти')
    if (noLogin) return setErrors({ login: 'Введи логин, чтобы войти' })
    if (noPassword) return setErrors({ password: 'Введи пароль, чтобы войти' })
    const attemptsBefore = readAttempts()
    if (isLocked(attemptsBefore, Date.now())) {
      // Блокировку могли поставить в другой вкладке: отсчёт показываем и здесь.
      setLockedUntil(attemptsBefore.lockedUntil)
      setShake((count) => count + 1)
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
      markEntrance()
      setLeaving(true)
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
    setShake((count) => count + 1)
    if (isLocked(attempts, Date.now())) {
      setErrors({})
      setNow(Date.now())
      setLockedUntil(attempts.lockedUntil)
    } else {
      failBoth(WRONG_MESSAGE)
    }
  }

  // Caps Lock виден только в момент нажатия клавиши: проверяем на каждом.
  const watchCaps = (event: KeyboardEvent<HTMLInputElement>) =>
    setCaps(event.getModifierState('CapsLock'))

  const passwordError = locked
    ? `Слишком много попыток. Попробуй через ${formatLeft(lockedUntil - now)}`
    : errors.password && caps
      ? `${errors.password}. Включён Caps Lock`
      : errors.password

  return (
    <AuthLayout
      title="С возвращением!"
      subtitle="Войди, чтобы продолжить"
      shake={shake}
      leaving={leaving}
    >
      <form onSubmit={submit} noValidate>
        <div className={styles.fields}>
          <Input
            label="Логин"
            hideLabel
            type="email"
            autoComplete="email"
            autoFocus
            enterKeyHint="next"
            value={email}
            error={errors.login}
            invalid={errors.loginInvalid || locked}
            onKeyDown={(event) => {
              // «Далее» на клавиатуре телефона (и Enter) ведёт в пароль, пока он пустой.
              if (event.key !== 'Enter' || password) return
              event.preventDefault()
              passwordRef.current?.focus()
            }}
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
            enterKeyHint="go"
            ref={passwordRef}
            value={password}
            error={passwordError}
            hint={caps ? 'Включён Caps Lock' : undefined}
            onKeyDown={watchCaps}
            onKeyUp={watchCaps}
            onBlur={() => setCaps(false)}
            onChange={(event) => {
              setPassword(event.target.value)
              setErrors({})
            }}
          />
        </div>
        <Button type="submit" size="lg" fullWidth pending={busy}>
          Войти
        </Button>
        <p className={styles.alt}>
          Нет аккаунта?{' '}
          <a className={styles.link} href={AUTHOR_URL} target="_blank" rel="noreferrer">
            Напиши мне
          </a>
        </p>
      </form>
    </AuthLayout>
  )
}
