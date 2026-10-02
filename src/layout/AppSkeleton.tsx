import { Skeleton } from '../components/Skeleton'
import shell from './AppShell.module.css'
import styles from './AppSkeleton.module.css'

/**
 * Заглушка всего приложения, пока проверяется вход: силуэт меню и экрана.
 * Показывается вместо пустой белой страницы.
 */
export function AppSkeleton() {
  return (
    <div className={shell.shell} aria-busy="true" aria-label="Загрузка">
      <aside className={`${shell.sidebar} ${styles.sidebar}`}>
        <div className={styles.logo}>
          <Skeleton width={120} height={30} />
        </div>
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} height={48} />
        ))}
      </aside>
      <main className={shell.main}>
        <PageSkeleton />
      </main>
    </div>
  )
}

/** Заглушка содержимого экрана: шапка и две карточки-секции. */
export function PageSkeleton() {
  return (
    <>
      <div className={styles.header}>
        <Skeleton width={200} height={38} />
        <Skeleton width={220} height={48} />
      </div>
      {[3, 2].map((rows) => (
        <div key={rows} className={styles.section}>
          <Skeleton width={160} height={24} />
          {Array.from({ length: rows }, (_, index) => (
            <div key={index} className={styles.row}>
              <Skeleton width={32} height={32} round />
              <Skeleton width={`${55 - index * 10}%`} />
            </div>
          ))}
        </div>
      ))}
    </>
  )
}
