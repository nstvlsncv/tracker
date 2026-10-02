/**
 * Новый идентификатор в формате UUID v4.
 *
 * Встроенный crypto.randomUUID() браузер даёт только на защищённых страницах (https и
 * localhost). Когда локальную версию открывают с телефона по адресу вида http://192.168.…,
 * его нет, и обращение к нему роняло добавление задач. Поэтому есть запасной способ на
 * crypto.getRandomValues, который доступен везде.
 */
export function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()

  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // версия 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // вариант RFC 4122
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0'))
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10).join(''),
  ].join('-')
}
