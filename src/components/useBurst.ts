import { useState } from 'react'

/**
 * Счётчик «достигнуто»: растёт на единицу каждый раз, когда `reached` становится true.
 * Если условие выполнено уже при появлении компонента, праздника нет: он только за то,
 * что сделано сейчас, на глазах. Значение годится как key для Burst.
 */
export function useBurst(reached: boolean): number {
  const [previous, setPrevious] = useState(reached)
  const [count, setCount] = useState(0)
  if (reached !== previous) {
    setPrevious(reached)
    if (reached) setCount(count + 1)
  }
  return count
}
