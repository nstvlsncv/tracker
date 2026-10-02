import { useCallback, useState } from 'react'

// Память экранов на время сеанса: что было раскрыто, выбрано и куда прокручено.
// Живёт, пока открыта вкладка, и сбрасывается при выходе из аккаунта и перезагрузке страницы.
const store = new Map<string, unknown>()

/** Прочитать сохранённое значение (для того, что не нужно держать в состоянии: позиции прокрутки). */
export function recall<T>(key: string): T | undefined {
  return store.get(key) as T | undefined
}

export function remember(key: string, value: unknown) {
  store.set(key, value)
}

/** Забыть всё: вызывается при выходе, чтобы следующий пользователь начал с чистого листа. */
export function forgetSessionState() {
  store.clear()
}

/**
 * Как useState, но значение переживает уход с экрана: вернувшись, человек видит экран таким,
 * каким его оставил. `key` должен быть уникальным на всё приложение.
 */
export function useSessionState<T>(key: string, initial: T): [T, (next: T | ((current: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => (store.has(key) ? (store.get(key) as T) : initial))

  const update = useCallback(
    (next: T | ((current: T) => T)) => {
      setValue((current) => {
        const resolved = typeof next === 'function' ? (next as (current: T) => T)(current) : next
        store.set(key, resolved)
        return resolved
      })
    },
    [key],
  )

  return [value, update]
}
