import { parseISO } from 'date-fns'
import { useEffect, useState } from 'react'
import type { PointerEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { formatWeekdayAndDay } from '../lib/dates'
import { cx } from '../lib/cx'
import { monthWeeks } from '../lib/habitHistory'
import styles from './YearCalendar.module.css'

type Props = {
  /** Месяцы 'yyyy-MM' по порядку: двенадцать месяцев года или один месяц (на телефоне). */
  months: string[]
  today: string
  /** Клетка прошедшего или сегодняшнего дня. Будущие дни календарь рисует сам: бледная точка. */
  renderDay: (date: string) => ReactNode
}

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

/** Подсказка не подходит к краю окна ближе этого. */
const TIP_EDGE_PX = 8

/**
 * Год сеткой из двенадцати маленьких календарей: у каждого месяца название и дни кружками,
 * недели с понедельника. Сколько месяцев в ряд (6 на компьютере, 4, 3, 2), решает ширина
 * самого блока; клетки растягиваются по ширине месяца. Один месяц (так история устроена
 * на телефоне) стоит во всю ширину и без названия: месяц назван в списке над ним.
 * Над днём под курсором тёмная подсказка с днём недели и числом («Вторник, 27 октября»).
 * Общий для истории привычки, настроения и фото дня: что лежит в клетке, решает экран.
 */
export function YearCalendar({ months, today, renderDay }: Props) {
  const single = months.length === 1
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null)

  // Подсказка рисуется поверх страницы и не следует за прокруткой: при прокрутке прячется.
  useEffect(() => {
    if (!tip) return
    const hide = () => setTip(null)
    window.addEventListener('scroll', hide, true)
    return () => window.removeEventListener('scroll', hide, true)
  }, [tip])

  // Только для мыши: на сенсорном экране наведения нет, а нажатие занято отметкой.
  const onOver = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return
    const cell = (event.target as Element).closest<HTMLElement>('[data-date]')
    if (!cell) return setTip(null)
    const rect = cell.getBoundingClientRect()
    const text = formatWeekdayAndDay(parseISO(cell.dataset.date!))
    setTip((current) => (current?.text === text ? current : { text, x: rect.left + rect.width / 2, y: rect.top }))
  }

  return (
    <div className={styles.wrap}>
      <div className={cx(styles.year, single && styles.single)} onPointerOver={onOver} onPointerLeave={() => setTip(null)}>
        {months.map((month) => (
          <div key={month} className={styles.month}>
            {!single && <span className={`t-caption ${styles.name}`}>{MONTH_NAMES[Number(month.slice(5, 7)) - 1]}</span>}
            <div className={styles.days}>
              {monthWeeks(month).flatMap((week, row) =>
                week.map((date, column) => {
                  if (!date) return <span key={`${row}-${column}`} />
                  return (
                    <div key={date} className={styles.cell} data-date={date}>
                      {date > today ? <span className={styles.future} /> : renderDay(date)}
                    </div>
                  )
                }),
              )}
            </div>
          </div>
        ))}
      </div>
      {tip &&
        createPortal(
          <span
            className={`t-caption ${styles.tip}`}
            role="tooltip"
            ref={(node) => {
              // Не даём подсказке у края блока выйти за окно.
              if (!node) return
              const half = node.offsetWidth / 2
              const x = Math.min(Math.max(tip.x, half + TIP_EDGE_PX), window.innerWidth - half - TIP_EDGE_PX)
              node.style.left = `${x}px`
            }}
            style={{ left: tip.x, top: tip.y }}
          >
            {tip.text}
          </span>,
          document.body,
        )}
    </div>
  )
}
