import { useAuth } from '../auth/useAuth'
import { ConfirmModal } from '../components/ConfirmModal'

/** Подтверждение выхода. Открывается и из бокового меню, и из Профиля на телефоне. */
export function SignOutModal({ onClose }: { onClose: () => void }) {
  const { signOut } = useAuth()
  return (
    <ConfirmModal title="Выйти из аккаунта?" confirmLabel="Выйти" onConfirm={signOut} onClose={onClose}>
      Чтобы вернуться, понадобятся логин и пароль.
    </ConfirmModal>
  )
}
