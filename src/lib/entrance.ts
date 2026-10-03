// Вход только что выполнен: приложение появляется плавно, а не подменяет экран входа рывком.
// При обычной загрузке страницы пометки нет, и приложение показывается сразу после заглушек.

let pending = false

export function markEntrance() {
  pending = true
}

/** Забрать пометку: срабатывает один раз. */
export function takeEntrance(): boolean {
  const value = pending
  pending = false
  return value
}
