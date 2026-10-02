export type Device = 'desktop' | 'laptop' | 'mobile'

export type DeviceInfo = {
  /** «Chrome · macOS». Если строку разобрать не удалось: «Неизвестное устройство». */
  label: string
  device: Device
}

// Порядок важен: Edge и Opera называют себя ещё и Chrome, а Chrome ещё и Safari.
const BROWSERS: [RegExp, string][] = [
  [/YaBrowser\//, 'Яндекс Браузер'],
  [/Edg(e|A|iOS)?\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/Firefox\/|FxiOS\//, 'Firefox'],
  [/Chrome\/|CriOS\//, 'Chrome'],
  [/Safari\//, 'Safari'],
]

// iPhone и iPad называют себя «like Mac OS X», Android называет себя Linux.
const SYSTEMS: [RegExp, string, Device][] = [
  [/iPhone|iPod/, 'iPhone', 'mobile'],
  [/iPad/, 'iPad', 'mobile'],
  [/Android/, 'Android', 'mobile'],
  [/Windows/, 'Windows', 'desktop'],
  [/Mac OS X|Macintosh/, 'macOS', 'laptop'],
  [/CrOS/, 'ChromeOS', 'laptop'],
  [/Linux/, 'Linux', 'desktop'],
]

/** Браузер и система из строки user-agent, для списка сессий в Профиле. */
export function describeUserAgent(userAgent: string | null): DeviceInfo {
  const browser = BROWSERS.find(([pattern]) => pattern.test(userAgent ?? ''))?.[1]
  const system = SYSTEMS.find(([pattern]) => pattern.test(userAgent ?? ''))
  const label = [browser, system?.[1]].filter(Boolean).join(' · ')
  return { label: label || 'Неизвестное устройство', device: system?.[2] ?? 'desktop' }
}
