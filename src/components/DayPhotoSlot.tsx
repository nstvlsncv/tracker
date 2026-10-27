import { Camera, ImageSquare } from '@phosphor-icons/react'
import { parseISO } from 'date-fns'
import { useRef, useState } from 'react'
import type { CSSProperties, DragEvent } from 'react'
import { useDays, usePhotoUrl } from '../data/useDays'
import { cx } from '../lib/cx'
import { formatDayMonth } from '../lib/dates'
import { IconButton } from './IconButton'
import { Modal } from './Modal'
import { PhotoViewer } from './PhotoViewer'
import styles from './DayPhotoSlot.module.css'

type Props = {
  /** 'yyyy-MM-dd' */
  date: string
  /** Сторона квадрата в пикселях. 'fill': во всю клетку календаря. */
  size?: number | 'fill'
  /** Сегодняшний день в календаре: кружок обведён, как у привычек и настроения. */
  today?: boolean
  className?: string
}

/** Сенсорный экран: выбор источника шторкой. С курсором сразу открывается выбор файла. */
const isTouch = () => window.matchMedia('(hover: none)').matches

/**
 * Фото дня. Пока фото нет: кнопка из дизайн-системы (Accent / Secondary) со значком камеры. Нажатие на телефоне открывает шторку с двумя
 * большими плитками, «Камера» и «Галерея» (как вложения в ChatGPT), на компьютере сразу
 * выбор файла; фото можно и просто перетащить на квадрат. Пока фото загружается, в квадрате
 * уже видно его превью с кругом загрузки. Загруженное открывается на весь экран.
 */
export function DayPhotoSlot({ date, size = 64, today = false, className }: Props) {
  const { photos, uploading, addPhoto } = useDays()
  const photo = photos?.[date]
  const preview = uploading[date]
  const thumb = usePhotoUrl(photo, 'thumb')
  const gallery = useRef<HTMLInputElement>(null)
  const camera = useRef<HTMLInputElement>(null)
  const [sourceOpen, setSourceOpen] = useState(false)
  // Какое фото открыто в просмотре: стрелками можно уйти к фото других дней.
  const [viewing, setViewing] = useState<string | null>(null)
  // День, которому достанется выбранный файл: свой или открытый в просмотре («Заменить»).
  const target = useRef(date)
  const [over, setOver] = useState(false)

  if (!photos) return null

  const pick = (day = date) => {
    target.current = day
    if (isTouch()) setSourceOpen(true)
    else gallery.current?.click()
  }
  const take = (file: File | undefined) => {
    if (file) addPhoto(target.current, file)
  }
  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setOver(false)
    target.current = date
    take(event.dataTransfer.files[0])
  }

  const day = formatDayMonth(parseISO(date))
  const style = (size === 'fill' ? undefined : { '--side': `${size}px` }) as
    CSSProperties | undefined
  const shown = preview ?? (photo ? thumb : undefined)

  // Перетащить фото можно и на пустую кнопку, и на квадрат с фото (тогда оно заменится).
  const drop = {
    onDragOver: (event: DragEvent) => {
      event.preventDefault()
      setOver(true)
    },
    onDragLeave: () => setOver(false),
    onDrop,
  }
  // Фото ещё нет: обычная кнопка из дизайн-системы (Accent / Secondary) со значком камеры,
  // как кнопка с плюсом в шапках секций. Клетки календаря остаются квадратами с числом дня.
  const empty = !photo && !preview && size !== 'fill'

  return (
    <>
      {empty ? (
        <IconButton
          variant="secondary"
          size={size >= 48 ? 'lg' : size >= 40 ? 'md' : 'sm'}
          className={cx(over && styles.over, className)}
          aria-label={`Добавить фото дня, ${day}`}
          title={`Добавить фото, ${day}`}
          icon={<Camera aria-hidden />}
          onClick={() => pick()}
          {...drop}
        />
      ) : (
        <button
          type="button"
          className={cx(
            styles.slot,
            size === 'fill' && styles.fill,
            // Маленький квадрат скруглён так же, как кнопка 32px, на месте которой стоит.
            size !== 'fill' && size <= 32 && styles.small,
            today && styles.today,
            !photo && !preview && styles.empty,
            over && styles.over,
            className,
          )}
          style={style}
          aria-label={photo ? `Фото дня, ${day}` : `Добавить фото дня, ${day}`}
          // В календаре года дату показывает его собственная подсказка.
          title={size === 'fill' ? undefined : photo ? `Фото дня, ${day}` : `Добавить фото, ${day}`}
          aria-busy={preview ? true : undefined}
          onClick={() => {
            if (preview) return
            if (photo) setViewing(date)
            else pick()
          }}
          {...drop}
        >
          {shown ? (
            <img className={styles.image} src={shown} alt="" draggable={false} />
          ) : photo ? (
            // Ссылка на миниатюру ещё в пути: серый квадрат на её месте.
            <span className={styles.loading} />
          ) : null}
          {preview && (
            <span className={styles.progress} aria-hidden>
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" />
              </svg>
            </span>
          )}
        </button>
      )}

      <input
        ref={gallery}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          take(event.target.files?.[0])
          event.target.value = ''
        }}
      />
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => {
          take(event.target.files?.[0])
          event.target.value = ''
        }}
      />

      {sourceOpen && (
        <Modal open size="sm" title="Фото дня" onClose={() => setSourceOpen(false)}>
          <div className={styles.sources}>
            {(
              [
                ['Камера', Camera, camera],
                ['Галерея', ImageSquare, gallery],
              ] as const
            ).map(([name, Icon, input]) => (
              <button
                key={name}
                type="button"
                className={`t-button ${styles.source}`}
                onClick={() => {
                  setSourceOpen(false)
                  input.current?.click()
                }}
              >
                <Icon size={28} aria-hidden />
                {name}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {viewing && photos[viewing] && (
        <PhotoViewer
          photo={photos[viewing]}
          onMove={setViewing}
          onReplace={() => {
            setViewing(null)
            pick(viewing)
          }}
          onClose={() => setViewing(null)}
        />
      )}
    </>
  )
}
