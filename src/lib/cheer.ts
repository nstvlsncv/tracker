// Повод порадоваться (салют от отметки, день закрыт на 100%): маскот слышит это и подпрыгивает.

const EVENT = 'tracker:cheer'

export function cheer() {
  window.dispatchEvent(new Event(EVENT))
}

/** Подписаться на поводы для радости. Возвращает функцию отписки. */
export function onCheer(listener: () => void): () => void {
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}
