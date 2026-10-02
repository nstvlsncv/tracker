import { PageHeader } from '../layout/PageHeader'
import styles from './ComingSoon.module.css'

/** Заглушка для экранов, которые ещё не сделаны. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <p className={styles.text}>Этот экран скоро появится</p>
    </>
  )
}
