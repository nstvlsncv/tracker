import { Skeleton } from './Skeleton'
import styles from './ListSkeleton.module.css'

/** Заглушка списка задач, целей или привычек на время загрузки: кружок чекбокса и строка текста. */
export function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className={styles.list}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={styles.row}>
          <Skeleton width={32} height={32} round />
          <Skeleton width={`${60 - index * 12}%`} />
        </div>
      ))}
    </div>
  )
}
