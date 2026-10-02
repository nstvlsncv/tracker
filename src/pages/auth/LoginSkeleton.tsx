import { Skeleton } from '../../components/Skeleton'
import styles from './AuthLayout.module.css'

/** Силуэт экрана входа, пока проверяется, не вошёл ли пользователь уже. */
export function LoginSkeleton() {
  return (
    <main className={styles.page} aria-busy="true" aria-label="Загрузка">
      <div className={styles.content}>
        <Skeleton width={150} height={34} />
        <div className={styles.card}>
          <div className={styles.heading}>
            <Skeleton width="50%" height={24} />
          </div>
          <Skeleton height={48} />
          <Skeleton height={48} />
          <Skeleton height={48} />
        </div>
      </div>
    </main>
  )
}
