import { CaretLeft, CaretRight, Trash } from '@phosphor-icons/react'
import { parseISO } from 'date-fns'
import { useEffect, useState } from 'react'
import type { DayPhoto } from '../data/days'
import { useDays, usePhotoUrl } from '../data/useDays'
import { formatDayMonth } from '../lib/dates'
import { Button } from './Button'
import { ConfirmModal } from './ConfirmModal'
import { IconButton } from './IconButton'
import { Modal } from './Modal'
import styles from './PhotoViewer.module.css'

type Props = {
  photo: DayPhoto
  /** Перейти к фото другого дня (стрелки и клавиши ← →). */
  onMove: (date: string) => void
  /** «Заменить»: просмотр закрывается и открывается выбор нового фото для открытого дня. */
  onReplace: () => void
  onClose: () => void
}

/**
 * Фото дня в обычной модалке (на телефоне шторкой). Пока грузится само фото, видно миниатюру.
 * Внизу одним рядом: корзина (спрашивает подтверждение: вернуть фото нельзя), «Заменить» и
 * стрелки к предыдущему и следующему фото (по датам, через дни без фото), на компьютере
 * листают и клавиши ← и →.
 */
export function PhotoViewer({ photo, onMove, onReplace, onClose }: Props) {
  const { photos, deletePhoto } = useDays()
  const full = usePhotoUrl(photo, 'full')
  const thumb = usePhotoUrl(photo, 'thumb')
  const [confirming, setConfirming] = useState(false)

  const dates = Object.keys(photos ?? {}).sort()
  const index = dates.indexOf(photo.date)
  const previous = index > 0 ? dates[index - 1] : null
  const next = index >= 0 && index < dates.length - 1 ? dates[index + 1] : null

  useEffect(() => {
    if (confirming) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' && previous) onMove(previous)
      if (event.key === 'ArrowRight' && next) onMove(next)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirming, previous, next, onMove])

  return (
    <>
      {/* Пока спрашиваем про удаление, фото прячется: две модалки разом закрывались бы одним Escape. */}
      <Modal
        open={!confirming}
        title={`Фото дня, ${formatDayMonth(parseISO(photo.date))}`}
        onClose={onClose}
        footer={
          <div className={styles.nav}>
            <IconButton
              tone="danger"
              variant="ghost"
              aria-label="Удалить фото"
              icon={<Trash aria-hidden />}
              onClick={() => setConfirming(true)}
            />
            <Button className={styles.replace} onClick={onReplace}>
              Заменить
            </Button>
            {/* У первого и последнего фото стрелки в ту сторону нет. */}
            {previous && (
              <IconButton
                variant="secondary"
                aria-label={`Предыдущее фото, ${formatDayMonth(parseISO(previous))}`}
                icon={<CaretLeft aria-hidden />}
                onClick={() => onMove(previous)}
              />
            )}
            {next && (
              <IconButton
                variant="secondary"
                aria-label={`Следующее фото, ${formatDayMonth(parseISO(next))}`}
                icon={<CaretRight aria-hidden />}
                onClick={() => onMove(next)}
              />
            )}
          </div>
        }
      >
        {/* Место под фото одной высоты: при листании модалка не прыгает. */}
        <div className={styles.stage}>
          <img key={photo.date} className={styles.image} src={full ?? thumb} alt="" />
        </div>
      </Modal>
      {confirming && (
        <ConfirmModal
          title="Удалить фото дня?"
          confirmLabel="Удалить"
          onConfirm={() => {
            deletePhoto(photo.date)
            onClose()
          }}
          onClose={() => setConfirming(false)}
        >
          Фото удалится насовсем, вернуть его не получится.
        </ConfirmModal>
      )}
    </>
  )
}
