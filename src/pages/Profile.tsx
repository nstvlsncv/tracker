import { SignOut } from '@phosphor-icons/react'
import { useAuth } from '../auth/useAuth'
import { Button } from '../components/Button'
import { PageHeader } from '../layout/PageHeader'
import styles from './Profile.module.css'

// Пока заглушка: сам экран Профиля появится на одном из следующих шагов.
// Кнопка выхода нужна уже сейчас, потому что на телефоне в нижней панели её нет.
export function Profile() {
  const { signOut } = useAuth()
  return (
    <>
      <PageHeader title="Профиль" />
      <p className={styles.text}>Этот экран скоро появится</p>
      <div className={styles.logout}>
        <Button tone="danger" variant="ghost" size="lg" icon={<SignOut aria-hidden />} onClick={signOut}>
          Выйти
        </Button>
      </div>
    </>
  )
}
