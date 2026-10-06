/** Знакомство с трекером при первом входе: пройдено ли оно и как показать его ещё раз. */

const KEY = 'tracker.onboarding'
const SHOW_EVENT = 'tracker:onboarding'

/** Знакомство уже показывали в этом браузере. */
export function isOnboarded(): boolean {
  try {
    return localStorage.getItem(KEY) === 'done'
  } catch {
    // Хранилище недоступно (приватный режим): запомнить нечем, поэтому не показываем каждый раз.
    return true
  }
}

/** Запомнить в этом браузере, что знакомство пройдено или пропущено. */
export function markOnboarded() {
  try {
    localStorage.setItem(KEY, 'done')
  } catch {
    // Не запомнилось: в худшем случае знакомство покажется ещё раз.
  }
}

/** Показать знакомство ещё раз (кнопка в «Помощи»). */
export function showOnboarding() {
  window.dispatchEvent(new Event(SHOW_EVENT))
}

/** Слушать просьбу показать знакомство ещё раз. Возвращает отписку. */
export function onShowOnboarding(listener: () => void): () => void {
  window.addEventListener(SHOW_EVENT, listener)
  return () => window.removeEventListener(SHOW_EVENT, listener)
}
