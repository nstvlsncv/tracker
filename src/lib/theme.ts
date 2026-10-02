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

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Хранилище недоступно (приватный режим): тема просто не запомнится.
  }
  syncBrowserColor()
  for (const listener of listeners) listener()
}

const REVEAL_MS = 500

/**
 * Сменить тему. Если передана точка (центр нажатой кнопки), новая тема расходится от неё
 * кругом по всему экрану. Браузер для этого сам делает снимок страницы до и после смены
 * (View Transitions): снимок новой темы открывается растущим кругом поверх старой.
 * Где такой возможности нет или анимации отключены в системе, тема меняется сразу.
 */
export function setTheme(theme: Theme, origin?: { x: number; y: number }) {
  if (theme === getTheme()) return
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!origin || still || !document.startViewTransition) {
    applyTheme(theme)
    return
  }

  const { x, y } = origin
  // Радиус, при котором круг дотянется до самого дальнего угла экрана.
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
  const transition = document.startViewTransition(() => applyTheme(theme))
  transition.ready.then(
    () => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: REVEAL_MS, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' },
      )
    },
    // Браузер может пропустить переход (например, вкладка в фоне). Тема при этом всё равно сменилась.
    () => {},
  )
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
