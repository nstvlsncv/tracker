import { IconLogout } from '@tabler/icons-react'
import { useAuth } from '../auth/useAuth'
import { Button } from '../components/Button'
import { supabase } from '../lib/supabase'
import styles from './Home.module.css'

// Временная заглушка, чтобы проверить вход и выход. Каркас с сайдбаром: шаг 4, Главная: шаг 6.
export function Home() {
  const { profile } = useAuth()
  return (
    <main className={styles.page}>
      <h1 className="t-heading-2">Привет, {profile?.name}</h1>
      <p>Экраны появятся на следующих шагах</p>
      <div>
        <Button
          variant="secondary"
          icon={<IconLogout aria-hidden />}
          onClick={() => supabase.auth.signOut({ scope: 'local' })}
        >
          Выйти
        </Button>
      </div>
    </main>
  )
}
