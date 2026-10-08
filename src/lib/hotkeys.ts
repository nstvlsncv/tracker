// Горячие клавиши на компьютере. Цифры 1–6 переключают разделы (их слушает AppShell),
// N начинает новую запись на текущем экране: экран сам решает, что это (задача, привычка, платёж или список).

const EVENT = 'tracker:new-item'

/** Нажали N: открыть добавление на текущем экране. */
export function emitNewItem() {
  window.dispatchEvent(new Event(EVENT))
}

/** Подписаться на N. Возвращает функцию отписки. */
export function onNewItem(listener: () => void): () => void {
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}

/**
 * Можно ли сейчас считать нажатие горячей клавишей: не печатают в поле, не открыта модалка
 * или меню, не зажаты Ctrl, Cmd и Alt (это сочетания браузера и системы).
 */
export function isHotkey(event: KeyboardEvent): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return false
  const target = event.target
  if (target instanceof HTMLElement) {
    if (target.isContentEditable) return false
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return false
  }
  return !document.querySelector('[role="dialog"], [aria-modal="true"]')
}
