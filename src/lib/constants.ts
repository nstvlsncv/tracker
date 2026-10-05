// Допущения из SPEC.md, вынесены сюда, чтобы их было легко поменять.

export const ITEM_TITLE_MAX_LENGTH = 200
/** Название привычки: то же ограничение стоит в базе. */
export const HABIT_TITLE_MAX_LENGTH = 60
/** Имя и фамилия в профиле: то же ограничение стоит в базе. */
export const NAME_MAX_LENGTH = 100

export const TOAST_DURATION_MS = 4000
export const UNDO_TOAST_DURATION_MS = 5000

export const LOGIN_MAX_ATTEMPTS = 5
export const LOGIN_LOCK_MS = 5 * 60 * 1000

/** Телеграм владелицы: «Напиши мне» на экране входа и обратная связь в Профиле. */
export const AUTHOR_URL = 'https://t.me/nst_vlsncv'

/** Сторона фото профиля в пикселях: до неё картинка сжимается в браузере перед отправкой. */
export const AVATAR_SIZE = 256

/** Заметка недели: то же ограничение стоит в базе. */
export const NOTE_MAX_LENGTH = 5000
