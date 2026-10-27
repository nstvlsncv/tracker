import { DAY_PHOTOS } from '../lib/constants'
import { supabase } from '../lib/supabase'
import type { DayPhoto, DaysApi } from './days'

/** Supabase отдаёт не больше 1000 строк за запрос. */
const PAGE_SIZE = 1000
/** Сколько живёт ссылка на фото. Хватает на любой сеанс. */
const URL_TTL_S = 24 * 60 * 60

async function unwrap<T>(request: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await request
  if (error) throw error
  return data
}

/** Все строки таблицы страницами. null: таблицы нет. */
async function loadAll<Row>(table: string, columns: string): Promise<Row[] | null> {
  const rows: Row[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order('date')
      .range(from, from + PAGE_SIZE - 1)
    if (error) return null
    rows.push(...((data ?? []) as Row[]))
    if ((data ?? []).length < PAGE_SIZE) return rows
  }
}

async function userId(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const id = data.session?.user.id
  if (!id) throw new Error('supabaseDays: нет входа')
  return id
}

type PhotoRow = { date: string; path: string; thumb_path: string }
const toPhoto = (row: PhotoRow): DayPhoto => ({
  date: row.date,
  path: row.path,
  thumbPath: row.thumb_path,
})

// user_id в строки не передаётся: база сама подставляет текущего пользователя.
export const supabaseDays: DaysApi = {
  async loadPhotos() {
    const rows = await loadAll<PhotoRow>('day_photos', 'date, path, thumb_path')
    return rows && Object.fromEntries(rows.map((row) => [row.date, toPhoto(row)]))
  },

  async uploadPhoto(date, full, thumb) {
    const folder = await userId()
    // Имя с отметкой времени: у нового фото новый адрес, браузер не покажет старое из кеша.
    const name = `${folder}/${date}-${Date.now().toString(36)}`
    const photo: DayPhoto = { date, path: `${name}.jpg`, thumbPath: `${name}-thumb.jpg` }
    const bucket = supabase.storage.from(DAY_PHOTOS)
    for (const [path, file] of [
      [photo.path, full],
      [photo.thumbPath, thumb],
    ] as const) {
      const { error } = await bucket.upload(path, file, { contentType: 'image/jpeg' })
      if (error) throw error
    }
    const before = await supabase
      .from('day_photos')
      .select('date, path, thumb_path')
      .eq('date', date)
      .maybeSingle()
    await unwrap(
      supabase.from('day_photos').upsert(
        {
          date,
          path: photo.path,
          thumb_path: photo.thumbPath,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,date' },
      ),
    )
    // Прежние файлы дня больше не нужны. Не удалились: фото всё равно заменено.
    const old = before.data as PhotoRow | null
    if (old) await bucket.remove([old.path, old.thumb_path])
    return photo
  },

  async deletePhoto(photo) {
    await unwrap(supabase.from('day_photos').delete().eq('date', photo.date))
    await supabase.storage.from(DAY_PHOTOS).remove([photo.path, photo.thumbPath])
  },

  async photoUrls(paths) {
    if (paths.length === 0) return {}
    const { data, error } = await supabase.storage
      .from(DAY_PHOTOS)
      .createSignedUrls(paths, URL_TTL_S)
    if (error) throw error
    const urls: Record<string, string> = {}
    for (const item of data ?? []) if (item.path && item.signedUrl) urls[item.path] = item.signedUrl
    return urls
  },
}
