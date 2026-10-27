import type { DayPhoto, DaysApi } from './days'

/**
 * Фото дней в памяти: для демо гостей (/demo) и экранов разработки (/dev/app). Сначала фото
 * нет ни у одного дня: придуманные картинки владелица попросила не добавлять, в календаре
 * пустые кружки. Загруженное в демо живёт до обновления страницы.
 */
export function createMemoryDays(): DaysApi {
  const photos: Record<string, DayPhoto> = {}
  // Путь → как получить адрес картинки: адрес файла в браузере.
  const sources = new Map<string, () => string>()

  return {
    async loadPhotos() {
      return { ...photos }
    },
    async uploadPhoto(date, full, thumb) {
      const stamp = Date.now().toString(36)
      const photo = { date, path: `local/${date}-${stamp}.jpg`, thumbPath: `local/${date}-${stamp}-thumb.jpg` }
      const fullUrl = URL.createObjectURL(full)
      const thumbUrl = URL.createObjectURL(thumb)
      sources.set(photo.path, () => fullUrl)
      sources.set(photo.thumbPath, () => thumbUrl)
      photos[date] = photo
      return photo
    },
    async deletePhoto(photo) {
      delete photos[photo.date]
    },
    async photoUrls(paths) {
      return Object.fromEntries(paths.map((path) => [path, sources.get(path)?.() ?? '']))
    },
  }
}
