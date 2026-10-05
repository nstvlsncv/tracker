import { AVATAR_SIZE } from './constants'

/**
 * Квадрат, который вырезается из картинки под фото профиля: по центру, со стороной в меньшую
 * сторону картинки. Возвращает левый верхний угол и сторону в пикселях исходной картинки.
 */
export function centerSquare(width: number, height: number): { x: number; y: number; side: number } {
  const side = Math.min(width, height)
  return { x: Math.round((width - side) / 2), y: Math.round((height - side) / 2), side }
}

/**
 * Готовит фото профиля прямо в браузере: вырезает квадрат по центру, уменьшает до
 * `AVATAR_SIZE` и сохраняет в JPEG. В хранилище уходит маленький файл, каким бы большим
 * ни был исходный. Бросает ошибку, если файл не картинка.
 */
export async function prepareAvatar(file: Blob): Promise<Blob> {
  const image = await createImageBitmap(file)
  try {
    const { x, y, side } = centerSquare(image.width, image.height)
    const canvas = document.createElement('canvas')
    canvas.width = AVATAR_SIZE
    canvas.height = AVATAR_SIZE
    const context = canvas.getContext('2d')
    if (!context) throw new Error('prepareAvatar: нет canvas')
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, x, y, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('prepareAvatar: не удалось сжать'))),
        'image/jpeg',
        0.86,
      ),
    )
  } finally {
    image.close()
  }
}
