import { X } from '@phosphor-icons/react'
import { useState } from 'react'
import { Button } from '../../components/Button'
import { InstallSteps } from '../../components/Help'
import { IconButton } from '../../components/IconButton'
import { Modal } from '../../components/Modal'
import styles from './InstallBanner.module.css'

// Баннер убрали крестиком: выбор хранится в браузере, как тема и свёрнутое меню.
const KEY = 'tracker.install'

/** Нужен ли баннер: это телефон, трекер открыт в браузере, а не с иконки, и баннер не убирали. */
function shouldShow(): boolean {
  try {
    if (localStorage.getItem(KEY) === 'hidden') return false
  } catch {
    // Хранилище недоступно (приватный режим): баннер просто покажется.
  }
  const installed =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  return !installed && window.matchMedia('(max-width: 640px) and (hover: none)').matches
}

/**
 * Баннер на Главной на телефоне: трекер можно добавить на экран телефона, и он будет
 * открываться как приложение. Кнопка открывает шторку с шагами для iPhone и Android.
 * Когда трекер уже открыт с иконки, баннера нет; крестик убирает его насовсем.
 */
export function InstallBanner() {
  const [shown, setShown] = useState(shouldShow)
  const [open, setOpen] = useState(false)
  if (!shown) return null

  const hide = () => {
    setShown(false)
    try {
      localStorage.setItem(KEY, 'hidden')
    } catch {
      // Хранилище недоступно: баннер вернётся при следующем открытии.
    }
  }

  return (
    <section className={styles.banner}>
      <img className={styles.icon} src="/icon-192.png?v=2" alt="" width={48} height={48} />
      <div className={styles.text}>
        <h2 className="t-heading-5">Трекер как приложение</h2>
        <p className={styles.hint}>Добавь иконку на экран телефона</p>
      </div>
      <IconButton
        className={styles.close}
        variant="ghost"
        size="sm"
        icon={<X aria-hidden />}
        aria-label="Убрать подсказку"
        onClick={hide}
      />
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Как добавить
      </Button>

      {open && (
        <Modal
          open
          title="Иконка на экране телефона"
          onClose={() => setOpen(false)}
          footer={<Button onClick={() => setOpen(false)}>Понятно</Button>}
        >
          <InstallSteps />
        </Modal>
      )}
    </section>
  )
}
