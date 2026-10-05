import styles from './Kbd.module.css'

/**
 * Горячая клавиша рядом с подписью кнопки или пункта меню: тем же шрифтом, но бледнее.
 * Видна только на компьютере: на планшете и телефоне клавиатуры нет.
 * Для скринридера её нет: подпись кнопки остаётся прежней.
 */
export function Kbd({ children }: { children: string }) {
  return (
    <kbd className={styles.kbd} aria-hidden>
      {children}
    </kbd>
  )
}
