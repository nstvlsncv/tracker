import styles from './ComingSoon.module.css'

/** Заглушка для экранов, которые ещё не сделаны. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <>
      <h1 className={`t-heading-1 ${styles.title}`}>{title}</h1>
      <p className={styles.text}>Этот экран скоро появится</p>
    </>
  )
}
