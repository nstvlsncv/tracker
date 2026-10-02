import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { cx } from '../lib/cx'
import styles from './Collapse.module.css'

/** Чуть дольше самой анимации: к этому времени блок точно успел свернуться. */
const SETTLE_MS = 320

/**
 * Блок, который плавно раскрывается и сворачивается по высоте. Свёрнутое содержимое
 * в страницу не рисуется вовсе: оно появляется перед раскрытием и убирается после сворачивания.
 * Если блок открыт с самого начала, анимации нет.
 */
export function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  // present: содержимое есть в странице. expanded: блок развёрнут (запускает переход высоты).
  // settled: переход закончился, содержимое можно не обрезать (выпадающим спискам нужно место).
  const [present, setPresent] = useState(open)
  const [expanded, setExpanded] = useState(open)
  const [settled, setSettled] = useState(open)
  if (open && !present) setPresent(true)
  // Сворачивание начинается в тот же момент, когда блок попросили закрыть.
  if (!open && expanded) {
    setExpanded(false)
    setSettled(false)
  }

  useEffect(() => {
    if (open) {
      // Сначала блок рисуется свёрнутым, потом раскрывается: иначе переходу не от чего стартовать.
      const expand = setTimeout(() => setExpanded(true), 20)
      const settle = setTimeout(() => setSettled(true), SETTLE_MS)
      return () => {
        clearTimeout(expand)
        clearTimeout(settle)
      }
    }
    const remove = setTimeout(() => setPresent(false), SETTLE_MS)
    return () => clearTimeout(remove)
  }, [open])

  if (!present) return null

  return (
    <div className={cx(styles.collapse, expanded && styles.expanded)}>
      <div className={cx(styles.inner, settled && styles.settled)}>{children}</div>
    </div>
  )
}
