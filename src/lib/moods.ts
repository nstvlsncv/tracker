import type { Mood } from '../data/types'

/** Настроения дня, от лучшего к худшему: в таком порядке они стоят в выборе. */
export const MOODS: Array<{ value: Mood; kind: MoodKind; label: string }> = [
  { value: 5, kind: 'great', label: 'Отличный день' },
  { value: 4, kind: 'good', label: 'Хороший день' },
  { value: 3, kind: 'okay', label: 'Обычный день' },
  { value: 2, kind: 'low', label: 'Так себе день' },
  { value: 1, kind: 'bad', label: 'Плохой день' },
]

/** Выражение лица маскота для настроения. */
export type MoodKind = 'great' | 'good' | 'okay' | 'low' | 'bad'

const BY_VALUE = new Map(MOODS.map((mood) => [mood.value, mood]))

export function moodKind(mood: Mood): MoodKind {
  return BY_VALUE.get(mood)!.kind
}

export function moodLabel(mood: Mood): string {
  return BY_VALUE.get(mood)!.label
}

/** Среднее настроение, одним знаком после запятой. null: отметок нет. */
export function averageMood(moods: Mood[]): number | null {
  if (moods.length === 0) return null
  return Math.round((moods.reduce((sum, mood) => sum + mood, 0) / moods.length) * 10) / 10
}
