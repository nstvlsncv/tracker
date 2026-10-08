import { useCallback, useState } from 'react'
import { MoodFace } from '../../components/MoodFace'
import { MoodMenu } from '../../components/MoodMenu'
import { usePlanner } from '../../data/usePlanner'
import { moodLabel } from '../../lib/moods'
import styles from './MoodPicker.module.css'

/**
 * Настроение дня в шапке карточки дня: лицо маскота. Нажатие открывает под ним пять лиц
 * на выбор, от отличного дня к плохому; повторный выбор того же лица снимает отметку.
 * Пока настроения грузятся или их нет в базе, кнопки нет.
 */
export function MoodPicker({ date, size = 28 }: { date: string; size?: number }) {
  const { moods, setMood } = usePlanner()
  // Кнопка, под которой открыто окошко выбора. null: окошко закрыто.
  const [anchor, setAnchor] = useState<Element | null>(null)
  const close = useCallback(() => setAnchor(null), [])

  if (!moods) return null
  const mood = moods[date] ?? null

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        aria-label={mood ? `Настроение дня: ${moodLabel(mood)}` : 'Отметить настроение дня'}
        aria-expanded={Boolean(anchor)}
        onClick={(event) => {
          const button = event.currentTarget
          setAnchor((current) => (current ? null : button))
        }}
      >
        {/* key: новое лицо появляется с маленьким прыжком. */}
        <MoodFace key={mood ?? 0} mood={mood} size={size} className={mood ? styles.picked : undefined} />
      </button>
      {anchor && (
        <MoodMenu
          anchor={anchor}
          mood={mood}
          onPick={(next) => setMood(date, next)}
          onClose={close}
        />
      )}
    </>
  )
}
