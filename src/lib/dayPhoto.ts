import { centerSquare } from './avatar'

/** Длинная сторона фото дня: до неё картинка уменьшается в браузере перед отправкой. */
export const PHOTO_MAX_SIDE = 1600
/** Сторона квадратной миниатюры для календаря и карточек. */
export const THUMB_SIDE = 320

/** Размер, в который вписывается картинка: длинная сторона не больше `max`, меньшие не растут. */
export function fitSize(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('dayPhoto: не удалось сжать'))),
      'image/jpeg',
      quality,
    ),
  )
}

/**
 * Готовит фото дня прямо в браузере: само фото уменьшается до `PHOTO_MAX_SIDE` по длинной
 * стороне, миниатюра вырезается квадратом по центру. В хранилище уходят два небольших JPEG,
 * каким бы большим ни был снимок с телефона. Бросает ошибку, если файл не картинка.
 */
export async function prepareDayPhoto(file: Blob): Promise<{ full: Blob; thumb: Blob }> {
  // from-image: снимок с телефона встаёт так, как его сняли, а не боком.
  const image = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) throw new Error('dayPhoto: нет canvas')
    context.imageSmoothingQuality = 'high'

    const size = fitSize(image.width, image.height, PHOTO_MAX_SIDE)
    canvas.width = size.width
    canvas.height = size.height
    context.drawImage(image, 0, 0, size.width, size.height)
    const full = await toJpeg(canvas, 0.85)

    const { x, y, side } = centerSquare(image.width, image.height)
    canvas.width = THUMB_SIDE
    canvas.height = THUMB_SIDE
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, x, y, side, side, 0, 0, THUMB_SIDE, THUMB_SIDE)
    const thumb = await toJpeg(canvas, 0.8)
    return { full, thumb }
  } finally {
    image.close()
  }
}
