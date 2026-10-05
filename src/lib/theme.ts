import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

// Тот же ключ читает маленький скрипт в index.html: он ставит тему до первой отрисовки,
// чтобы страница не мигала светлой перед тем, как стать тёмной.
const STORAGE_KEY = 'tracker.theme'
const REVEAL_MS = 500
/** Планшет или телефон: там тема меняется сразу, без анимации. */
const TOUCH_QUERY = '(max-width: 1024px), (pointer: coarse)'
const listeners = new Set<() => void>()

export function getTheme(): Theme {
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

/**
 * Сменить тему.
 * - На компьютере браузер делает снимок страницы до и после смены (View Transitions),
 *   и новая тема расходится кругом из точки `origin` (центр нажатой кнопки).
 * - На планшете и телефоне тема меняется сразу, без анимации: панели самого браузера
 *   в снимок не входят и перекрашиваются отдельно от страницы, из-за чего любой переход
 *   выглядит рывком.
 * Где такой возможности нет или анимации отключены в системе, тема тоже меняется сразу.
 */
export function setTheme(theme: Theme, origin?: { x: number; y: number }) {
  if (theme === getTheme()) return

  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const touch = window.matchMedia(TOUCH_QUERY).matches
  if (still || touch || !origin || !document.startViewTransition) {
    applyTheme(theme)
    return
  }

  const root = document.documentElement
  const { x, y } = origin
  // Радиус, при котором круг дотянется до самого дальнего угла экрана.
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))

  // Пометка отключает стандартное растворение (см. global.css): вместо него рисуется круг.
  root.dataset.themeReveal = 'circle'
  const transition = document.startViewTransition(() => applyTheme(theme))
  transition.ready.then(
    () => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: REVEAL_MS, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' },
      )
    },
    // Браузер может пропустить переход (например, вкладка в фоне). Тема при этом всё равно сменилась.
    () => {},
  )
  transition.finished.finally(() => delete root.dataset.themeReveal)
}

/** Узнавать о смене темы. Возвращает функцию отписки. */
export function onThemeChange(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Текущая тема оформления. Выбор запоминается в браузере на этом устройстве. */
export function useTheme(): Theme {
  return useSyncExternalStore(onThemeChange, getTheme)
}

syncBrowserColor()
