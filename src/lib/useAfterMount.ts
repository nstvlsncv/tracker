import { useEffect, useState } from 'react'

/**
 * false при первой отрисовке, true чуть позже. Нужен для анимаций появления: компонент
 * сначала рисуется в начальном состоянии (ноль, пустое кольцо), а потом переходит к настоящему
 * значению, и CSS-переход проигрывает это изменение.
 */
export function useAfterMount(delayMs = 30): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    // Таймер, а не requestAnimationFrame: тот не срабатывает во вкладке в фоне.
    const timer = setTimeout(() => setReady(true), delayMs)
    return () => clearTimeout(timer)
  }, [delayMs])
  return ready
}
