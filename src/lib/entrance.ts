// Вход только что выполнен: приложение появляется плавно, а не подменяет экран входа рывком.
// При обычной загрузке страницы пометки нет, и приложение показывается сразу после заглушек.

let pending = false
let holdUntil = 0

/** holdMs: сколько экран входа ещё остаётся на месте, чтобы кнопка успела отпраздновать. */
export function markEntrance(holdMs = 0) {
  pending = true
  holdUntil = Date.now() + holdMs
}

/** Сколько миллисекунд экран входа ещё нужно подержать. */
export function entranceHoldLeft(): number {
  return Math.max(0, holdUntil - Date.now())
}

/** Забрать пометку: срабатывает один раз. */
export function takeEntrance(): boolean {
  const value = pending
  pending = false
  return value
}
