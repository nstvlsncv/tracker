import { useSyncExternalStore } from 'react'

/** Яркий акцент: цвет всего сделанного и текущего, а заодно и маскота. */
export type Accent = 'lime' | 'pink' | 'sky' | 'yellow' | 'violet'

/** В том порядке, в каком цвета стоят в Профиле. Сами цвета лежат в токенах и в global.css. */
export const ACCENTS: Array<{ value: Accent; label: string }> = [
  { value: 'lime', label: 'Лаймовый' },
  { value: 'pink', label: 'Розовый' },
  { value: 'sky', label: 'Голубой' },
  { value: 'yellow', label: 'Жёлтый' },
  { value: 'violet', label: 'Сиреневый' },
]

// Тот же ключ читает маленький скрипт в index.html: он ставит цвет до первой отрисовки.
const STORAGE_KEY = 'tracker.accent'
const listeners = new Set<() => void>()

export function getAccent(): Accent {
  const value = document.documentElement.dataset.accent
  return ACCENTS.some((accent) => accent.value === value) ? (value as Accent) : 'lime'
}

/** Выбрать акцентный цвет. Запоминается в браузере на этом устройстве, как и тема. */
export function setAccent(accent: Accent) {
  document.documentElement.dataset.accent = accent
  try {
    localStorage.setItem(STORAGE_KEY, accent)
  } catch {
    // Хранилище недоступно (приватный режим): цвет просто не запомнится.
  }
  for (const listener of listeners) listener()
}

/** Узнавать о смене акцентного цвета. Возвращает функцию отписки. */
export function onAccentChange(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useAccent(): Accent {
  return useSyncExternalStore(onAccentChange, getAccent)
}
