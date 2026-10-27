import { useSyncExternalStore } from 'react'

/** Совпадает ли сейчас медиазапрос. Сам обновляется, когда меняется размер окна. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
  )
}

/** Телефон: та же граница, что в стилях (до 640px). */
export const PHONE_QUERY = '(max-width: 640px)'
