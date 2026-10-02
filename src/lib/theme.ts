import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

// Тот же ключ читает маленький скрипт в index.html: он ставит тему до первой отрисовки,
// чтобы страница не мигала светлой перед тем, как стать тёмной.
const STORAGE_KEY = 'tracker.theme'
const listeners = new Set<() => void>()

function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

/** Цвет панелей браузера на телефоне: под цвет страницы в текущей теме. */
function syncBrowserColor() {
  const color = getComputedStyle(document.documentElement).getPropertyValue('--bg-surface').trim()
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Хранилище недоступно (приватный режим): тема просто не запомнится.
  }
  syncBrowserColor()
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Текущая тема оформления. Выбор запоминается в браузере на этом устройстве. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme)
}

syncBrowserColor()
