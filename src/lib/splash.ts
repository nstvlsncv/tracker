/**
 * Заставка при открытии трекера: маскот по центру экрана, свёрстан прямо в `index.html`
 * и виден ещё до того, как загрузился код. Здесь решается, когда её убрать: когда приложение
 * отрисовалось и на экране не осталось ни одной загрузки (`PageLoader`). Стоит не меньше полутора секунд, чтобы не мелькать. Убирается один раз
 * и больше не возвращается: дальше разделы открываются как обычно.
 */

/** Сколько загрузок сейчас на экране. */
let holds = 0
let gone = false
let timer: ReturnType<typeof setTimeout> | undefined

/** Пауза перед проверкой: одна загрузка часто сразу сменяется другой (вход, потом данные). */
const SETTLE_MS = 80
/**
 * Сколько заставка стоит на экране самое меньшее, считая от открытия страницы. Без этого при
 * быстрой загрузке маскот мелькал на долю секунды, и это выглядело как мигание, а не заставка.
 */
const MIN_SHOWN_MS = 1500
/** Сколько длится исчезновение. То же число стоит в стилях заставки в `index.html`. */
const FADE_MS = 250

function hide() {
  gone = true
  const splash = document.getElementById('splash')
  if (!splash) return
  splash.classList.add('splash-out')
  setTimeout(() => splash.remove(), FADE_MS)
}

function check() {
  if (gone) return
  clearTimeout(timer)
  // performance.now() считает от открытия страницы: заставка видна с первого кадра.
  const wait = Math.max(SETTLE_MS, MIN_SHOWN_MS - performance.now())
  timer = setTimeout(() => {
    if (holds === 0) hide()
  }, wait)
}

/** На экране появилась загрузка: заставка ждёт. Возвращает функцию «загрузка ушла». */
export function holdSplash(): () => void {
  if (gone) return () => {}
  holds++
  return () => {
    holds--
    check()
  }
}

/** Приложение отрисовалось: если загрузок на экране нет, заставку можно убирать. */
export function settleSplash() {
  check()
}
