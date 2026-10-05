// Перетаскивание задач мышью. Сделано на событиях указателя, а не на встроенном в браузер
// перетаскивании: у встроенного картинка за курсором всегда полупрозрачная, а курсор нельзя
// сделать «лапкой». Здесь за курсором едет обычный элемент страницы, и выглядит он как нужно.
//
// Списки задач и карточки дней сообщают о себе сюда. Пока строку тянут, модуль сам находит,
// над чем сейчас курсор, рисует подсказку (линию между строк или рамку у карточки) и в конце
// вызывает нужный список или карточку.

type List = {
  /** Невыполненные строки списка сверху вниз. */
  ids: () => string[]
  /** Новый порядок невыполненных строк; среди них может быть строка из другого списка. */
  arrange: (ids: string[]) => void
}

type Classes = {
  /** Копия строки, которая едет за курсором. */
  ghost: string
  /** Строка, которую тянут: остаётся на месте бледной. */
  source: string
  /** Линия над строкой и под ней: сюда встанет перетаскиваемая. */
  before: string
  after: string
}

type Zone = { drop: (id: string) => void; className: string }

const lists = new Map<Element, List>()
const zones = new Map<Element, Zone>()

/** Сдвиг, после которого нажатие считается перетаскиванием, а не кликом по строке. */
const START_PX = 5
/** Пометка на <html> на время перетаскивания: курсор-«лапка» и запрет выделения (global.css). */
const DRAGGING = 'dragging-task'

/** Список, в котором строки можно расставлять. Возвращает функцию отписки. */
export function registerList(element: Element, list: List): () => void {
  lists.set(element, list)
  return () => void lists.delete(element)
}

/**
 * Область, куда задачу можно бросить мимо строк (карточка дня): задача встаёт в конец её
 * списка. Пока над областью тянут задачу, на ней стоит класс `className`.
 */
export function registerZone(element: Element, drop: (id: string) => void, className: string) {
  zones.set(element, { drop, className })
  return () => void zones.delete(element)
}

/** Перетаскивать можно только мышью: на сенсорных экранах жесты заняты свайпами. */
export const canDragTasks = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches

type Target =
  | { kind: 'row'; row: Element; list: Element; after: boolean }
  | { kind: 'zone'; zone: Element }
  | null

/**
 * Начать следить за нажатием на строке `row`. Если мышь уедет дальше порога, начнётся
 * перетаскивание; если нет, это обычный клик, и здесь ничего не происходит.
 */
export function watchDrag(down: PointerEvent, row: HTMLElement, id: string, classes: Classes) {
  const rect = row.getBoundingClientRect()
  const grab = { x: down.clientX - rect.left, y: down.clientY - rect.top }
  let ghost: HTMLElement | null = null
  let target: Target = null

  const clearMarks = () => {
    if (target?.kind === 'row') target.row.classList.remove(classes.before, classes.after)
    if (target?.kind === 'zone') {
      const zone = zones.get(target.zone)
      if (zone) target.zone.classList.remove(zone.className)
    }
  }

  const findTarget = (x: number, y: number): Target => {
    const under = document.elementFromPoint(x, y)
    const over = under?.closest('li[data-id]')
    const list = over?.parentElement
    if (over && list && lists.has(list)) {
      // Строка сама на себя не встаёт: подсказки над ней нет.
      if (over === row) return null
      const box = over.getBoundingClientRect()
      return { kind: 'row', row: over, list, after: y > box.top + box.height / 2 }
    }
    for (let node = under; node; node = node.parentElement) {
      if (zones.has(node)) return { kind: 'zone', zone: node }
    }
    return null
  }

  const begin = () => {
    ghost = row.cloneNode(true) as HTMLElement
    ghost.className = classes.ghost
    ghost.style.width = `${rect.width}px`
    document.body.appendChild(ghost)
    row.classList.add(classes.source)
    document.documentElement.classList.add(DRAGGING)
  }

  const onMove = (event: PointerEvent) => {
    if (!ghost) {
      if (Math.hypot(event.clientX - down.clientX, event.clientY - down.clientY) < START_PX) return
      begin()
    }
    event.preventDefault()
    ghost!.style.transform = `translate(${event.clientX - grab.x}px, ${event.clientY - grab.y}px)`
    clearMarks()
    target = findTarget(event.clientX, event.clientY)
    if (target?.kind === 'row') target.row.classList.add(target.after ? classes.after : classes.before)
    if (target?.kind === 'zone') target.zone.classList.add(zones.get(target.zone)!.className)
  }

  const finish = (drop: boolean) => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onCancel)
    window.removeEventListener('keydown', onKey)
    if (!ghost) return
    const place = target
    clearMarks()
    target = null
    ghost.remove()
    row.classList.remove(classes.source)
    document.documentElement.classList.remove(DRAGGING)
    // Отпускание мыши завершает ещё и клик по строке: он открыл бы переименование.
    const swallow = (event: MouseEvent) => {
      event.stopPropagation()
      event.preventDefault()
    }
    window.addEventListener('click', swallow, { capture: true, once: true })
    setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0)
    if (!drop || !place) return

    if (place.kind === 'zone') {
      zones.get(place.zone)?.drop(id)
      return
    }
    const list = lists.get(place.list)
    if (!list) return
    const ids = list.ids().filter((item) => item !== id)
    const index = ids.indexOf((place.row as HTMLElement).dataset.id ?? '')
    // Бросили на выполненную строку: она ниже всех невыполненных, значит в конец.
    ids.splice(index === -1 ? ids.length : index + (place.after ? 1 : 0), 0, id)
    list.arrange(ids)
  }

  const onUp = () => finish(true)
  const onCancel = () => finish(false)
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') finish(false)
  }

  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onCancel)
  window.addEventListener('keydown', onKey)
}
