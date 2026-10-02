const SVG_NS = 'http://www.w3.org/2000/svg'
/** Сколько длится эффект. Столько же строка ещё занимает своё место в списке. */
export const DISSOLVE_MS = 900
/** Насколько далеко разлетаются «пылинки» к концу, px. */
const SCATTER_PX = 320

let counter = 0

/**
 * «Щелчок Таноса»: элемент рассыпается в пыль, которую сносит вправо, и исчезает,
 * как удалённое сообщение в Телеграме. Сам элемент остаётся в странице невидимым и
 * держит своё место: убирает его тот, кто вызвал, когда обещание выполнится. Так пыль
 * успевает разлететься, а соседние строки не наезжают на неё раньше времени.
 * Картинка элемента смещается по шумовой карте: чем дальше, тем сильнее разброс точек.
 */
export function dissolve(node: HTMLElement): Promise<void> {
  const id = `dissolve-${counter++}`
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.setAttribute('aria-hidden', 'true')
  svg.style.position = 'absolute'
  // Область фильтра шире самого элемента: пыли нужно место, куда разлетаться.
  svg.innerHTML = `
    <filter id="${id}" x="-50%" y="-300%" width="220%" height="700%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="1" seed="${counter}" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" />
    </filter>`
  document.body.appendChild(svg)
  const map = svg.querySelector('feDisplacementMap')
  node.inert = true
  // Пыль рисуется поверх соседних строк, а не под ними.
  node.style.position = 'relative'
  node.style.zIndex = '2'
  node.style.filter = `url(#${id})`
  node.style.willChange = 'transform, opacity, filter'

  const start = performance.now()
  const step = (now: number) => {
    const progress = Math.min((now - start) / DISSOLVE_MS, 1)
    // Разлёт начинается сразу и замедляется к концу, гаснет пыль только во второй половине:
    // её успеваешь увидеть.
    const spread = 1 - (1 - progress) * (1 - progress)
    map?.setAttribute('scale', String(spread * SCATTER_PX))
    node.style.transform = `translate(${spread * 40}px, ${-spread * 12}px)`
    node.style.opacity = String(1 - Math.max(0, (progress - 0.5) / 0.5))
    if (progress < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)

  // Таймер, а не конец анимации: во вкладке в фоне кадры не идут, а закончить всё равно нужно.
  return new Promise((resolve) => {
    setTimeout(() => {
      node.style.opacity = '0'
      svg.remove()
      resolve()
    }, DISSOLVE_MS)
  })
}
