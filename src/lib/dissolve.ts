const SVG_NS = 'http://www.w3.org/2000/svg'
const DURATION_MS = 700
/** Насколько далеко разлетаются «пылинки» к концу, px. */
const SCATTER_PX = 240

let counter = 0

/**
 * «Щелчок Таноса»: элемент рассыпается в пыль, которую сносит вправо, и исчезает,
 * как удалённое сообщение в Телеграме. По окончании элемент удаляется из страницы.
 * Картинка элемента смещается по шумовой карте: чем дальше, тем сильнее разброс точек.
 */
export function dissolve(node: HTMLElement) {
  const id = `dissolve-${counter++}`
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.setAttribute('aria-hidden', 'true')
  svg.style.position = 'absolute'
  // Область фильтра шире самого элемента: пыли нужно место, куда разлетаться.
  svg.innerHTML = `
    <filter id="${id}" x="-50%" y="-200%" width="220%" height="500%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="1" seed="${counter}" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" />
    </filter>`
  document.body.appendChild(svg)
  const map = svg.querySelector('feDisplacementMap')
  node.style.filter = `url(#${id})`
  node.style.willChange = 'transform, opacity, filter'

  const start = performance.now()
  const step = (now: number) => {
    const progress = Math.min((now - start) / DURATION_MS, 1)
    // Сначала почти незаметно, к концу всё быстрее: как будто элемент подхватывает ветер.
    const eased = progress * progress
    map?.setAttribute('scale', String(eased * SCATTER_PX))
    node.style.transform = `translate(${eased * 32}px, ${-eased * 10}px)`
    node.style.opacity = String(1 - Math.max(0, (progress - 0.35) / 0.65))
    if (progress < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)

  // Таймер, а не конец анимации: во вкладке в фоне кадры не идут, а убрать элемент всё равно нужно.
  setTimeout(() => {
    node.remove()
    svg.remove()
  }, DURATION_MS + 50)
}
