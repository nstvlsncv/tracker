import { createContext, useContext, useEffect } from 'react'
import type { DayPhoto } from './days'

export type DaysValue = {
  /** Фото по датам. undefined: ещё грузятся, null: фото в этой базе нет. */
  photos: Record<string, DayPhoto> | null | undefined
  /** Фото, которые сейчас загружаются: дата → адрес превью прямо из выбранного файла. */
  uploading: Record<string, string>
  /** Сжать и загрузить фото дня. Прежнее фото дня заменяется. */
  addPhoto: (date: string, file: File) => void
  /** Удалить фото дня насовсем (экран сначала спрашивает подтверждение). */
  deletePhoto: (date: string) => void
  /** Адреса файлов, которые уже получены: путь → ссылка. */
  urls: Record<string, string>
  /** Попросить адреса файлов. Просьбы за один кадр уходят одним запросом. */
  requestUrls: (paths: string[]) => void
}

export const DaysContext = createContext<DaysValue | null>(null)

export function useDays(): DaysValue {
  const value = useContext(DaysContext)
  if (!value) throw new Error('useDays: нет DaysProvider выше по дереву')
  return value
}

/** Адрес миниатюры или самого фото. Пока ссылки нет, undefined: её уже попросили. */
export function usePhotoUrl(photo: DayPhoto | undefined, kind: 'thumb' | 'full'): string | undefined {
  const { urls, requestUrls } = useDays()
  const path = photo ? (kind === 'thumb' ? photo.thumbPath : photo.path) : undefined
  const url = path ? urls[path] : undefined
  useEffect(() => {
    if (path && url === undefined) requestUrls([path])
  }, [path, url, requestUrls])
  return url
}
