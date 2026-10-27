/** Фото дня: пути к двум файлам в хранилище, само фото и квадратная миниатюра. */
export type DayPhoto = {
  /** 'yyyy-MM-dd' */
  date: string
  path: string
  thumbPath: string
}

/**
 * Откуда брать фото дней: `supabaseDays` в приложении, `createMemoryDays` для демо.
 * Отдельно от `PlannerApi`, чтобы тот не разрастался (как финансы и списки).
 * null из load: таблицы в этой базе нет (не применена свежая схема), возможности нет.
 */
export type DaysApi = {
  loadPhotos: () => Promise<Record<string, DayPhoto> | null>
  /** Положить уже сжатые файлы и записать фото дня. Прежнее фото этого дня удаляется. */
  uploadPhoto: (date: string, full: Blob, thumb: Blob) => Promise<DayPhoto>
  deletePhoto: (photo: DayPhoto) => Promise<void>
  /** Адреса для показа: путь файла → ссылка. Хранилище закрытое, ссылки временные. */
  photoUrls: (paths: string[]) => Promise<Record<string, string>>
}
