import { cheer } from '../lib/cheer'
import styles from './Burst.module.css'

/** Сколько точек в салюте. */
export const BURST_DOTS = 10
/** Чуть дольше анимации в Burst.module.css: после этого салют убирается со страницы. */
const LIFETIME_MS = 700

/**
 * Салют поверх всей страницы, из центра элемента `target`: точки разлетаются и гаснут.
 * Рисуется отдельным слоем, поэтому его не обрезают ни строка списка, ни прокручиваемый блок,
 * и он остаётся там, где нажали, даже если сам элемент тут же переехал.
 * `from` и `to`: на каком расстоянии от центра точки появляются и до какого долетают, px.
 * Вместе с салютом маскот получает повод подпрыгнуть; `quiet` отключает это (салют самого маскота).
 */
export function fireBurst(target: Element, from: number, to: number, { quiet = false } = {}) {
  if (!quiet) cheer()
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const rect = target.getBoundingClientRect()
  const host = document.createElement('span')
  host.className = `${styles.burst} ${styles.floating}`
  host.setAttribute('aria-hidden', 'true')
  host.style.left = `${rect.left}px`
  host.style.top = `${rect.top}px`
  host.style.width = `${rect.width}px`
  host.style.height = `${rect.height}px`
  for (let index = 0; index < BURST_DOTS; index++) {
    const dot = document.createElement('span')
    dot.style.setProperty('--angle', `${(360 / BURST_DOTS) * index}deg`)
    dot.style.setProperty('--from', `${from}px`)
    dot.style.setProperty('--to', `${to}px`)
    host.appendChild(dot)
  }
  document.body.appendChild(host)
  setTimeout(() => host.remove(), LIFETIME_MS)
}
