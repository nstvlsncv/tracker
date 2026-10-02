import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

// Тот же ключ читает маленький скрипт в index.html: он ставит тему до первой отрисовки,
// чтобы страница не мигала светлой перед тем, как стать тёмной.
const STORAGE_KEY = 'tracker.theme'
const REVEAL_MS = 500
const listeners = new Set<() => void>()
let colorTimer = 0

function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

const pageColor = () =>
  getComputedStyle(document.documentElement).getPropertyValue('--bg-surface').trim()

/**
 * Цвет панелей самого браузера на телефоне (строка состояния, адресная строка).
 * Браузер берёт его из мета-тега theme-color и из фона body и корня страницы, поэтому
 * обновляются все три. Без аргумента панели следуют цвету страницы в текущей теме.
 */
function setBrowserColor(color?: string) {
  const root = document.documentElement
  // --chrome-bg перекрывает фон html и body (см. global.css). Цвет самой страницы рисует #root,
  // так что на вид страницы это не влияет, только на то, что видит браузер.
  if (color) root.style.setProperty('--chrome-bg', color)
  else root.style.removeProperty('--chrome-bg')
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', color ?? pageColor())
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Хранилище недоступно (приватный режим): тема просто не запомнится.
  }
  for (const listener of listeners) listener()
}

/** Через какую долю времени анимация проходит долю пути `progress` (обратная к easeInOutCubic). */
function timeAtProgress(progress: number): number {
  return progress < 0.5 ? Math.cbrt(progress / 4) : 1 - Math.cbrt(2 * (1 - progress)) / 2
}

/**
 * Сменить тему. Если передана точка (центр нажатой кнопки), новая тема расходится от неё
 * кругом по всему экрану. Браузер для этого сам делает снимок страницы до и после смены
 * (View Transitions): снимок новой темы открывается растущим кругом поверх старой.
 * Где такой возможности нет или анимации отключены в системе, тема меняется сразу.
 */
export function setTheme(theme: Theme, origin?: { x: number; y: number }) {
  if (theme === getTheme()) return
  clearTimeout(colorTimer)

  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!origin || still || !document.startViewTransition) {
    applyTheme(theme)
    setBrowserColor()
    return
  }

  const { x, y } = origin
  // Радиус, при котором круг дотянется до самого дальнего угла экрана.
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))

  // Панели браузера не входят в снимок страницы и перекрасились бы мгновенно, раньше круга.
  // Поэтому их цвет пока остаётся прежним. У верхней и нижней панели цвет общий, развести их
  // нельзя, так что он меняется посередине: между моментом, когда круг доходит до верхнего
  // края экрана, и моментом, когда он доходит до нижнего.
  setBrowserColor(pageColor())
  const transition = document.startViewTransition(() => applyTheme(theme))
  transition.ready.then(
    () => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        {
          duration: REVEAL_MS,
          // Близко к easeInOutCubic: по этой же кривой считается момент касания верхнего края.
          easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
          pseudoElement: '::view-transition-new(root)',
        },
      )
      const top = timeAtProgress(y / radius)
      const bottom = timeAtProgress(Math.min(1, (innerHeight - y) / radius))
      colorTimer = window.setTimeout(setBrowserColor, (REVEAL_MS * (top + bottom)) / 2)
    },
    // Браузер может пропустить переход (например, вкладка в фоне): круга не будет.
    () => {},
  )
  // Страховка: когда переход закончился (или был пропущен), цвет панелей точно соответствует теме.
  transition.finished.finally(() => {
    clearTimeout(colorTimer)
    setBrowserColor()
  })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Текущая тема оформления. Выбор запоминается в браузере на этом устройстве. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme)
}

setBrowserColor()
