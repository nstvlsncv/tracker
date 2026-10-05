// Рисует иконки приложения (для домашнего экрана телефона) в public/.
// Запускать вручную, когда меняется рисунок: node scripts/build-icons.mjs
// Рисунок простой, поэтому обходимся без графических библиотек: белый квадрат и маскот,
// лаймовый круг с двумя глазами (пропорции те же, что у Mascot в приложении).
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const publicDir = resolve(dirname(fileURLToPath(import.meta.url)), '../public')

// Цвета из design-tokens.json: белый, Lime 500 и Neutral 900.
const BACKGROUND = [0xff, 0xff, 0xff]
const CIRCLE = [0xc6, 0xf4, 0x32]
const EYES = [0x17, 0x17, 0x17]
/** Радиус круга в долях стороны. Умещается в «безопасную зону» иконок, которые система обрезает. */
const RADIUS = 0.32
// Глаза в долях диаметра круга, как в Mascot.module.css: ширина 0.13, высота 0.22,
// между ними 0.16, стоят чуть выше центра.
const EYE_HALF_WIDTH = 0.065
const EYE_HALF_HEIGHT = 0.11
const EYE_OFFSET_X = 0.145
const EYE_OFFSET_Y = -0.04
/** Сглаживание края: сколько точек на сторону пикселя проверяется. */
const SAMPLES = 4

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

/** Попадает ли точка (от центра иконки) в один из глаз: вертикальную «капсулу». */
function inEye(dx, dy, diameter) {
  const halfWidth = EYE_HALF_WIDTH * diameter
  // Отрезок, вокруг которого строится капсула: от верхнего закругления до нижнего.
  const reach = (EYE_HALF_HEIGHT - EYE_HALF_WIDTH) * diameter
  const x = Math.abs(dx) - EYE_OFFSET_X * diameter
  const y = dy - EYE_OFFSET_Y * diameter
  const nearest = Math.max(-reach, Math.min(reach, y))
  return x * x + (y - nearest) * (y - nearest) <= halfWidth * halfWidth
}

function icon(size) {
  const center = size / 2
  const radius = size * RADIUS
  // Каждая строка: байт фильтра (0) и по три байта на пиксель.
  const raw = Buffer.alloc(size * (1 + size * 3))
  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * 3)
    for (let x = 0; x < size; x++) {
      // Цвет пикселя: среднее по точкам внутри него (сглаживание краёв).
      const sum = [0, 0, 0]
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const dx = x + (sx + 0.5) / SAMPLES - center
          const dy = y + (sy + 0.5) / SAMPLES - center
          const color = inEye(dx, dy, radius * 2)
            ? EYES
            : dx * dx + dy * dy <= radius * radius
              ? CIRCLE
              : BACKGROUND
          for (let channel = 0; channel < 3; channel++) sum[channel] += color[channel]
        }
      }
      for (let channel = 0; channel < 3; channel++) {
        raw[row + 1 + x * 3 + channel] = Math.round(sum[channel] / (SAMPLES * SAMPLES))
      }
    }
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header.set([8, 2, 0, 0, 0], 8) // 8 бит на канал, RGB без прозрачности
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const FILES = { 'apple-touch-icon.png': 180, 'icon-192.png': 192, 'icon-512.png': 512 }
for (const [name, size] of Object.entries(FILES)) {
  writeFileSync(resolve(publicDir, name), icon(size))
  console.log(`${name}: ${size}×${size}`)
}
