import { Component } from 'react'
import type { ReactNode } from 'react'
import { Button } from './Button'
import styles from './ErrorBoundary.module.css'

type Props = { children: ReactNode }
type State = { failed: boolean }

/**
 * Если при отрисовке что-то сломалось, показывает сообщение и кнопку обновления
 * вместо пустого белого экрана.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className={styles.screen} role="alert">
        <h1 className="t-heading-4">Что-то сломалось</h1>
        <p className={styles.text}>Обнови страницу. Если не поможет, напиши Насте</p>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Обновить страницу
        </Button>
      </div>
    )
  }
}
