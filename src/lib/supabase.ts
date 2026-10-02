import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error('Нет настроек Supabase: скопируй .env.example в .env.local и заполни значения')
}

export const supabase = createClient(url, key)

/** Нет связи с сервером (или сервер недоступен), а не отказ по существу запроса. */
export function isNetworkError(error: { name?: string; status?: number; message?: string }): boolean {
  return (
    error.name === 'AuthRetryableFetchError' ||
    error.status === 0 ||
    /failed to fetch|networkerror|load failed/i.test(error.message ?? '')
  )
}

export const NETWORK_ERROR_MESSAGE = 'Не удалось подключиться. Проверь интернет'
