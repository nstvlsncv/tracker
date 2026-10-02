// Рисует иконки приложения (для домашнего экрана телефона) в public/.
// Запускать вручную, когда меняется рисунок: node scripts/build-icons.mjs
// Рисунок простой, поэтому обходимся без графических библиотек: тёмный квадрат и лаймовый круг.
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const publicDir = resolve(dirname(fileURLToPath(import.meta.url)), '../public')

// Цвета из design-tokens.json: Neutral 900 и Lime 500.
const BACKGROUND = [0x17, 0x17, 0x17]
const CIRCLE = [0xc6, 0xf4, 0x32]
/** Радиус круга в долях стороны. Умещается в «безопасную зону» иконок, которые система обрезает. */
const RADIUS = 0.3
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

function icon(size) {
  const center = size / 2
  const radius = size * RADIUS
  // Каждая строка: байт фильтра (0) и по три байта на пиксель.
  const raw = Buffer.alloc(size * (1 + size * 3))
  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * 3)
    for (let x = 0; x < size; x++) {
      let inside = 0
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const dx = x + (sx + 0.5) / SAMPLES - center
          const dy = y + (sy + 0.5) / SAMPLES - center
          if (dx * dx + dy * dy <= radius * radius) inside++
        }
      }
      const share = inside / (SAMPLES * SAMPLES)
      for (let channel = 0; channel < 3; channel++) {
        raw[row + 1 + x * 3 + channel] = Math.round(
          BACKGROUND[channel] + (CIRCLE[channel] - BACKGROUND[channel]) * share,
        )
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
