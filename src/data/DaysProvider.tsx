import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useToast } from '../components/useToast'
import { prepareDayPhoto } from '../lib/dayPhoto'
import type { DayPhoto, DaysApi } from './days'
import { DaysContext } from './useDays'
import type { DaysValue } from './useDays'

/**
 * Фото дней на время сеанса. Фото сначала сразу видно превью из выбранного файла с кругом загрузки (как в ChatGPT),
 * а в хранилище уходят уже сжатые в браузере файлы. Адреса файлов хранилище выдаёт временные:
 * они просятся пачками и запоминаются до конца сеанса.
 */
export function DaysProvider({ api, children }: { api: DaysApi; children: ReactNode }) {
  const toast = useToast()
  const [photos, setPhotos] = useState<Record<string, DayPhoto> | null | undefined>(undefined)
  const [uploading, setUploading] = useState<Record<string, string>>({})
  const [urls, setUrls] = useState<Record<string, string>>({})

  const latest = useRef({ photos })
  useEffect(() => {
    latest.current = { photos }
  })

  useEffect(() => {
    let cancelled = false
    // Нет таблицы или не загрузилось: фото дня просто нет, остальной трекер работает.
    api.loadPhotos().then(
      (loaded) => !cancelled && setPhotos(loaded),
      () => !cancelled && setPhotos(null),
    )
    return () => {
      cancelled = true
    }
  }, [api])

  // Просьбы об адресах за один кадр собираются и уходят одним запросом.
  const asked = useRef(new Set<string>())
  const queue = useRef(new Set<string>())
  const requestUrls = useCallback(
    (paths: string[]) => {
      const fresh = paths.filter((path) => !asked.current.has(path))
      if (fresh.length === 0) return
      for (const path of fresh) {
        asked.current.add(path)
        queue.current.add(path)
      }
      if (queue.current.size !== fresh.length) return
      setTimeout(() => {
        const batch = [...queue.current]
        queue.current.clear()
        api.photoUrls(batch).then(
          (got) => setUrls((current) => ({ ...current, ...got })),
          // Не получилось: попросим ещё раз, когда картинка снова понадобится.
          () => batch.forEach((path) => asked.current.delete(path)),
        )
      })
    },
    [api],
  )

  const value = useMemo<DaysValue>(
    () => ({
      photos,
      uploading,
      addPhoto: (date, file) => {
        if (!latest.current.photos) return
        if (!file.type.startsWith('image/')) {
          toast({ message: 'Это не картинка: выбери фото' })
          return
        }
        const preview = URL.createObjectURL(file)
        setUploading((current) => ({ ...current, [date]: preview }))
        const done = () => {
          URL.revokeObjectURL(preview)
          setUploading((current) => {
            const next = { ...current }
            delete next[date]
            return next
          })
        }
        prepareDayPhoto(file)
          .then(async ({ full, thumb }) => {
            const photo = await api.uploadPhoto(date, full, thumb)
            // Только что загруженные файлы показываются из браузера, без запроса ссылок.
            setUrls((current) => ({
              ...current,
              [photo.path]: URL.createObjectURL(full),
              [photo.thumbPath]: URL.createObjectURL(thumb),
            }))
            asked.current.add(photo.path)
            asked.current.add(photo.thumbPath)
            setPhotos((current) => current && { ...current, [date]: photo })
          })
          .catch(() => toast({ message: 'Не удалось загрузить фото' }))
          .finally(done)
      },
      deletePhoto: (date) => {
        const photo = latest.current.photos?.[date]
        if (!photo) return
        const put = (value: DayPhoto | null) =>
          setPhotos((current) => {
            if (!current) return current
            const next = { ...current }
            if (value) next[date] = value
            else delete next[date]
            return next
          })
        put(null)
        api.deletePhoto(photo).catch(() => {
          put(photo)
          toast({ message: 'Не удалось удалить фото' })
        })
      },
      urls,
      requestUrls,
    }),
    [api, photos, uploading, urls, requestUrls, toast],
  )

  return <DaysContext.Provider value={value}>{children}</DaysContext.Provider>
}
